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
} from "../services/poll.js";
import {
	Poll,
	PollAddedInd,
	PollUpdatedInd,
	PollDeletedInd,
	PollActionedInd,
	PollGetRes,
	PollCreateRes,
	PollUpdateRes,
	PollAction,
	PollState,
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

function socketGetActivePoll(socket: Socket): Poll | null {
	return socket.data.activePoll || null;
}

function socketClearActivePoll(socket: Socket) {
	const activePoll = socketGetActivePoll(socket);
	if (activePoll) {
		delete socket.data.activePoll;
	}
}

export function socketMaybeSetActivePoll(socket: Socket, poll: Poll) {
	const groupId = socketGetGroupInfo(socket).groupId;

	function emitAction(
		state: "shown" | "opened" | "closed" | "unshown",
		poll: Poll
	) {
		socket.nsp.to(groupId).emit("poll:" + state, poll as PollActionedInd);
	}

	const activePoll = socketGetActivePoll(socket);
	if (activePoll) {
		if (activePoll.id === poll.id) {
			if (activePoll.state !== poll.state) {
				emitAction(poll.state || "unshown", poll);
			}
			if (poll.state === null) {
				socketClearActivePoll(socket);
			} else {
				socket.data.activePoll = poll;
			}
		} else if (poll.state !== null) {
			emitAction("unshown", activePoll);
			emitAction(poll.state, poll);
			socket.data.activePoll = poll;
		}
	} else {
		if (poll.state !== null) {
			emitAction(poll.state, poll);
			socket.data.activePoll = poll;
		}
	}
}

export async function sendVotedInd(this: Socket) {
	const groupId = socketGetGroupInfo(this).groupId;
	const activePoll = socketGetActivePoll(this);
	const members = await socketGetGroupMembersPresent(this);
	const numMembers = members.length;

	let numVoters = 0;
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
	}

	const voted: PollVotedInd = {
		pollId,
		numMembers,
		numVoters,
		numVoted: 0,
	};
	for (const s of await this.nsp.to(groupId).fetchSockets()) {
		if (s.data.access >= AccessLevel.rw) s.emit("poll:voted", voted);
	}
}

/** poll:get(query) - Get a list of polls for the subscribed group that satisfies the query criteria */
export async function onPollGet(
	this: Socket,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		//const groupId = socketGetGroupInfo(this).groupId;
		const query = pollsQuerySchema.parse(payload);
		const polls = await getPolls(query);
		okCallback(callback, { polls } satisfies PollGetRes);
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
		okCallback(callback, { poll } satisfies PollCreateRes);
		if (event.isPublished || poll.state !== null) {
			this.nsp
				.to(groupId)
				.emit("poll:added", poll satisfies PollAddedInd);
		}
		socketMaybeSetActivePoll(this, poll);
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
		const groupId = socketGetGroupInfo(this).groupId;
		const update = pollUpdateSchema.parse(payload);
		const poll = await updatePoll(update);
		okCallback(callback, { poll } satisfies PollUpdateRes);
		const [event] = await getPollEvents({
			id: poll.eventId,
			isPublished: true,
		});
		if (event || poll.state !== null) {
			this.nsp
				.to(groupId)
				.emit("poll:updated", poll satisfies PollUpdatedInd);
		}
		socketMaybeSetActivePoll(this, poll);
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
 * poll:unshow(pollId)
 *
 * poll:open(pollId)
 *
 * poll:close(pollId)
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
			if (activePoll.state === "shown") {
				const updatedPoll = await updatePoll({
					id: activePoll.id,
					changes: { state: null },
				});
				socketMaybeSetActivePoll(this, updatedPoll);
			} else {
				socketMaybeSetActivePoll(this, activePoll);
				throw new TypeError("Another poll is currently open");
			}
		}
		let state: PollState = null;
		if (action === "show") state = "shown";
		else if (action === "open") state = "opened";
		else if (action === "close") state = "closed";
		const updatedPoll = await updatePoll({ id, changes: { state } });
		okCallback(callback);
		socketMaybeSetActivePoll(this, updatedPoll);
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
		pollVote(user, poll, votes);
		okCallback(callback);

		if (this.data.throttledSendVotedInd) this.data.throttledSendVotedInd();
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
