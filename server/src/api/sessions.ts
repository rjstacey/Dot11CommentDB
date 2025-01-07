/*
 * Sessions API
 */
import { Request, Response, NextFunction, Router } from "express";
import {
	sessionCreateSchema,
	sessionUpdateSchema,
	sessionIdsSchema,
	sessionsQuerySchema,
} from "@schemas/sessions.js";
import {
	getSessions,
	updateSession,
	addSession,
	deleteSessions,
} from "../services/sessions.js";

async function get(req: Request, res: Response, next: NextFunction) {
	try {
		const query = sessionsQuerySchema.parse(req.query);
		const data = await getSessions(query);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function addOne(req: Request, res: Response, next: NextFunction) {
	try {
		const session = sessionCreateSchema.parse(req.body);
		const data = await addSession(session);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function updateOne(req: Request, res: Response, next: NextFunction) {
	try {
		const update = sessionUpdateSchema.parse(req.body);
		const data = await updateSession(update.id, update.changes);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function removeMany(req: Request, res: Response, next: NextFunction) {
	try {
		const ids = sessionIdsSchema.parse(req.body);
		const data = await deleteSessions(ids);
		res.json(data);
	} catch (error) {
		return next(error);
	}
}

const router = Router();
router.route("/").get(get).post(addOne).patch(updateOne).delete(removeMany);

export default router;
