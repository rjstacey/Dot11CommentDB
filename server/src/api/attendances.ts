/*
 * Attendances API
 *
 */
import { Request, Response, NextFunction, Router } from "express";
import { AccessLevel } from "../auth/access.js";
import { ForbiddenError, BadRequestError } from "../utils/index.js";
import {
	sessionAttendanceSummaryCreatesSchema,
	sessionAttendanceSummaryUpdatesSchema,
	sessionAttendanceSummaryIdsSchema,
} from "@schemas/attendances.js";
import {
	getAttendances,
	getRecentAttendances,
	addAttendances,
	updateAttendances,
	deleteAttendances,
	importAttendances,
	uploadRegistration,
	exportAttendancesForMinutes,
} from "../services/attendances.js";

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	try {
		if (!req.group) throw new Error("Group not set");

		const access = req.group.permissions.members || AccessLevel.none;
		const grant =
			(req.method === "GET" && access >= AccessLevel.ro) ||
			(req.method === "PATCH" && access >= AccessLevel.rw) ||
			((req.method === "DELETE" || req.method === "POST") &&
				access >= AccessLevel.admin);

		if (grant) {
			next();
			return;
		}

		throw new ForbiddenError();
	} catch (error) {
		next(error);
	}
}

async function getForSession(req: Request, res: Response, next: NextFunction) {
	const groupId = req.group!.id;
	const session_id = Number(req.params.session_id);
	if (isNaN(session_id)) {
		next(new BadRequestError("Path parameter :session_id not a number"));
		return;
	}
	try {
		const data = await getAttendances({ groupId, session_id });
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function getForMinutes(req: Request, res: Response, next: NextFunction) {
	const user = req.user;
	const group = req.group!;
	const session_id = Number(req.params.session_id);
	if (isNaN(session_id)) {
		next(new BadRequestError("Path parameter :session_id not a number"));
		return;
	}
	try {
		await exportAttendancesForMinutes(user, group, session_id, res);
		res.end();
	} catch (error) {
		next(error);
	}
}

async function importAll(req: Request, res: Response, next: NextFunction) {
	const user = req.user;
	const group = req.group!;
	const session_id = Number(req.params.session_id);
	if (isNaN(session_id)) {
		next(new BadRequestError("Path parameter :session_id not a number"));
		return;
	}
	const { use } = req.query;
	const useDaily =
		typeof use === "string" && use.toLowerCase().startsWith("daily");
	try {
		const data = await importAttendances(user, group, session_id, useDaily);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function uploadRegistrationRequest(
	req: Request,
	res: Response,
	next: NextFunction
) {
	const user = req.user;
	const group = req.group!;
	const session_id = Number(req.params.session_id);
	if (isNaN(session_id)) {
		next(new BadRequestError("Path parameter :session_id not a number"));
		return;
	}

	if (!req.body) {
		next(new TypeError("Missing file"));
		return;
	}
	let filename = "";
	const d = req.headers["content-disposition"];
	if (d) {
		const m = d.match(/filename="(.*)"/i);
		if (m) filename = m[1];
	}

	try {
		const data = await uploadRegistration(
			user,
			group,
			session_id,
			filename,
			req.body
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function getRecent(req: Request, res: Response, next: NextFunction) {
	const user = req.user;
	const groupId = req.group!.id;
	try {
		const data = await getRecentAttendances(user, groupId);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function addMany(req: Request, res: Response, next: NextFunction) {
	const groupId = req.group!.id;
	try {
		const attendances = sessionAttendanceSummaryCreatesSchema.parse(
			req.body
		);
		const data = await addAttendances(groupId, attendances);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function updateMany(req: Request, res: Response, next: NextFunction) {
	try {
		const updates = sessionAttendanceSummaryUpdatesSchema.parse(req.body);
		const data = await updateAttendances(updates);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function removeMany(req: Request, res: Response, next: NextFunction) {
	try {
		const ids = sessionAttendanceSummaryIdsSchema.parse(req.body);
		const data = await deleteAttendances(ids);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

const router = Router();
router
	.all(/(.*)/, validatePermissions)
	.get("/:session_id", getForSession)
	.get("/:session_id/exportForMinutes", getForMinutes)
	.post("/:session_id/import", importAll)
	.post("/:session_id/uploadRegistration", uploadRegistrationRequest);
router
	.route("/")
	.get(getRecent)
	.post(addMany)
	.patch(updateMany)
	.delete(removeMany);

export default router;
