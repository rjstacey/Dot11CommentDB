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

async function getCommittees(req: Request, res: Response, next: NextFunction) {
	const { user, group } = req;
	try {
		const data = await getImatCommittees(user, group!);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function getMeetings(req: Request, res: Response, next: NextFunction) {
	const { user } = req;
	try {
		const data = await getImatMeetings(user);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function getBreakouts(req: Request, res: Response, next: NextFunction) {
	const { user, params } = req;
	const imatMeetingId = Number(params.imatMeetingId);
	if (isNaN(imatMeetingId)) {
		next(new BadRequestError("Path parameter :imatMeetingId not a number"));
		return;
	}
	try {
		const data = await getImatBreakouts(user, imatMeetingId);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function addBreakouts(req: Request, res: Response, next: NextFunction) {
	const { user, params, body } = req;
	const imatMeetingId = Number(params.imatMeetingId);
	if (isNaN(imatMeetingId)) {
		next(new BadRequestError("Path parameter :imatMeetingId not a number"));
		return;
	}
	try {
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
	const { user, params, body } = req;
	const imatMeetingId = Number(params.imatMeetingId);
	if (isNaN(imatMeetingId)) {
		next(new BadRequestError("Path parameter :imatMeetingId not a number"));
		return;
	}
	try {
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
	const { user, params, body } = req;
	const imatMeetingId = Number(params.imatMeetingId);
	if (isNaN(imatMeetingId)) {
		next(new BadRequestError("Path parameter :imatMeetingId not a number"));
		return;
	}
	try {
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
	const { user, params } = req;
	const imatMeetingId = Number(params.imatMeetingId);
	if (isNaN(imatMeetingId)) {
		next(new BadRequestError("Path parameter :imatMeetingId not a number"));
		return;
	}
	try {
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
	const { user, group, params, query } = req;
	const imatMeetingId = Number(params.imatMeetingId);
	if (isNaN(imatMeetingId)) {
		next(new BadRequestError("Path parameter :imatMeetingId not a number"));
		return;
	}
	const useDaily = query.useDaily !== "false";
	const getAttendance = useDaily
		? getImatMeetingDailyAttendance
		: getImatMeetingAttendanceSummary;
	try {
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
	const { user, params } = req;
	const imatMeetingId = Number(params.imatMeetingId);
	if (isNaN(imatMeetingId)) {
		next(new BadRequestError("Path parameter :imatMeetingId not a number"));
		return;
	}
	const imatBreakoutId = Number(params.imatBreakoutId);
	if (isNaN(imatBreakoutId)) {
		next(
			new BadRequestError("Path parameter :imatBreakoutId not a number")
		);
		return;
	}
	try {
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
