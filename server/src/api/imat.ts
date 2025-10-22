/*
 * IMAT API
 * (IEEE SA attendance system)
 */
import { Request, Response, NextFunction, Router } from "express";
import {
	getImatCommittees,
	getImatMeetings,
	getImatBreakouts,
	addImatBreakouts,
	updateImatBreakouts,
	deleteImatBreakouts,
	getImatMeetingAttendance,
	getImatBreakoutAttendance,
	getImatMeetingDailyAttendance,
	getImatMeetingAttendanceSummary,
} from "../services/imat.js";
import {
	breakoutCreatesSchema,
	breakoutIdsSchema,
	breakoutUpdatesSchema,
} from "@schemas/imat.js";
import { BadRequestError } from "src/utils/error.js";

function imatMeetingIdOrThrow(req: Request): number {
	const imatMeetingId = Number(req.params.imatMeetingId);
	if (isNaN(imatMeetingId))
		throw new BadRequestError("Bad path parameter :imatMeetingId");
	return imatMeetingId;
}

function imatBreakoutIdOrThrow(req: Request): number {
	const imatBreakoutId = Number(req.params.imatBreakoutId);
	if (isNaN(imatBreakoutId))
		throw new BadRequestError("Bad path parameter :imatBreakoutId");
	return imatBreakoutId;
}

async function getCommittees(req: Request, res: Response, next: NextFunction) {
	try {
		const { user, group } = req;
		const data = await getImatCommittees(user, group!);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function getMeetings(req: Request, res: Response, next: NextFunction) {
	try {
		const { user } = req;
		const data = await getImatMeetings(user);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function getBreakouts(req: Request, res: Response, next: NextFunction) {
	try {
		const { user } = req;
		const imatMeetingId = imatMeetingIdOrThrow(req);
		const data = await getImatBreakouts(user, imatMeetingId);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function addBreakouts(req: Request, res: Response, next: NextFunction) {
	try {
		const { user, body } = req;
		const imatMeetingId = imatMeetingIdOrThrow(req);
		const breakouts = breakoutCreatesSchema.parse(body);
		const data = await addImatBreakouts(user, imatMeetingId, breakouts);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function updateBreakouts(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const { user, body } = req;
		const imatMeetingId = imatMeetingIdOrThrow(req);
		const breakouts = breakoutUpdatesSchema.parse(body);
		const data = await updateImatBreakouts(user, imatMeetingId, breakouts);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function removeBreakouts(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const { user, body } = req;
		const imatMeetingId = imatMeetingIdOrThrow(req);
		const ids = breakoutIdsSchema.parse(body);
		const data = await deleteImatBreakouts(user, imatMeetingId, ids);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function getMeetingAttendance(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const { user } = req;
		const imatMeetingId = imatMeetingIdOrThrow(req);
		const data = await getImatMeetingAttendance(user, imatMeetingId);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function getMeetingAttendanceSummary(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const { user, group, query } = req;
		const imatMeetingId = imatMeetingIdOrThrow(req);
		const useDaily = query.useDaily !== "false";
		const getAttendance = useDaily
			? getImatMeetingDailyAttendance
			: getImatMeetingAttendanceSummary;
		const data = await getAttendance(user, group!, imatMeetingId);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function getBreakoutAttendance(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const { user } = req;
		const imatMeetingId = imatMeetingIdOrThrow(req);
		const imatBreakoutId = imatBreakoutIdOrThrow(req);
		const data = await getImatBreakoutAttendance(
			user,
			imatMeetingId,
			imatBreakoutId
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

const router = Router();
router
	.get("/committees", getCommittees)
	.get("/meetings", getMeetings)
	.route("/breakouts/:imatMeetingId")
	.get(getBreakouts)
	.post(addBreakouts)
	.put(updateBreakouts)
	.delete(removeBreakouts);
router
	.get("/attendance/:imatMeetingId", getMeetingAttendance)
	.get("/attendance/:imatMeetingId/summary", getMeetingAttendanceSummary)
	.get("/attendance/:imatMeetingId/:imatBreakoutId", getBreakoutAttendance);

export default router;
