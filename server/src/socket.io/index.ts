import { Server as HttpServer } from "node:http";
import { Server as SocketIoServer, Socket } from "socket.io";
import onConnectPoll from "./poll";
import { verifyToken } from "../auth/jwt";

function authSocket(socket: Socket, next: Function) {
	try {
		const token = socket.handshake.auth.token;
		const user = verifyToken(token);
		socket.data.user = user;
		next();
	} catch (error) {
		console.error(error);
		next(error);
	}
}

export function init(httpServer: HttpServer) {
	const io = new SocketIoServer(httpServer);
	io.on("connection", () => console.log("connection"));
	io.use(authSocket);
	io.of("/poll").on("connection", (socket) => {
		onConnectPoll(socket, socket.data.user);
	});
}
