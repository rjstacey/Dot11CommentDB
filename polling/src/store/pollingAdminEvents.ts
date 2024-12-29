import { Socket } from "socket.io-client";
import {
	eventOpenedSchema,
	pollAddedSchema,
	pollUpdatedSchema,
	pollDeletedSchema,
	pollIdSchema,
	Event,
	Poll,
	PollAction,
	GroupJoin,
} from "@schemas/poll";
import { store } from ".";
import { selectSelectedGroupId } from "./groups";
import { pollingSocketEmit, handleError } from "./pollingSocket";
import { setEvent, setPolls, pollingAdminEventsGet } from "./pollingAdmin";

async function pollingAdminConnect(this: Socket) {
	const { dispatch, getState } = store;
	const groupId = selectSelectedGroupId(getState());

	try {
		if (groupId) {
			await pollingSocketEmit("group:join", {
				groupId,
			} satisfies GroupJoin);
			await dispatch(pollingAdminEventsGet(groupId));
		}
	} catch (error: any) {
		dispatch(handleError(error));
	}
}

function pollingAdminEventOpened(this: Socket, params: any, cb: Function) {
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

export function pollingAdminSocketRegister(socket: Socket) {
	socket
		.on("connect", pollingAdminConnect.bind(socket))
		.on("event:opened", pollingAdminEventOpened.bind(socket));
	/*.on("poll:added", pollingUserPollAdded)
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
		);*/
}
