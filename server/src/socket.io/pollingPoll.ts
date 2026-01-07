import { Socket } from "socket.io";
import { NotFoundError } from "../utils/index.js";
import type { UserContext } from "../services/users.js";
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
} from "../services/poll.js";
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

import { validCallback, okCallback, errorCallback } from "./pollingBasic.js";
import {
	socketGetGroupMembersPresent,
	socketGetGroupInfo,
} from "./pollingGroup.js";
import { MemberStatus } from "@schemas/members.js";
import { AccessLevel } from "@schemas/access.js";
import { socketGetPublishedEventId } from "./pollingEvent.js";

function socketGetActivePoll(socket: Socket): Poll | null {
	return socket.data.activePoll || null;
}

export function socketMaybeSetActivePoll(socket: Socket, poll: Poll) {
	const activePoll = socketGetActivePoll(socket);
	if (activePoll) {
		if (activePoll.id === poll.id) {
			if (poll.state === null) {
				delete socket.data.activePoll;
			} else {
				socket.data.activePoll = poll;
			}
		} else if (poll.state !== null) {
			socket.data.activePoll = poll;
		}
	} else if (poll.state !== null) {
		socket.data.activePoll = poll;
	}
	socket.data.throttledSendVotedInd?.();
}

export async function sendVotedInd(this: Socket) {
	const groupId = socketGetGroupInfo(this).groupId;
	const activePoll = socketGetActivePoll(this);
	const members = await socketGetGroupMembersPresent(this);
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
	for (const s of await this.nsp.to(groupId).fetchSockets()) {
		if (s.data.access >= AccessLevel.rw) s.emit("poll:voted", voted);
	}
}

async function pollWasUpdated(socket: Socket, poll: Poll) {
	const groupId = socketGetGroupInfo(socket).groupId;
	const eventId = socketGetPublishedEventId(socket);
	if (poll.eventId === eventId || poll.state !== null) {
		// Send updates to everyone
		socket.nsp
			.to(groupId)
			.emit("poll:updated", poll satisfies PollUpdatedInd);
	} else {
		// Send updates to admins only
		const sockets = await socket.nsp.in(groupId).fetchSockets();
		for (const s of sockets) {
			if (s.data.access >= AccessLevel.rw)
				s.emit("poll:updated", poll satisfies PollUpdatedInd);
		}
	}
	socketMaybeSetActivePoll(socket, poll);
}

/** poll:get(query) - Get a list of polls for the subscribed group that satisfies the query criteria */
export async function onPollGet(
	this: Socket,
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
export async function onPollCreate(
	this: Socket,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const groupId = socketGetGroupInfo(this).groupId;
		const add = pollCreateSchema.parse(payload);
		const [event] = await getPollEvents({ id: add.eventId });
		if (!event)
			throw new NotFoundError(`Event id=${add.eventId} not found`);
		const poll = await addPoll(add);
		if (event.isPublished || poll.state !== null) {
			this.nsp
				.to(groupId)
				.emit("poll:added", poll satisfies PollAddedInd);
		}
		okCallback(callback, poll satisfies PollCreateRes);
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** poll:update({id, changes}) - update poll */
export async function onPollUpdate(
	this: Socket,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const update = pollUpdateSchema.parse(payload);
		const poll = await updatePoll(update);
		await pollWasUpdated(this, poll);
		okCallback(callback, poll satisfies PollUpdateRes);
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** poll:delete(pollId) - delete poll */
export async function onPollDelete(
	this: Socket,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const groupId = socketGetGroupInfo(this).groupId;
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
				this.nsp
					.to(groupId)
					.emit("poll:deleted", id satisfies PollDeletedInd);
			}
			socketMaybeSetActivePoll(this, { ...poll, state: null });
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
export async function onPollAction(
	this: Socket,
	action: PollAction,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const groupId = socketGetGroupInfo(this).groupId;
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
				socketMaybeSetActivePoll(this, activePoll);
				throw new TypeError("Another poll is currently open");
			}
			const updatedPoll = await updatePoll({
				id: activePoll.id,
				changes: { state: null },
			});
			socketMaybeSetActivePoll(this, updatedPoll);
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
		await pollWasUpdated(this, updatedPoll);
		okCallback(callback, updatedPoll satisfies PollActionRes);
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** poll:vote({id, votes}) - Submit vote for a poll */
export async function onPollVote(
	this: Socket,
	user: UserContext,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const groupId = socketGetGroupInfo(this).groupId;
		const { id, votes } = pollVoteSchema.parse(payload);
		const [poll] = await getPolls({ id, groupId });
		if (!poll) throw new TypeError("Poll not found");
		if (poll.state !== "opened") throw new TypeError("Poll not open");
		await pollVote(user, poll, votes);
		okCallback(callback);

		this.data.throttledSendVotedInd?.();
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** poll:result({pollId}) - Request results for a poll */
export async function onPollResult(
	this: Socket,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const groupId = socketGetGroupInfo(this).groupId;
		const { id } = pollResultReqSchema.parse(payload);
		const [poll] = await getPolls({ id, groupId });
		if (!poll) throw new TypeError("Poll not found");
		const response = await pollResults(poll);
		okCallback(callback, response satisfies PollResultRes);
	} catch (error) {
		errorCallback(callback, error);
	}
}
