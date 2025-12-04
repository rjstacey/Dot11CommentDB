/*
 * Attendances API
 *
 */
import { Request, Response, NextFunction, Router } from "express";
import { AccessLevel } from "@schemas/access.js";
import { ForbiddenError, BadRequestError } from "@/utils/index.js";
import {
	sessionAttendanceSummaryCreatesSchema,
	sessionAttendanceSummaryUpdatesSchema,
	sessionAttendanceSummaryIdsSchema,
	sessionAttendanceSummaryQuerySchema,
	sessionAttendeesExportQuerySchema,
} from "@schemas/attendances.js";
import {
	getAttendances,
	addAttendances,
	updateAttendances,
	deleteAttendances,
	importAttendances,
	uploadRegistration,
	loadRegistration,
	exportAttendeesForMinutes,
	deleteAllSessionAttendances,
	exportAttendeesForDVL,
} from "@/services/attendances.js";

function fileBufferOrThrow(req: Request): { filename: string; buffer: Buffer } {
	if (!req.body) throw new BadRequestError("Missing file");
	let filename: string;
	const d = req.headers["content-disposition"];
	if (d) {
		const m = d.match(/filename="(.*)"/i);
		if (m) {
			filename = m[1];
			return { filename, buffer: req.body };
		}
	}
	throw new BadRequestError("Missing filename");
}

function sessionIdOrThrow(req: Request): number {
	const session_id = Number(req.params.session_id);
	if (isNaN(session_id))
		throw new BadRequestError("Bad path parameter :session_id");
	return session_id;
}

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

async function getSessionIdExport(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const user = req.user;
		const group = req.group!;
		const session_id = sessionIdOrThrow(req);
		const params = sessionAttendeesExportQuerySchema.parse(req.query);
		if (params.format === "minutes")
			await exportAttendeesForMinutes(user, group, session_id, res);
		else await exportAttendeesForDVL(user, group, session_id, res);
		res.end();
	} catch (error) {
		next(error);
	}
}

async function postSessionIdImport(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const user = req.user;
		const group = req.group!;
		const session_id = sessionIdOrThrow(req);
		const useDailyIn = req.query.useDaily;
		const useDaily = Boolean(useDailyIn) && useDailyIn !== "false";
		const data = await importAttendances(user, group, session_id, useDaily);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function postSessionIdUpload(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const user = req.user;
		const group = req.group!;
		const session_id = sessionIdOrThrow(req);
		const format = req.query.format;
		if (format && format !== "registration")
			throw new BadRequestError("Invalid format parameter");
		const { filename, buffer } = fileBufferOrThrow(req);
		const data = await uploadRegistration(
			user,
			group,
			session_id,
			filename,
			buffer
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function postSessionIdLoad(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const user = req.user;
		const group = req.group!;
		const session_id = sessionIdOrThrow(req);
		const format = req.query.format;
		if (format && format !== "registration")
			throw new BadRequestError("Invalid format parameter");
		const { filename, buffer } = fileBufferOrThrow(req);
		const data = await loadRegistration(
			user,
			group,
			session_id,
			filename,
			buffer
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function get(req: Request, res: Response, next: NextFunction) {
	try {
		const groupId = req.group!.id;
		const query = sessionAttendanceSummaryQuerySchema.parse(req.query);
		const data = await getAttendances({ groupId, ...query });
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function removeSessionId(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const groupId = req.group!.id;
		const session_id = sessionIdOrThrow(req);
		const data = await deleteAllSessionAttendances(groupId, session_id);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function addMany(req: Request, res: Response, next: NextFunction) {
	try {
		const groupId = req.group!.id;
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
		const groupId = req.group!.id;
		const updates = sessionAttendanceSummaryUpdatesSchema.parse(req.body);
		const data = await updateAttendances(groupId, updates);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function removeMany(req: Request, res: Response, next: NextFunction) {
	try {
		const groupId = req.group!.id;
		const ids = sessionAttendanceSummaryIdsSchema.parse(req.body);
		const data = await deleteAttendances(groupId, ids);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

const router = Router();
router
	.all(/(.*)/, validatePermissions)
	.delete("/:session_id", removeSessionId)
	.get("/:session_id/export", getSessionIdExport)
	.post("/:session_id/import", postSessionIdImport)
	.post("/:session_id/upload", postSessionIdUpload)
	.post("/:session_id/load", postSessionIdLoad);
router.route("/").get(get).post(addMany).patch(updateMany).delete(removeMany);

export default router;
