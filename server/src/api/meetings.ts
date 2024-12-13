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
	meetingsQuerySchema,
} from "@schemas/meetings";

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	try {
		const { group } = req;
		if (!group) throw new Error("Group not set");

		const access = group.permissions.meetings || AccessLevel.none;
		const grant =
			(req.method === "GET" && access >= AccessLevel.ro) ||
			(req.method === "PATCH" && access >= AccessLevel.rw) ||
			((req.method === "DELETE" || req.method === "POST") &&
				access >= AccessLevel.admin);

		if (grant) return next();
		throw new ForbiddenError();
	} catch (error) {
		next(error);
	}
}

async function get(req: Request, res: Response, next: NextFunction) {
	const groupId = req.group!.id;
	try {
		let query = meetingsQuerySchema.parse(req.query);
		query = { ...query, groupId };
		const data = await getMeetings(req.user, query);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function addMany(req: Request, res: Response, next: NextFunction) {
	try {
		const meetings = meetingCreatesSchema.parse(req.body);
		const data = await addMeetings(req.user, meetings);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function updateMany(req: Request, res: Response, next: NextFunction) {
	try {
		const updates = meetingUpdatesSchema.parse(req.body);
		const data = await updateMeetings(req.user, updates);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function removeMany(req: Request, res: Response, next: NextFunction) {
	let ids: number[];
	try {
		const ids = meetingIdsSchema.parse(req.body);
		const data = await deleteMeetings(req.user, ids);
		res.json(data);
	} catch (error) {
		next(error);
	}
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
