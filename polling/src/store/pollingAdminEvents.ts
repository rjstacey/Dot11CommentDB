import { Socket } from "socket.io-client";
import {
	eventPublishedIndSchema,
	eventUnpublishedIndSchema,
	pollAddedIndSchema,
	pollUpdatedIndSchema,
	pollDeletedIndSchema,
	pollVotedIndSchema,
} from "@schemas/poll";
import { store } from ".";
import {
	setEvent,
	setPolls,
	setPoll,
	updateEvent,
	addPoll,
	removePoll,
	setVoted,
} from "./pollingAdmin";

function pollingAdminEventPublished(params: unknown) {
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

function pollingAdminEventUnpublished(params: unknown) {
	const { dispatch } = store;
	try {
		const { eventId } = eventUnpublishedIndSchema.parse(params);
		console.log("event unpublished", eventId);
		dispatch(updateEvent({ id: eventId, changes: { isPublished: false } }));
	} catch (error) {
		console.log("event unpublished", error);
	}
}

function pollingAdminPollAdded(params: unknown) {
	const { dispatch } = store;
	try {
		const poll = pollAddedIndSchema.parse(params);
		dispatch(addPoll(poll));
	} catch (error) {
		console.log("poll added", error);
	}
}

function pollingAdminPollUpdated(params: unknown) {
	const { dispatch } = store;
	try {
		const poll = pollUpdatedIndSchema.parse(params);
		dispatch(setPoll(poll));
	} catch (error) {
		console.log("poll updated", error);
	}
}

function pollingAdminPollRemoved(params: unknown) {
	const { dispatch } = store;
	try {
		const id = pollDeletedIndSchema.parse(params);
		dispatch(removePoll(id));
	} catch (error) {
		console.log("poll removed", error);
	}
}

function pollingAdminPollVoted(params: unknown) {
	const { dispatch } = store;
	try {
		const voted = pollVotedIndSchema.parse(params);
		dispatch(setVoted(voted));
	} catch (error) {
		console.log("poll voted", error);
	}
}

export function pollingAdminEventsRegister(socket: Socket) {
	socket
		.on("event:published", pollingAdminEventPublished)
		.on("event:unpublished", pollingAdminEventUnpublished)
		.on("poll:added", pollingAdminPollAdded)
		.on("poll:updated", pollingAdminPollUpdated)
		.on("poll:removed", pollingAdminPollRemoved)
		.on("poll:voted", pollingAdminPollVoted);
}
