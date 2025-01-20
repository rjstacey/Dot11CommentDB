import { Socket } from "socket.io-client";
import {
	eventOpenedSchema,
	pollAddedSchema,
	pollUpdatedSchema,
	pollDeletedSchema,
	pollIdSchema,
	PollAction,
	PollState,
} from "@schemas/poll";
import { store } from ".";
import {
	setEvent,
	setPolls,
	setPoll,
	addPoll,
	updatePoll,
	removePoll,
	setActivePollId,
} from "./pollingUser";

function pollingUserEventOpened(params: unknown) {
	const { dispatch } = store;
	try {
		const p = eventOpenedSchema.parse(params);
		console.log("event opened", p.event);
		dispatch(setEvent(p.event));
		dispatch(setPolls(p.polls));
	} catch (error) {
		console.log("event opened", error);
	}
}

function pollingUserPollAdded(params: unknown) {
	const { dispatch } = store;
	try {
		const poll = pollAddedSchema.parse(params);
		dispatch(addPoll(poll));
	} catch (error) {
		console.log("poll added", error);
	}
}

function pollingUserPollUpdated(params: unknown) {
	const { dispatch } = store;
	try {
		const poll = pollUpdatedSchema.parse(params);
		dispatch(setPoll(poll));
	} catch (error) {
		console.log("poll updated", error);
	}
}

function pollingUserPollRemoved(params: unknown) {
	const { dispatch } = store;
	try {
		const id = pollDeletedSchema.parse(params);
		dispatch(removePoll(id));
	} catch (error) {
		console.log("poll removed", error);
	}
}

function pollingUserPollAction(pollAction: PollAction, params: unknown) {
	const { dispatch } = store;
	try {
		const pollId = pollIdSchema.parse(params);
		dispatch(setActivePollId(pollId));
		let state: PollState = null;
		if (pollAction === "show") state = "shown";
		else if (pollAction === "open") state = "opened";
		else if (pollAction === "close") state = "closed";
		console.log(`pollId=${pollId} ${state}`);
		dispatch(updatePoll({ id: pollId, changes: { state } }));
	} catch (error) {
		console.log("poll " + pollAction, error);
	}
}

export function pollingUserSocketRegister(socket: Socket) {
	socket
		.on("event:opened", pollingUserEventOpened)
		.on("poll:added", pollingUserPollAdded)
		.on("poll:updated", pollingUserPollUpdated)
		.on("poll:removed", pollingUserPollRemoved)
		.on("poll:unshown", (params: unknown) =>
			pollingUserPollAction("unshow", params)
		)
		.on("poll:shown", (params: unknown) =>
			pollingUserPollAction("show", params)
		)
		.on("poll:opened", (params: unknown) =>
			pollingUserPollAction("open", params)
		)
		.on("poll:closed", (params: unknown) =>
			pollingUserPollAction("close", params)
		);
}
