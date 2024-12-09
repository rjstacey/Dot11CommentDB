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
	BreakoutCreate,
	BreakoutUpdate,
	breakoutCreatesSchema,
	breakoutIdsSchema,
	breakoutUpdatesSchema,
} from "@schemas/imat";

function getCommittees(req: Request, res: Response, next: NextFunction) {
	getImatCommittees(req.user, req.group!)
		.then((data) => res.json(data))
		.catch(next);
}

function getMeetings(req: Request, res: Response, next: NextFunction) {
	getImatMeetings(req.user)
		.then((data) => res.json(data))
		.catch(next);
}

function getBreakouts(req: Request, res: Response, next: NextFunction) {
	const imatMeetingId = Number(req.params.imatMeetingId);
	getImatBreakouts(req.user, imatMeetingId)
		.then((data) => res.json(data))
		.catch(next);
}

function addBreakouts(req: Request, res: Response, next: NextFunction) {
	const imatMeetingId = Number(req.params.imatMeetingId);
	let breakouts: BreakoutCreate[];
	try {
		breakouts = breakoutCreatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	addImatBreakouts(req.user, imatMeetingId, breakouts)
		.then((data) => res.json(data))
		.catch(next);
}

function updateBreakouts(req: Request, res: Response, next: NextFunction) {
	const imatMeetingId = Number(req.params.imatMeetingId);
	let breakouts: BreakoutUpdate[];
	try {
		breakouts = breakoutUpdatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	updateImatBreakouts(req.user, imatMeetingId, breakouts)
		.then((data) => res.json(data))
		.catch(next);
}

function removeBreakouts(req: Request, res: Response, next: NextFunction) {
	const imatMeetingId = Number(req.params.imatMeetingId);
	let ids: number[];
	try {
		ids = breakoutIdsSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	deleteImatBreakouts(req.user, imatMeetingId, ids)
		.then((data) => res.json(data))
		.catch(next);
}

function getMeetingAttendance(req: Request, res: Response, next: NextFunction) {
	const imatMeetingId = Number(req.params.imatMeetingId);
	getImatMeetingAttendance(req.user, imatMeetingId)
		.then((data) => res.json(data))
		.catch(next);
}

async function getMeetingAttendanceSummary(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const imatMeetingId = Number(req.params.imatMeetingId);
		const useDaily = req.query.useDaily !== "false";
		const getAttendance = useDaily
			? getImatMeetingDailyAttendance
			: getImatMeetingAttendanceSummary;
		const data = await getAttendance(req.user, req.group!, imatMeetingId);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

function getBreakoutAttendance(
	req: Request,
	res: Response,
	next: NextFunction
) {
	const imatMeetingId = Number(req.params.imatMeetingId);
	const imatBreakoutId = Number(req.params.imatBreakoutId);
	getImatBreakoutAttendance(req.user, imatMeetingId, imatBreakoutId)
		.then((data) => res.json(data))
		.catch(next);
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
