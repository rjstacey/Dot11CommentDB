import { Socket, Namespace } from "socket.io";
import type { UserContext } from "../services/users.js";
import { pollingGroupRegister } from "./pollingGroup.js";

export function pollingRegister(nsp: Namespace) {
	nsp.on("connection", (socket: Socket) => {
		const user: UserContext = socket.data.user;

		console.log("register " + user.Name + " for polling");
		socket.onAny((event, ...args) => {
			console.log("in", event, args);
		});
		socket.onAnyOutgoing((event, ...args) => {
			console.log("out", event, args);
		});
		socket.on("disconnect", () => {
			console.log("disconnect ", user);
		});
		pollingGroupRegister(socket, user);
	});
}
