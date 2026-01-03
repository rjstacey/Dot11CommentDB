import { Socket } from "socket.io-client";
import {
	eventPublishedParamSchema,
	eventUnpublishedParamSchema,
	pollAddedParamSchema,
	pollUpdatedParamSchema,
	pollDeletedParamSchema,
	pollActionedParamSchema,
	PollAction,
	PollState,
} from "@schemas/poll";
import { store } from ".";
import {
	setEvent,
	setPolls,
	setPoll,
	addPoll,
	upsertPoll,
	removePoll,
	setActivePollId,
} from "./pollingUser";

function pollingUserEventPublished(params: unknown) {
	const { dispatch } = store;
	try {
		const { event, polls } = eventPublishedParamSchema.parse(params);
		console.log("event published", event);
		dispatch(setEvent(event));
		dispatch(setPolls(polls));
	} catch (error) {
		console.log("event published", error);
	}
}

function pollingUserEventUnpublished(params: unknown) {
	const { dispatch } = store;
	try {
		const { eventId } = eventUnpublishedParamSchema.parse(params);
		console.log("event unpublished", eventId);
		dispatch(setEvent(null));
		dispatch(setPolls([]));
	} catch (error) {
		console.log("event unpublished", error);
	}
}

function pollingUserPollAdded(params: unknown) {
	const { dispatch } = store;
	try {
		const poll = pollAddedParamSchema.parse(params);
		dispatch(addPoll(poll));
	} catch (error) {
		console.log("poll added", error);
	}
}

function pollingUserPollUpdated(params: unknown) {
	const { dispatch } = store;
	try {
		const poll = pollUpdatedParamSchema.parse(params);
		dispatch(setPoll(poll));
	} catch (error) {
		console.log("poll updated", error);
	}
}

function pollingUserPollRemoved(params: unknown) {
	const { dispatch } = store;
	try {
		const id = pollDeletedParamSchema.parse(params);
		dispatch(removePoll(id));
	} catch (error) {
		console.log("poll removed", error);
	}
}

function pollingUserPollActioned(pollAction: PollAction, params: unknown) {
	const { dispatch } = store;
	try {
		const poll = pollActionedParamSchema.parse(params);
		dispatch(setActivePollId(pollAction === "unshow" ? null : poll.id));
		let state: PollState = null;
		if (pollAction === "show") state = "shown";
		else if (pollAction === "open") state = "opened";
		else if (pollAction === "close") state = "closed";
		console.log(`pollId=${poll.id} ${state}`);
		dispatch(upsertPoll(poll));
	} catch (error) {
		console.log("poll " + pollAction, error);
	}
}

export function pollingUserSocketRegister(socket: Socket) {
	socket
		.on("event:published", pollingUserEventPublished)
		.on("event:unpublished", pollingUserEventUnpublished)
		.on("poll:added", pollingUserPollAdded)
		.on("poll:updated", pollingUserPollUpdated)
		.on("poll:removed", pollingUserPollRemoved)
		.on("poll:unshown", (params: unknown) =>
			pollingUserPollActioned("unshow", params)
		)
		.on("poll:shown", (params: unknown) =>
			pollingUserPollActioned("show", params)
		)
		.on("poll:opened", (params: unknown) =>
			pollingUserPollActioned("open", params)
		)
		.on("poll:closed", (params: unknown) =>
			pollingUserPollActioned("close", params)
		);
}
