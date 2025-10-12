/*
 * 802 tools server
 *
 * Robert Stacey
 */
import dotenv from "dotenv";
import path from "node:path";
import { createServer } from "node:http";
import express, { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

import login from "./auth/login.js";
import oauth2 from "./auth/oauth2.js";
import api from "./api/router.js";

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

dotenv.config();

const LISTEN_PORT = process.env.PORT || 8080;

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
		meetingsInit();
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
		message = err.name + ": " + err.message;
		if (err instanceof ZodError) {
			const m = err.issues.map((e) => `${e.path[0]}: ${e.message}`);
			message += "\n" + m.join("\n");
		}
		if (err.name === "TypeError" || "sqlState" in err) status = 400;
		else if (err.name === "AuthError") status = 401;
		else if (err.name === "ForbiddenError") status = 403;
		else if (err.name === "NotFoundError") status = 404;
	} else {
		try {
			message = err.toString();
		} catch {
			message = JSON.stringify(err);
		}
	}
	res.status(status).send(message);
};

const __dirname = process.cwd();

function initExpressApp() {
	const app = express();

	app.use(express.json({ limit: "10MB" }));
	app.use(express.urlencoded({ extended: true }));

	// Log requests to console
	if (process.env.NODE_ENV === "development") app.use(requestLog);

	// Default is to expire immediately
	app.all(/(.*)/, (req, res, next) => {
		res.setHeader("Cache-Control", "max-age=0");
		next();
	});

	app.get("/health-check", async (req, res) => {
		res.status(200).send("I'm healthy!");
	});

	app.use("/auth", login);

	// The /oauth2 interface is used for oauth2 completion callbacks
	app.use("/oauth2", oauth2);

	// The /api interface provides secure access to the REST API
	app.use("/api", api);

	// Error handler
	app.use(errorHandler);

	//app.get('*/static*', (req, res, next) => {
	//	res.setHeader('Cache-Control', 'max-age=31536000');
	//	next();
	//});

	let devdir = "";
	if (process.env.NODE_ENV === "development") {
		devdir = "../build";
		//console.log(path.join(__dirname, devdir));
	}

	app.use(
		express.static(path.join(__dirname, devdir, ""), { maxAge: 31536000 })
	);

	app.get("/login", (req, res) => {
		res.sendFile(path.join(__dirname, devdir, "auth/index.html"));
	});
	app.get("/logout", (req, res) =>
		res.sendFile(path.join(__dirname, devdir, "auth/logout.html"))
	);
	app.get(/\/comments.*/, (req, res) =>
		res.sendFile(path.join(__dirname, devdir, "comments/index.html"))
	);
	app.get(/\/membership.*/, (req, res) =>
		res.sendFile(path.join(__dirname, devdir, "membership/index.html"))
	);
	app.get(/\/meetings.*/, (req, res) =>
		res.sendFile(path.join(__dirname, devdir, "meetings/index.html"))
	);
	app.get(/\/polling.*/, (req, res) =>
		res.sendFile(path.join(__dirname, devdir, "polling/index.html"))
	);
	app.get("/", (req, res) =>
		//res.sendFile(path.join(__dirname, devdir, "home/index.html"))
		res.redirect("/home")
	);
	//app.get('*', (req, res) => res.redirect('/'));

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

	server.listen(LISTEN_PORT, () => {
		console.log("👂 listening on port %s", LISTEN_PORT);
	});
}

main();
