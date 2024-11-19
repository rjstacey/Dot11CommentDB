import { Server as HttpServer } from "node:http";
import { Server as SocketIoServer, Socket } from "socket.io";
import onPollConnect from "./poll";
import { verifyToken } from "../auth/jwt";

async function authSocket(socket: Socket, next: Function) {
	console.log("auth");
	try {
		const token = socket.handshake.query.token;
		if (typeof token !== "string") throw new Error("Invalid token");
		const user = await verifyToken(token);
		socket.data.user = user;
		next();
	} catch (error) {
		console.error(error);
		next(error);
	}
}

let io: any;
export function init(httpServer: HttpServer) {
	io = new SocketIoServer(httpServer);
	io.of("/poll")
		.use(authSocket)
		.on("connection", (socket: Socket) => {
			console.log("poll connection");
			onPollConnect(socket, socket.data.user);
		});
}
