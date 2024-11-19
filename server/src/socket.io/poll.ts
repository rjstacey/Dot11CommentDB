import { Socket } from "socket.io";
import { User } from "../services/users";
import {
	PollingOK,
	PollingError,
	EventCreateResponse,
	EventUpdateResponse,
	EventAdd,
	EventOpened,
	PollShown,
	PollOpened,
	PollUpdated,
	PollDeleted,
	PollCreateResponse,
	groupJoinSchema,
	eventCreateSchema,
	eventUpdateSchema,
	eventDeleteSchema,
	eventOpenSchema,
	eventsQuerySchema,
	pollCreateSchema,
	pollUpdateSchema,
	pollIdSchema,
	pollOpenSchema,
	pollShowSchema,
	pollsQuerySchema,
	PollAdded,
	PollUpdateResponse,
	PollsGetResponse,
} from "../schemas/poll";
import {
	addPollEvent,
	getPollEvents,
	deletePollEvent,
	updatePollEvent,
	getPolls,
	addPoll,
	updatePoll,
	deletePoll,
} from "../services/poll";

export class NoGroupError extends Error {
	name = "NoGroupError";
}

function validCallback(callback: unknown): callback is Function {
	if (typeof callback === "function") return true;
	console.warn("Bad callback");
	return false;
}

function okCallback<T extends {}>(callback: Function, data?: T) {
	callback({ status: "OK", ...data } satisfies PollingOK);
}

function errorCallback(callback: Function, error: any) {
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
		okCallback(callback, { events });
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** Open event => distribute polls to the group */
async function onEventOpen(this: Socket, payload: unknown, callback: unknown) {
	if (!validCallback(callback)) return;
	try {
		const groupId = getSocketGroupId(this);
		const { eventId } = eventOpenSchema.parse(payload);
		const polls = await getPolls({ eventId });
		okCallback(callback);
		const params: EventOpened = { eventId, polls };
		this.nsp.to(groupId).emit("event:opened", params);
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
		const groupId = getSocketGroupId(this);
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
		const poll = await addPoll(add);
		okCallback(callback, { poll } satisfies PollCreateResponse);
		this.nsp.to(groupId).emit("poll:added", poll satisfies PollAdded);
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
		this.nsp.to(groupId).emit("poll:updated", poll satisfies PollUpdated);
	} catch (error) {
		errorCallback(callback, error);
	}
}

async function onPollDelete(this: Socket, payload: unknown, callback: unknown) {
	if (!validCallback(callback)) return;
	try {
		const groupId = getSocketGroupId(this);
		const id = pollIdSchema.parse(payload);
		await deletePoll(id);
		okCallback(callback);
		this.nsp.to(groupId).emit("poll:deleted", id satisfies PollDeleted);
	} catch (error) {
		errorCallback(callback, error);
	}
}

async function onPollShow(this: Socket, payload: unknown, callback: unknown) {
	if (!validCallback(callback)) return;
	try {
		const groupId = getSocketGroupId(this);
		const id = pollShowSchema.parse(payload);
		const poll = (await getPolls({ id }))[0];
		if (!poll) throw new TypeError("Poll not found");
		okCallback(callback);
		this.nsp.to(groupId).emit("poll:shown", id satisfies PollShown);
	} catch (error) {
		errorCallback(callback, error);
	}
}

async function onPollOpen(this: Socket, payload: unknown, callback: unknown) {
	if (!validCallback(callback)) return;
	try {
		const groupId = getSocketGroupId(this);
		const id = pollOpenSchema.parse(payload);
		const poll = (await getPolls({ id }))[0];
		if (!poll) throw new TypeError("Poll not found");
		okCallback(callback);
		this.nsp.to(groupId).emit("poll:opened", id satisfies PollOpened);
	} catch (error) {
		errorCallback(callback, error);
	}
}

async function onGroupJoin(this: Socket, payload: unknown, callback: unknown) {
	if (!validCallback(callback)) return;
	try {
		const { groupId } = groupJoinSchema.parse(payload);
		leaveRooms(this);
		this.join(groupId);
		setSocketGroupId(this, groupId);
		okCallback(callback);
	} catch (error) {
		errorCallback(callback, error);
	}
}

async function onGroupLeave(this: Socket, payload: unknown, callback: unknown) {
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
	socket
		.on("group:join", onGroupJoin.bind(socket))
		.on("group:leave", onGroupLeave.bind(socket))
		.on("events:get", onEventsGet.bind(socket))
		.on("event:create", onEventCreate.bind(socket))
		.on("event:delete", onEventDelete.bind(socket))
		.on("event:update", onEventUpdate.bind(socket))
		.on("event:open", onEventOpen.bind(socket))
		.on("polls:get", onPollsGet.bind(socket))
		.on("poll:create", onPollCreate.bind(socket))
		.on("poll:update", onPollUpdate.bind(socket))
		.on("poll:delete", onPollDelete.bind(socket))
		.on("poll:show", onPollShow.bind(socket))
		.on("poll:open", onPollOpen.bind(socket));
}

export default onConnect;
