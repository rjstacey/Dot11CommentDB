import { Socket } from "socket.io-client";
import {
	eventPublishedParamSchema,
	eventUnpublishedParamSchema,
	pollAddedParamSchema,
	pollUpdatedParamSchema,
	pollDeletedParamSchema,
} from "@schemas/poll";
import { store } from ".";
import {
	setEvent,
	setPolls,
	setPoll,
	updateEvent,
	addPoll,
	removePoll,
} from "./pollingAdmin";

function pollingAdminEventPublished(params: unknown) {
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

function pollingAdminEventUnpublished(params: unknown) {
	const { dispatch } = store;
	try {
		const { eventId } = eventUnpublishedParamSchema.parse(params);
		console.log("event unpublished", eventId);
		dispatch(updateEvent({ id: eventId, changes: { isPublished: false } }));
	} catch (error) {
		console.log("event unpublished", error);
	}
}

function pollingAdminPollAdded(params: unknown) {
	const { dispatch } = store;
	try {
		const poll = pollAddedParamSchema.parse(params);
		dispatch(addPoll(poll));
	} catch (error) {
		console.log("poll added", error);
	}
}

function pollingAdminPollUpdated(params: unknown) {
	const { dispatch } = store;
	try {
		const poll = pollUpdatedParamSchema.parse(params);
		dispatch(setPoll(poll));
	} catch (error) {
		console.log("poll updated", error);
	}
}

function pollingAdminPollRemoved(params: unknown) {
	const { dispatch } = store;
	try {
		const id = pollDeletedParamSchema.parse(params);
		dispatch(removePoll(id));
	} catch (error) {
		console.log("poll removed", error);
	}
}

export function pollingAdminSocketRegister(socket: Socket) {
	socket
		.on("connect", () => {
			console.log("pollingAdminSocket connect");
		})
		.on("event:published", pollingAdminEventPublished)
		.on("event:unpublished", pollingAdminEventUnpublished)
		.on("poll:added", pollingAdminPollAdded)
		.on("poll:updated", pollingAdminPollUpdated)
		.on("poll:removed", pollingAdminPollRemoved);
}
