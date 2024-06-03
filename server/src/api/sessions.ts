/*
 * Sessions API
 */
import { Request, Response, NextFunction, Router } from "express";
import {
	SessionCreate,
	SessionUpdate,
	sessionCreateSchema,
	sessionUpdateSchema,
	sessionIdsSchema,
} from "../schemas/sessions";
import {
	getSessions,
	updateSession,
	addSession,
	deleteSessions,
} from "../services/sessions";

function get(req: Request, res: Response, next: NextFunction) {
	getSessions(req.query)
		.then((data) => res.json(data))
		.catch(next);
}

function addOne(req: Request, res: Response, next: NextFunction) {
	let session: SessionCreate;
	try {
		session = sessionCreateSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	addSession(session)
		.then((data) => res.json(data))
		.catch(next);
}

function updateOne(req: Request, res: Response, next: NextFunction) {
	let update: SessionUpdate;
	try {
		update = sessionUpdateSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	updateSession(update.id, update.changes)
		.then((data) => res.json(data))
		.catch(next);
}

function removeMany(req: Request, res: Response, next: NextFunction) {
	let ids: number[];
	try {
		ids = sessionIdsSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	deleteSessions(ids)
		.then((data) => res.json(data))
		.catch(next);
}

const router = Router();
router.route("/").get(get).post(addOne).patch(updateOne).delete(removeMany);

export default router;
