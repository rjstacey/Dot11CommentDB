/*
 * 802 tools server
 *
 * Robert Stacey
 */
import dotenv from "dotenv";
import path from "node:path";
import { createServer } from "node:http";
import express, { ErrorRequestHandler, RequestHandler } from "express";
import cors from "cors";

import login from "./auth/login.js";
import oauth2 from "./auth/oauth2.js";
import api from "./api/index.js";

import { init as initSocketIo } from "./socket.io/index.js";
import { init as initDatabaseConnection } from "./utils/database.js";
import { init as initMembers } from "./services/members.js";
import { init as initComments } from "./services/comments.js";
import { init as initCommentHistory } from "./services/commentHistory.js";
import { init as initBallots } from "./services/ballots.js";
import { init as initBallotVoters } from "./services/voters.js";
import { init as initBallotResults } from "./services/results.js";
import { init as webexInit } from "./services/webex.js";
import { init as calendarInit } from "./services/calendar.js";
import { init as emailInit } from "./services/emailSend.js";
import { init as meetingsInit } from "./services/meetings.js";
import { init as pollInit } from "./services/poll.js";

dotenv.config();

async function initDatabase() {
	process.stdout.write("init database... ");
	try {
		await initDatabaseConnection();
		process.stdout.write("success\n");
	} catch (error) {
		process.stdout.write("FAIL\n");
		console.warn(error);
		throw error;
	}
}

async function initServices() {
	try {
		process.stdout.write("init members... ");
		await initMembers();
		process.stdout.write("success\n");

		process.stdout.write("init ballots... ");
		await initBallots();
		process.stdout.write("success\n");

		process.stdout.write("init ballot voters... ");
		await initBallotVoters();
		process.stdout.write("success\n");

		process.stdout.write("init ballot results... ");
		await initBallotResults();
		process.stdout.write("success\n");

		process.stdout.write("init comments... ");
		await initComments();
		process.stdout.write("success\n");

		process.stdout.write("init comment history... ");
		await initCommentHistory();
		process.stdout.write("success\n");

		process.stdout.write("init webex... ");
		await webexInit();
		process.stdout.write("success\n");

		process.stdout.write("init calendar... ");
		await calendarInit();
		process.stdout.write("success\n");

		process.stdout.write("init email... ");
		emailInit();
		process.stdout.write("success\n");

		process.stdout.write("init meetings... ");
		await meetingsInit();
		process.stdout.write("success\n");

		process.stdout.write("init polls... ");
		await pollInit();
		process.stdout.write("success\n");
	} catch (error) {
		process.stdout.write("FAIL\n");
		console.warn(error);
	}
}

const requestLog: RequestHandler = function (req, res, next) {
	console.log(req.method, req.url);
	next();
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler: ErrorRequestHandler = function (err, req, res, next) {
	if (process.env.NODE_ENV === "development") console.warn(err);

	let message: string = "";
	let status = 500;
	if (typeof err === "string") {
		message = err;
	} else if (err instanceof Error) {
		message = err.message;
		if (err.name === "BadRequestError" || err.name === "ZodError")
			status = 400;
		else if (err.name === "AuthError") status = 401;
		else if (err.name === "ForbiddenError") status = 403;
		else if (err.name === "NotFoundError") status = 404;
		else {
			status = 500;
			message = err.name + ": " + err.message;
		}
	} else {
		try {
			message = err.toString();
		} catch {
			message = JSON.stringify(err);
		}
	}
	res.status(status).send(message);
};

function initExpressApp() {
	const app = express();

	app.use(cors());
	app.use(express.json({ limit: "10MB" }));
	app.use(express.urlencoded({ extended: true }));
	app.use(express.raw({ type: "application/octet-stream", limit: "100MB" }));

	// Log requests to console
	if (process.env.NODE_ENV === "development") app.use(requestLog);

	// Default is to expire immediately
	app.use((req, res, next) => {
		res.setHeader("Cache-Control", "max-age=0");
		next();
	});

	app.get("/health-check", async (req, res) => {
		res.status(200).send("I'm healthy!");
	});

	app.use("/auth", login); // User autherization (login and logout)
	app.use("/oauth2", oauth2); // OAuth2 completion callbacks
	app.use("/api", api); // Secure access to the REST API
	app.use(errorHandler); // Error handling

	let dir = process.cwd();
	if (process.env.NODE_ENV === "development")
		dir = path.join(dir, "../build");

	app.use(express.static(dir, { maxAge: 31536000 }));

	/* If we can't find the static file, send the index page
	 * (e.g., a request for old asset) */
	app.get("/login", (req, res) =>
		res.sendFile(path.join(dir, "auth/index.html"))
	);
	app.get("/logout", (req, res) =>
		res.sendFile(path.join(dir, "auth/logout.html"))
	);
	app.get(/\/home\/.*/, (req, res) =>
		res.sendFile(path.join(dir, "home/index.html"))
	);
	app.get(/\/comments\/.*/, (req, res) =>
		res.sendFile(path.join(dir, "comments/index.html"))
	);
	app.get(/\/membership\/.*/, (req, res) =>
		res.sendFile(path.join(dir, "membership/index.html"))
	);
	app.get(/\/meetings\/.*/, (req, res) =>
		res.sendFile(path.join(dir, "meetings/index.html"))
	);
	app.get(/\/polling\/.*/, (req, res) =>
		res.sendFile(path.join(dir, "polling/index.html"))
	);

	// Redirect root to /root
	app.get("/", (req, res) => res.redirect("/home"));

	return app;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
	while (true) {
		try {
			await initDatabase();
			break;
		} catch {
			await sleep(5000);
		}
	}

	try {
		await initServices();
	} catch (error) {
		console.log(error);
		process.exitCode = 1;
	}

	console.log("init express app");
	const app = initExpressApp();
	console.log("create http server");
	const server = createServer(app);
	console.log("create socket.io server");
	initSocketIo(server);

	const LISTEN_PORT = process.env.PORT || 8080;
	server.listen(LISTEN_PORT, () => {
		console.log("👂 listening on port %s", LISTEN_PORT);
	});
}

main();
