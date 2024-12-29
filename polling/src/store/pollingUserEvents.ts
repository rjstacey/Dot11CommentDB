import { Socket } from "socket.io-client";
import {
	eventOpenedSchema,
	pollAddedSchema,
	pollUpdatedSchema,
	pollDeletedSchema,
	pollIdSchema,
	PollAction,
} from "@schemas/poll";
import { store } from ".";
import {
	setEvent,
	setPolls,
	setPoll,
	addPoll,
	removePoll,
	setPollAction,
} from "./pollingUser";

function pollingUserEventOpened(params: any, cb: Function) {
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

function pollingUserPollAdded(params: any, cb: Function) {
	const { dispatch } = store;
	try {
		const poll = pollAddedSchema.parse(params);
		dispatch(addPoll(poll));
	} catch (error) {
		console.log("poll added", error);
	}
}

function pollingUserPollUpdated(params: any, cb: Function) {
	const { dispatch } = store;
	try {
		const poll = pollUpdatedSchema.parse(params);
		dispatch(setPoll(poll));
	} catch (error) {
		console.log("poll updated", error);
	}
}

function pollingUserPollRemoved(params: any, cb: Function) {
	const { dispatch } = store;
	try {
		const id = pollDeletedSchema.parse(params);
		dispatch(removePoll(id));
	} catch (error) {
		console.log("poll removed", error);
	}
}

function pollingUserPollAction(
	pollAction: PollAction,
	params: any,
	cb: Function
) {
	const { dispatch } = store;
	try {
		const pollId = pollIdSchema.parse(params);
		dispatch(setPollAction({ pollId, pollAction }));
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
		.on("poll:shown", (params: any, cb: Function) =>
			pollingUserPollAction("show", params, cb)
		)
		.on("poll:opened", (params: any, cb: Function) =>
			pollingUserPollAction("open", params, cb)
		)
		.on("poll:closed", (params: any, cb: Function) =>
			pollingUserPollAction("close", params, cb)
		);
}
