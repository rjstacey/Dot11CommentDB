import { Socket } from "socket.io";
import { AccessLevel } from "@schemas/access.js";
import { NotFoundError } from "../../utils/index.js";
import {
	getPollEvents,
	getPolls,
	addPoll,
	updatePoll,
	deletePoll,
	pollVote,
	pollResults,
	pollVoteCount,
	pollClearVotes,
} from "../../services/poll.js";
import {
	Poll,
	PollAddedInd,
	PollUpdatedInd,
	PollDeletedInd,
	PollGetRes,
	PollCreateRes,
	PollUpdateRes,
	PollAction,
	PollActionRes,
	PollChange,
	PollResultRes,
	PollVotedInd,
	pollCreateSchema,
	pollUpdateSchema,
	pollIdSchema,
	pollVoteSchema,
	pollsQuerySchema,
	pollResultReqSchema,
	PollVotersType,
} from "@schemas/poll.js";

import {
	validCallback,
	okCallback,
	errorCallback,
	forbiddenEvent,
} from "./pollingBasic.js";
import { GroupContext } from "./pollingGroup.js";
import { Member, MemberStatus } from "@schemas/members.js";

function maybeSetActivePoll(gc: GroupContext, poll: Poll) {
	const activePoll = gc.activePoll;
	if (activePoll) {
		if (activePoll.id === poll.id) {
			if (poll.state === null) {
				gc.setActivePoll(null);
			} else {
				gc.setActivePoll(poll);
			}
		} else if (poll.state !== null) {
			gc.setActivePoll(poll);
		}
	} else if (poll.state !== null) {
		gc.setActivePoll(poll);
	}
}

async function pollWasUpdated(gc: GroupContext, poll: Poll) {
	const eventId = gc.publishedEventId;
	if (poll.eventId === eventId || poll.state !== null) {
		// Send updates to everyone
		gc.userEmit("poll:updated", poll satisfies PollUpdatedInd);
	} else {
		// Send updates to admins only
		gc.adminEmit("poll:updated", poll satisfies PollUpdatedInd);
	}
	maybeSetActivePoll(gc, poll);
}

/** poll:get(query) - Get a list of polls for the subscribed group that satisfies the query criteria */
async function onPollGet(
	gc: GroupContext,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const query = pollsQuerySchema.parse(payload);
		const polls = await getPolls(query);
		okCallback(callback, polls satisfies PollGetRes);
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** poll:create(poll) - add poll */
async function onPollCreate(
	gc: GroupContext,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const add = pollCreateSchema.parse(payload);
		const [event] = await getPollEvents({ id: add.eventId });
		if (!event)
			throw new NotFoundError(`Event id=${add.eventId} not found`);
		const poll = await addPoll(add);
		if (event.isPublished || poll.state !== null) {
			gc.userEmit("poll:added", poll satisfies PollAddedInd);
		} else {
			gc.adminEmit("poll:added", poll satisfies PollAddedInd);
		}
		okCallback(callback, poll satisfies PollCreateRes);
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** poll:update({id, changes}) - update poll */
async function onPollUpdate(
	gc: GroupContext,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const update = pollUpdateSchema.parse(payload);
		const poll = await updatePoll(update);
		await pollWasUpdated(gc, poll);
		okCallback(callback, poll satisfies PollUpdateRes);
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** poll:delete(pollId) - delete poll */
async function onPollDelete(
	gc: GroupContext,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const id = pollIdSchema.parse(payload);
		const [poll] = await getPolls({ id });
		await deletePoll(id);
		okCallback(callback);
		if (poll) {
			const [event] = await getPollEvents({
				id: poll.eventId,
				isPublished: true,
			});
			if (event || poll.state !== null) {
				gc.userEmit("poll:deleted", id satisfies PollDeletedInd);
			}
			maybeSetActivePoll(gc, { ...poll, state: null });
		}
	} catch (error) {
		errorCallback(callback, error);
	}
}

/**
 * poll:show(pollId)
 *
 * poll:open(pollId)
 *
 * poll:close(pollId)
 *
 * poll:unshow(pollId)
 *
 * poll:reset(pollId)
 *
 * Show, unshow, open, or close a poll
 * */
async function onPollAction(
	gc: GroupContext,
	action: PollAction,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const groupId = gc.id;
		const id = pollIdSchema.parse(payload);
		const [poll] = await getPolls({ id, groupId });
		if (!poll) throw new NotFoundError("Poll not found");
		const [activePoll] = await getPolls({
			groupId,
			state: ["shown", "opened", "closed"],
		});
		if (
			(action === "show" || action === "open" || action === "close") &&
			activePoll &&
			activePoll.id !== poll.id
		) {
			if (activePoll.state === "opened") {
				gc.setActivePoll(activePoll);
				throw new TypeError("Another poll is currently open");
			}
			const updatedPoll = await updatePoll({
				id: activePoll.id,
				changes: { state: null },
			});
			gc.setActivePoll(updatedPoll);
		}
		const changes: PollChange = {
			state: null,
			resultsSummary: null,
		};
		if (action === "reset") {
			await pollClearVotes(poll);
			if (poll.state) changes.state = "shown";
		} else if (action === "show") {
			changes.state = "shown";
		} else if (action === "open") {
			changes.state = "opened";
		} else if (action === "close") {
			changes.state = "closed";
			changes.resultsSummary = (await pollResults(poll)).resultsSummary;
		}
		const updatedPoll = await updatePoll({ id, changes });
		await pollWasUpdated(gc, updatedPoll);
		okCallback(callback, updatedPoll satisfies PollActionRes);
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** poll:vote({id, votes}) - Submit vote for a poll */
async function onPollVote(
	gc: GroupContext,
	member: Member,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const groupId = gc.id;
		const { id, votes } = pollVoteSchema.parse(payload);
		const [poll] = await getPolls({ id, groupId });
		if (!poll) throw new TypeError("Poll not found");
		if (poll.state !== "opened") throw new TypeError("Poll not open");

		await pollVote(member, poll, votes);

		gc.sendVotedInd();
		okCallback(callback);
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** poll:result({pollId}) - Request results for a poll */
async function onPollResult(
	gc: GroupContext,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const groupId = gc.id;
		const { id } = pollResultReqSchema.parse(payload);
		const [poll] = await getPolls({ id, groupId });
		if (!poll) throw new TypeError("Poll not found");
		const response = await pollResults(poll);
		okCallback(callback, response satisfies PollResultRes);
	} catch (error) {
		errorCallback(callback, error);
	}
}

export async function pollingPollVotedInd(
	activePoll: Poll | null,
	members: Member[]
): Promise<PollVotedInd> {
	const numMembers = members.length;

	let numVoters = 0;
	let numVotes = 0;
	let pollId: number | null = null;
	if (activePoll) {
		pollId = activePoll.id;
		if (activePoll.votersType == PollVotersType.ANYONE) {
			numVoters = members.length;
		} else {
			let statuses: MemberStatus[];
			if (activePoll.votersType == PollVotersType.VOTER)
				statuses = ["Voter", "ExOfficio"];
			else statuses = ["Voter", "Potential Voter", "ExOfficio"];
			numVoters = members.filter((m) =>
				statuses.includes(m.Status)
			).length;
		}

		numVotes = await pollVoteCount(activePoll);
	}

	const voted: PollVotedInd = {
		pollId,
		numMembers,
		numVoters,
		numVotes,
	};
	return voted;
}

export function pollingPollRegister(
	socket: Socket,
	gc: GroupContext,
	member: Member
) {
	socket
		.on("poll:get", (params, cb) => onPollGet(gc, params, cb))
		.on("poll:vote", (params, cb) => onPollVote(gc, member, params, cb));

	const access = gc.getMemberAccess(member.SAPIN);
	if (access < AccessLevel.rw) {
		socket
			.on("poll:create", forbiddenEvent)
			.on("poll:update", forbiddenEvent)
			.on("poll:delete", forbiddenEvent)
			.on("poll:show", forbiddenEvent)
			.on("poll:open", forbiddenEvent)
			.on("poll:close", forbiddenEvent)
			.on("poll:unshow", forbiddenEvent)
			.on("poll:reset", forbiddenEvent)
			.on("poll:result", forbiddenEvent);
		return;
	}

	socket
		.on("poll:create", (params, cb) => onPollCreate(gc, params, cb))
		.on("poll:update", (params, cb) => onPollUpdate(gc, params, cb))
		.on("poll:delete", (params, cb) => onPollDelete(gc, params, cb))
		.on("poll:show", (params, cb) => onPollAction(gc, "show", params, cb))
		.on("poll:open", (params, cb) => onPollAction(gc, "open", params, cb))
		.on("poll:close", (params, cb) => onPollAction(gc, "close", params, cb))
		.on("poll:unshow", (params, cb) =>
			onPollAction(gc, "unshow", params, cb)
		)
		.on("poll:reset", (params, cb) => onPollAction(gc, "reset", params, cb))
		.on("poll:result", (params, cb) => onPollResult(gc, params, cb));
}

export function pollingPollUnregister(socket: Socket) {
	socket.removeAllListeners("poll:get");
	socket.removeAllListeners("poll:vote");
	socket.removeAllListeners("poll:create");
	socket.removeAllListeners("poll:update");
	socket.removeAllListeners("poll:delete");
	socket.removeAllListeners("poll:show");
	socket.removeAllListeners("poll:open");
	socket.removeAllListeners("poll:close");
	socket.removeAllListeners("poll:unshow");
	socket.removeAllListeners("poll:reset");
	socket.removeAllListeners("poll:result");
}
