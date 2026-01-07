import { Socket } from "socket.io-client";
import {
	eventPublishedIndSchema,
	eventUnpublishedIndSchema,
	pollAddedIndSchema,
	pollUpdatedIndSchema,
	pollDeletedIndSchema,
} from "@schemas/poll";
import { store } from ".";
import {
	setEvent,
	setPolls,
	setPoll,
	addPoll,
	removePoll,
} from "./pollingUser";

function pollingUserEventPublished(params: unknown) {
	const { dispatch } = store;
	try {
		const { event, polls } = eventPublishedIndSchema.parse(params);
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
		const { eventId } = eventUnpublishedIndSchema.parse(params);
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
		const poll = pollAddedIndSchema.parse(params);
		dispatch(addPoll(poll));
	} catch (error) {
		console.log("poll added", error);
	}
}

function pollingUserPollUpdated(params: unknown) {
	const { dispatch } = store;
	try {
		const poll = pollUpdatedIndSchema.parse(params);
		dispatch(setPoll(poll));
	} catch (error) {
		console.log("poll updated", error);
	}
}

function pollingUserPollRemoved(params: unknown) {
	const { dispatch } = store;
	try {
		const id = pollDeletedIndSchema.parse(params);
		dispatch(removePoll(id));
	} catch (error) {
		console.log("poll removed", error);
	}
}

export function pollingUserSocketRegister(socket: Socket) {
	socket
		.on("event:published", pollingUserEventPublished)
		.on("event:unpublished", pollingUserEventUnpublished)
		.on("poll:added", pollingUserPollAdded)
		.on("poll:updated", pollingUserPollUpdated)
		.on("poll:removed", pollingUserPollRemoved);
}
