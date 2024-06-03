/*
 * Attendances API
 *
 */
import { Request, Response, NextFunction, Router } from "express";
import { AccessLevel } from "../auth/access";
import { ForbiddenError } from "../utils";
import {
	SessionAttendanceSummaryCreate,
	SessionAttendanceSummaryUpdate,
	sessionAttendanceSummaryCreatesSchema,
	sessionAttendanceSummaryUpdatesSchema,
	sessionAttendancesSummaryIdsSchema,
} from "../schemas/attendances";
import {
	getAttendances,
	getRecentAttendances,
	addAttendances,
	updateAttendances,
	deleteAttendances,
	importAttendances,
	exportAttendancesForMinutes,
} from "../services/attendances";

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	if (!req.group) return next(new Error("Group not set"));

	const access = req.group.permissions.members || AccessLevel.none;
	if (req.method === "GET" && access >= AccessLevel.ro) return next();
	if (req.method === "PATCH" && access >= AccessLevel.rw) return next();
	if (
		(req.method === "DELETE" || req.method === "POST") &&
		access >= AccessLevel.admin
	)
		return next();

	next(new ForbiddenError("Insufficient karma"));
}

function getForSession(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	const session_id = Number(req.params.session_id);
	getAttendances(group.id, session_id)
		.then((data) => res.json(data))
		.catch(next);
}

function getForMinutes(req: Request, res: Response, next: NextFunction) {
	const session_id = Number(req.params.session_id);
	exportAttendancesForMinutes(req.user, req.group!, session_id, res)
		.then(() => res.end())
		.catch(next);
}

function importAll(req: Request, res: Response, next: NextFunction) {
	const session_id = Number(req.params.session_id);
	const { use } = req.query;
	let useDailyAttendance =
		typeof use === "string" && use.toLowerCase().startsWith("daily");
	importAttendances(req.user, req.group!, session_id, useDailyAttendance)
		.then((data) => res.json(data))
		.catch(next);
}

function getRecent(req: Request, res: Response, next: NextFunction) {
	const user = req.user;
	const group = req.group!;
	getRecentAttendances(user, group.id)
		.then((data) => res.json(data))
		.catch(next);
}

function addMany(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	let attendances: SessionAttendanceSummaryCreate[];
	try {
		attendances = sessionAttendanceSummaryCreatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	addAttendances(group.id, attendances)
		.then((data) => res.json(data))
		.catch(next);
}

function updateMany(req: Request, res: Response, next: NextFunction) {
	let updates: SessionAttendanceSummaryUpdate[];
	try {
		updates = sessionAttendanceSummaryUpdatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	updateAttendances(updates)
		.then((data) => res.json(data))
		.catch(next);
}

function removeMany(req: Request, res: Response, next: NextFunction) {
	let ids: number[];
	try {
		ids = sessionAttendancesSummaryIdsSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	deleteAttendances(ids)
		.then((data) => res.json(data))
		.catch(next);
}

const router = Router();
router
	.all("*", validatePermissions)
	.get("/:session_id(\\d+)", getForSession)
	.get("/:session_id(\\d+)/exportForMinutes", getForMinutes)
	.post("/:session_id(\\d+)/import", importAll);
router
	.route("/")
	.get(getRecent)
	.post(addMany)
	.patch(updateMany)
	.delete(removeMany);

export default router;
