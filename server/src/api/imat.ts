/*
 * IMAT API
 * (IEEE SA attendance system)
 *
 * GET /committees/{group}
 *		Get committees for a specified group.
 *		URL parameters:
 *			group:string 		Identifies the group
 *		Returns an array of committee objects.
 *
 * GET /meetings
 *		Get a list of IMAT meetings (sessions).
 *		Returns an array of imatMeeting objects.
 *
 * GET /breakouts/{imatMeetingId}
 *		Get meeting details, breakouts, timeslots and committees for an IMAT meeting.
 *		URL parameters:
 *			imatMeetingId:number 	Identifies the IMAT meeting
 *		Returns an object with parameters:
 *			imatMeeting:object		IMAT meeting (session) details
 *			breakouts:array			an array of breakout objects
 *			timeouts:array			an array of timeslot objects
 *			committees:array 		an array of committee objects
 *
 * POST /breakouts/{imatMeetingId}
 *		Add breakouts to an IMAT meeting.
 *		URL parameters:
 *			imatMeetingId:number 	Identifies the IMAT meeting
 *		Body is an array of breakout objects.
 *		Returns the array of breakout objects as added.
 *
 * PUT /breakouts/{imatMeetingId}
 *		Update breakouts for an IMAT meeting.
 *		URL parameters:
 *			imatMeetingId:number 	Identifies the IMAT meeting
 *		Body is an array of breakout objects to update.
 *		Returns an array of breakout objects as updated.
 *
 * DELETE /breakouts/{imatMeetingId}
 *		Delete breakouts for an IMAT meeting.
 *		URL parameters:
 *			imatMeetingId:number 	Identifies the IMAT meeting
 *		Body is an array of breakout IDs.
 *		Returns the number of breakouts deleted.
 *
 * GET /attendance/{imatMeetingId}/{imatBreakoutId}
 *		Get a list of attendees for a specified breakout.
 *		Returns an array of attendance objects (user info with timestamp).
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
} from "../services/imat";
import {
	breakoutCreatesSchema,
	breakoutIdsSchema,
	breakoutUpdatesSchema,
} from "@schemas/imat";

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
	try {
		const imatMeetingId = Number(params.imatMeetingId);
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
	const { user, params } = req;
	const imatMeetingId = Number(params.imatMeetingId);
	const imatBreakoutId = Number(params.imatBreakoutId);
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
	.route("/breakouts/:imatMeetingId(\\d+)")
	.get(getBreakouts)
	.post(addBreakouts)
	.put(updateBreakouts)
	.delete(removeBreakouts);
router
	.get("/attendance/:imatMeetingId(\\d+)", getMeetingAttendance)
	.get(
		"/attendance/:imatMeetingId(\\d+)/:imatBreakoutId(\\d+)",
		getBreakoutAttendance
	)
	.get(
		"/attendance/:imatMeetingId(\\d+)/summary",
		getMeetingAttendanceSummary
	);

export default router;
