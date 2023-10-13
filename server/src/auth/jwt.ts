import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import type { RequestHandler, Request } from "express";

import { getUser } from "../services/users";

const secret = process.env.NODE_ENV === "development" ? "secret" : uuidv4();
//const secret = uuidv4();

/*
 * Sign the user ID (SAPIN) and return as JWT token
 */
export const token = (userId: number) => jwt.sign(userId.toString(), secret);

/*
 * Get token from header
 */
const getToken = (req: Request): string => {
	try {
		return req.header("Authorization")!.replace("Bearer ", "");
	} catch (error) {
		throw new Error("No token");
	}
};

/*
 * Verify a JWT token and, if valid, return the decoded payload
 */
export const verify = (req: Request) => {
	const token = getToken(req);
	try {
		return jwt.verify(token, secret);
	} catch (error) {
		throw new Error("Bad token");
	}
};

/*
 * Express middleware to authorize a request.
 * Validates the token, looks up the user associated with the token
 * and stores as req.user
 */
export const authorize: RequestHandler = async (req, res, next) => {
	try {
		const token = getToken(req);
		let userId: number;
		try {
			userId = Number(jwt.verify(token, secret));
		} catch (error) {
			console.warn("unauthorized");
			res.status(401).send("Unauthorized");
			return;
		}
		const user = await getUser(userId);
		if (!user) throw new Error("Unknown user");
		req.user = user;
		next();
	} catch (error) {
		console.log(error);
		res.status(403).send(error);
	}
};
