import { Socket } from "socket.io-client";
import {
	eventOpenedSchema,
	pollAddedSchema,
	pollUpdatedSchema,
	pollDeletedSchema,
} from "@schemas/poll";
import { store } from ".";
import {
	setEvent,
	setPolls,
	setPoll,
	addPoll,
	removePoll,
} from "./pollingAdmin";

function pollingAdminEventOpened(params: unknown) {
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

function pollingAdminPollAdded(params: unknown) {
	const { dispatch } = store;
	try {
		const poll = pollAddedSchema.parse(params);
		dispatch(addPoll(poll));
	} catch (error) {
		console.log("poll added", error);
	}
}

function pollingAdminPollUpdated(params: unknown) {
	const { dispatch } = store;
	try {
		const poll = pollUpdatedSchema.parse(params);
		dispatch(setPoll(poll));
	} catch (error) {
		console.log("poll updated", error);
	}
}

function pollingAdminPollRemoved(params: unknown) {
	const { dispatch } = store;
	try {
		const id = pollDeletedSchema.parse(params);
		dispatch(removePoll(id));
	} catch (error) {
		console.log("poll removed", error);
	}
}

export function pollingAdminSocketRegister(socket: Socket) {
	socket
		.on("event:opened", pollingAdminEventOpened)
		.on("poll:added", pollingAdminPollAdded)
		.on("poll:updated", pollingAdminPollUpdated)
		.on("poll:removed", pollingAdminPollRemoved);
}
