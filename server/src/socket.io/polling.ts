import { Socket } from "socket.io";
import type { UserContext } from "../services/users.js";
import { onGroupJoin, onGroupLeave } from "./pollingGroup.js";
import {
	onEventGet,
	onEventCreate,
	onEventUpdate,
	onEventDelete,
	onEventAction,
} from "./pollingEvent.js";
import {
	onPollGet,
	onPollCreate,
	onPollUpdate,
	onPollDelete,
	onPollAction,
	onPollVote,
	onPollResult,
} from "./pollingPoll.js";

export function onConnect(socket: Socket, user: UserContext) {
	console.log("register " + user.Name + " for polling");
	socket.onAny((event, ...args) => {
		console.log(event, args);
	});
	socket.on("disconnect", () => {
		console.log("disconnect ", socket.data.user);
	});
	socket.on("group:admin", (data, callback) => {
		console.log("User " + user.Name + " wants to become an admin");
		callback(0);
	});
	const onEventActionBd = onEventAction.bind(socket);
	const onPollActionBd = onPollAction.bind(socket);
	const onPollVoteBd = onPollVote.bind(socket);
	socket
		.on("group:join", onGroupJoin.bind(socket))
		.on("group:leave", onGroupLeave.bind(socket))
		.on("event:get", onEventGet.bind(socket))
		.on("event:create", onEventCreate.bind(socket))
		.on("event:delete", onEventDelete.bind(socket))
		.on("event:update", onEventUpdate.bind(socket))
		.on("event:publish", (params, cb) =>
			onEventActionBd("publish", params, cb)
		)
		.on("event:unpublish", (params, cb) =>
			onEventActionBd("unpublish", params, cb)
		)
		.on("poll:get", onPollGet.bind(socket))
		.on("poll:create", onPollCreate.bind(socket))
		.on("poll:update", onPollUpdate.bind(socket))
		.on("poll:delete", onPollDelete.bind(socket))
		.on("poll:show", (params, cb) => onPollActionBd("show", params, cb))
		.on("poll:unshow", (params, cb) => onPollActionBd("unshow", params, cb))
		.on("poll:open", (params, cb) => onPollActionBd("open", params, cb))
		.on("poll:close", (params, cb) => onPollActionBd("close", params, cb))
		.on("poll:vote", (params, cb) => onPollVoteBd(user, params, cb))
		.on("poll:result", onPollResult.bind(socket));
}
