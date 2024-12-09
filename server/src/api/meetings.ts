/*
 * Meetings API
 *
 * GET /
 *		Get a list of meetings that meet an optionally specified set of constraints (e.g., groupId, toDate, fromDate, id).
 *		Query parameters:
 *			groupId:any 		Identifies the parent group for the meetings
 *			fromDate:string 	An ISO date string that is the earliest meeting date
 *			toDate:string 		An IDO date string that is the latest meeting date
 *			id:string or array 	A meeting identifier or array of meeting identifiers
 *		Returns an object with parameters:
 *			meetings:array		An array of meetings that meet the constraints
 *			webexMeetings:array	An array of Webex meetings associated with the meetings
 *
 * POST /
 *		Add meetings
 *		Body is an array of objects that are the meetings to add
 *		Returns an object with parameters:
 *			meetings:array 		An array of objects that are the meetings as added
 *			webexMeetings:array An array of Webex meeting objects associated with the meetings added
 *
 * PATCH /
 *		Update meetings.
 *		Body is an array of objects with shape {id, changes}, where id identifies the meeting and changes is an object
 *		with parameters that change.
 *		Returns an object with parameters:
 *			meetings:array 		An array of objects that are the updated meetings
 *			webexMeetings:array An array of Webex meeting objects associated with the updated meetings
 *
 * DELETE /
 *		Delete meetings.
 *		Body is an array of meeting IDs.
 *		Returns the number of meetings deleted.
 */
import { Request, Response, NextFunction, Router } from "express";
import { AccessLevel } from "../auth/access";
import { ForbiddenError } from "../utils";
import {
	getMeetings,
	updateMeetings,
	addMeetings,
	deleteMeetings,
} from "../services/meetings";
import {
	MeetingCreate,
	MeetingUpdate,
	meetingCreatesSchema,
	meetingUpdatesSchema,
	meetingIdsSchema,
} from "@schemas/meetings";

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	const { group } = req;
	if (!group) return next(new Error("Group not set"));

	const access = group.permissions.meetings || AccessLevel.none;

	if (req.method === "GET" && access >= AccessLevel.ro) return next();
	if (req.method === "PATCH" && access >= AccessLevel.rw) return next();
	if (
		(req.method === "DELETE" || req.method === "POST") &&
		access >= AccessLevel.admin
	)
		return next();

	next(new ForbiddenError("Insufficient karma"));
}

function get(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	getMeetings(req.user, { groupId: group.id, ...req.query })
		.then((data) => res.json(data))
		.catch(next);
}

function addMany(req: Request, res: Response, next: NextFunction) {
	let meetings: MeetingCreate[];
	try {
		meetings = meetingCreatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	addMeetings(req.user, meetings)
		.then((data) => res.json(data))
		.catch(next);
}

function updateMany(req: Request, res: Response, next: NextFunction) {
	let updates: MeetingUpdate[];
	try {
		updates = meetingUpdatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	updateMeetings(req.user, updates)
		.then((data) => res.json(data))
		.catch(next);
}

function removeMany(req: Request, res: Response, next: NextFunction) {
	let ids: number[];
	try {
		ids = meetingIdsSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	deleteMeetings(req.user, ids)
		.then((data) => res.json(data))
		.catch(next);
}

const router = Router();
router
	.all("*", validatePermissions)
	.route("/")
	.get(get)
	.post(addMany)
	.patch(updateMany)
	.delete(removeMany);

export default router;
