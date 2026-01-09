import { Server as HttpServer } from "node:http";
import { Server as SocketIoServer, Socket } from "socket.io";
import { pollingSocketName } from "@schemas/poll.js";
import { selectUser } from "../services/users.js";
import { pollingRegister } from "./polling/index.js";
import { verifyToken } from "../auth/jwt.js";

type NextFunction = (err?: Error) => void;

async function authSocket(socket: Socket, next: NextFunction) {
	//console.log("auth");
	try {
		const token = socket.handshake.query.token;
		if (typeof token !== "string") throw new Error("Invalid token");
		const userId = verifyToken(token);
		const user = await selectUser({ SAPIN: userId });
		if (!user) throw new Error("User not found");
		socket.data.user = user;
		next();
	} catch (error) {
		console.error(error);
		if (error instanceof Error) next(error);
		else throw error;
	}
}

export function init(httpServer: HttpServer) {
	const io = new SocketIoServer(httpServer);
	io.of(pollingSocketName).use(authSocket);
	pollingRegister(io.of(pollingSocketName));
}
