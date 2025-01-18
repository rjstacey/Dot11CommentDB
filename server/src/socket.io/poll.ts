import { Socket } from "socket.io";
import type { User } from "../services/users.js";
import {
	PollingOK,
	PollingError,
	EventCreateResponse,
	EventUpdateResponse,
	EventAdd,
	EventOpened,
	EventClosed,
	PollUpdated,
	PollDeleted,
	PollCreateResponse,
	PollAction,
	groupJoinSchema,
	eventCreateSchema,
	eventUpdateSchema,
	eventDeleteSchema,
	eventPublishSchema,
	eventsQuerySchema,
	pollCreateSchema,
	pollUpdateSchema,
	pollIdSchema,
	pollVoteSchema,
	pollsQuerySchema,
	PollAdded,
	PollUpdateResponse,
	PollsGetResponse,
	EventsGetResponse,
	PollState,
	GroupJoinResponse,
	pollResultsGetSchema,
} from "@schemas/poll.js";
import {
	addPollEvent,
	getPollEvents,
	deletePollEvent,
	updatePollEvent,
	getPolls,
	addPoll,
	updatePoll,
	deletePoll,
	pollVote,
	pollResults,
} from "../services/poll.js";
import { ForbiddenError, NotFoundError } from "../utils/index.js";
import { getGroups } from "../services/groups.js";
import { AccessLevel } from "../auth/access.js";

export class NoGroupError extends Error {
	name = "NoGroupError";
}

type CallbackFunction = (response: unknown) => void;

function validCallback(callback: unknown): callback is CallbackFunction {
	if (typeof callback === "function") return true;
	console.warn("Bad callback");
	return false;
}

function okCallback<T extends object>(callback: CallbackFunction, data?: T) {
	callback({ status: "OK", ...data } satisfies PollingOK);
}

function errorCallback(callback: CallbackFunction, error: unknown) {
	console.log(error);
	let errorObj: { name: string; message: string };
	if (error instanceof Error) {
		errorObj = {
			name: error.name,
			message: error.message,
		};
	} else {
		errorObj = {
			name: "ServerError",
			message: "Unknown",
		};
	}
	callback({ status: "Error", error: errorObj } satisfies PollingError);
}

function setSocketGroupId(socket: Socket, groupId: string) {
	socket.data.groupId = groupId;
}

function clearSocketGroupId(socket: Socket) {
	delete socket.data.groupId;
}

function getSocketGroupId(socket: Socket) {
	const groupId = socket.data.groupId;
	if (typeof groupId !== "string")
		throw new NoGroupError("You must join a group first");
	return groupId;
}

function leaveRooms(socket: Socket) {
	const rooms = [...socket.rooms];
	rooms.forEach((room) => {
		if (room !== socket.id) {
			console.log("leave -", room);
			socket.leave(room);
		}
	});
}

/** Get events => return a list of events for this group with the query constraints provided */
async function onEventsGet(this: Socket, payload: unknown, callback: unknown) {
	if (!validCallback(callback)) return;
	try {
		const groupId = getSocketGroupId(this);
		const query = eventsQuerySchema.parse(payload);
		const events = await getPollEvents({ ...query, groupId });
		okCallback(callback, { events } satisfies EventsGetResponse);
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** Publish event => distribute polls to the group and provide updates */
async function onEventPublish(
	this: Socket,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const groupId = getSocketGroupId(this);
		const { eventId } = eventPublishSchema.parse(payload);
		const [event] = await getPollEvents({ id: eventId });
		if (!event) throw new NotFoundError("No such event id=" + eventId);
		updatePollEvent({ id: eventId, changes: { isPublished: true } });
		const polls = await getPolls({ eventId });
		okCallback(callback);
		const params: EventOpened = { event, polls };
		this.nsp.to(groupId).emit("event:opened", params);
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** Unpublish event => stop distributing poll updates to the group */
async function onEventUnpublish(
	this: Socket,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const groupId = getSocketGroupId(this);
		const { eventId } = eventPublishSchema.parse(payload);
		updatePollEvent({ id: eventId, changes: { isPublished: false } });
		okCallback(callback);
		const params: EventClosed = { eventId };
		this.nsp.to(groupId).emit("event:closed", params);
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** Create event */
async function onEventCreate(
	this: Socket,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const groupId = getSocketGroupId(this);
		const addIn = eventCreateSchema.parse(payload);
		const add: EventAdd = {
			groupId,
			name: addIn.name,
			timeZone: addIn.timeZone || "America/New_York",
			datetime: addIn.datetime || new Date().toISOString(),
		};
		const event = await addPollEvent(add);
		okCallback(callback, { event } satisfies EventCreateResponse);
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** Update event */
async function onEventUpdate(
	this: Socket,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const update = eventUpdateSchema.parse(payload);
		const event = await updatePollEvent(update);
		okCallback(callback, { event } satisfies EventUpdateResponse);
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** Delete event */
async function onEventDelete(
	this: Socket,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const id = eventDeleteSchema.parse(payload);
		await deletePollEvent(id);
		okCallback(callback);
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** Get a list of polls for the subscribed group that satisfies the query criteria */
async function onPollsGet(this: Socket, payload: unknown, callback: unknown) {
	if (!validCallback(callback)) return;
	try {
		//const groupId = getSocketGroupId(this);
		const query = pollsQuerySchema.parse(payload);
		const polls = await getPolls(query);
		okCallback(callback, { polls } satisfies PollsGetResponse);
	} catch (error) {
		errorCallback(callback, error);
	}
}

async function onPollCreate(this: Socket, payload: unknown, callback: unknown) {
	if (!validCallback(callback)) return;
	try {
		const groupId = getSocketGroupId(this);
		const add = pollCreateSchema.parse(payload);
		const [event] = await getPollEvents({ id: add.eventId });
		if (!event)
			throw new NotFoundError(`Event id=${add.eventId} not found`);
		const poll = await addPoll(add);
		okCallback(callback, { poll } satisfies PollCreateResponse);
		if (event.isPublished) {
			this.nsp.to(groupId).emit("poll:added", poll satisfies PollAdded);
		}
	} catch (error) {
		errorCallback(callback, error);
	}
}

async function onPollUpdate(this: Socket, payload: unknown, callback: unknown) {
	if (!validCallback(callback)) return;
	try {
		const groupId = getSocketGroupId(this);
		const update = pollUpdateSchema.parse(payload);
		const poll = await updatePoll(update);
		okCallback(callback, { poll } satisfies PollUpdateResponse);
		const [event] = await getPollEvents({ id: poll.eventId });
		if (event && event.isPublished) {
			this.nsp
				.to(groupId)
				.emit("poll:updated", poll satisfies PollUpdated);
		}
	} catch (error) {
		errorCallback(callback, error);
	}
}

async function onPollDelete(this: Socket, payload: unknown, callback: unknown) {
	if (!validCallback(callback)) return;
	try {
		const groupId = getSocketGroupId(this);
		const id = pollIdSchema.parse(payload);
		const [poll] = await getPolls({ id });
		await deletePoll(id);
		okCallback(callback);
		if (poll) {
			const [event] = await getPollEvents({ id: poll.eventId });
			if (event && event.isPublished) {
				this.nsp
					.to(groupId)
					.emit("poll:deleted", id satisfies PollDeleted);
			}
		}
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** Show, unshow, open, or close a poll */
async function onPollAction(
	this: Socket,
	action: PollAction,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const groupId = getSocketGroupId(this);
		const id = pollIdSchema.parse(payload);
		const [poll] = await getPolls({ id, groupId });
		if (!poll) throw new TypeError("Poll not found");
		let state: PollState = null;
		if (action === "show") state = "shown";
		else if (action === "open") state = "opened";
		else if (action === "close") state = "closed";
		await updatePoll({ id, changes: { state } });
		okCallback(callback);
		this.nsp.to(groupId).emit("poll:" + (state ? state : "unshown"), id);
	} catch (error) {
		errorCallback(callback, error);
	}
}

async function onPollVote(
	this: Socket,
	user: User,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const groupId = getSocketGroupId(this);
		const { id, votes } = pollVoteSchema.parse(payload);
		const [poll] = await getPolls({ id, groupId });
		if (!poll) throw new TypeError("Poll not found");
		if (poll.state !== "opened") throw new TypeError("Poll not open");
		pollVote(user, poll, votes);
		okCallback(callback);
	} catch (error) {
		errorCallback(callback, error);
	}
}

async function onResultsGet(this: Socket, payload: unknown, callback: unknown) {
	if (!validCallback(callback)) return;
	try {
		const groupId = getSocketGroupId(this);
		const { id } = pollResultsGetSchema.parse(payload);
		const [poll] = await getPolls({ id, groupId });
		if (!poll) throw new TypeError("Poll not found");
		const results = pollResults(poll);
		okCallback(callback, results);
	} catch (error) {
		errorCallback(callback, error);
	}
}

async function onGroupJoin(this: Socket, payload: unknown, callback: unknown) {
	if (!validCallback(callback)) return;
	try {
		const { groupId } = groupJoinSchema.parse(payload);
		const [group] = await getGroups(this.data.user, { id: groupId });
		if (!group) throw new NotFoundError("No such group: id=" + groupId);
		if (group.permissions.polling < AccessLevel.ro)
			throw new ForbiddenError();
		leaveRooms(this);
		this.join(groupId);
		setSocketGroupId(this, groupId);
		const events = await getPollEvents({ groupId });
		const activeEvent = events.find((e) => e.isPublished);
		const eventId = activeEvent?.id;
		const polls = eventId ? await getPolls({ eventId }) : [];
		const activePoll = polls.find(
			(p) => p.state === "opened" || p.state === "shown"
		);
		const pollId = activePoll?.id;
		okCallback(callback, {
			groupId,
			events,
			eventId,
			polls,
			pollId,
		} satisfies GroupJoinResponse);
	} catch (error) {
		errorCallback(callback, error);
	}
}

async function onGroupLeave(this: Socket) {
	leaveRooms(this);
	clearSocketGroupId(this);
}

function onConnect(socket: Socket, user: User) {
	console.log("register " + user.Name + " for polling");
	socket.onAny((event, ...args) => {
		console.log(event, args);
	});
	socket.on("disconnect", () => {
		console.log("disconnect ", socket.data.user);
	});
	socket.on("group:admin", (data, callback) => {
		console.log("User " + user.Name + " wants to become an admin");
		callback(0);
	});
	const onPollActionBd = onPollAction.bind(socket);
	const onPollVoteBd = onPollVote.bind(socket);
	socket
		.on("group:join", onGroupJoin.bind(socket))
		.on("group:leave", onGroupLeave.bind(socket))
		.on("events:get", onEventsGet.bind(socket))
		.on("event:create", onEventCreate.bind(socket))
		.on("event:delete", onEventDelete.bind(socket))
		.on("event:update", onEventUpdate.bind(socket))
		.on("event:publish", onEventPublish.bind(socket))
		.on("event:unpublish", onEventUnpublish.bind(socket))
		.on("polls:get", onPollsGet.bind(socket))
		.on("poll:create", onPollCreate.bind(socket))
		.on("poll:update", onPollUpdate.bind(socket))
		.on("poll:delete", onPollDelete.bind(socket))
		.on("poll:show", (params, cb) => onPollActionBd("show", params, cb))
		.on("poll:unshow", (params, cb) => onPollActionBd("unshow", params, cb))
		.on("poll:open", (params, cb) => onPollActionBd("open", params, cb))
		.on("poll:close", (params, cb) => onPollActionBd("close", params, cb))
		.on("poll:vote", (params, cb) => onPollVoteBd(user, params, cb))
		.on("results:get", onResultsGet.bind(socket));
}

export default onConnect;
