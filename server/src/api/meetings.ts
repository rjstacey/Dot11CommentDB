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
import { Router } from 'express';
import { AccessLevel } from '../auth/access';
import { ForbiddenError } from '../utils';
import {
	getMeetings,
	updateMeetings,
	addMeetings,
	deleteMeetings,
	validateMeetings,
	validateMeetingUpdates,
	validateMeetingIds,
} from '../services/meetings';

const router = Router();

router
	.all('*', (req, res, next) => {
		const {user, group} = req;
		if (!group)
			return next(new Error("Group not set"));

		const access = Math.max(group.permissions.meetings || AccessLevel.none, user.Access);

		if (req.method === "GET" && access >= AccessLevel.ro)
			return next();
		if (req.method === "PATCH" && access >= AccessLevel.rw)
			return next();
		if ((req.method === "DELETE" || req.method === "POST") && access >= AccessLevel.admin)
			return next();
		
		next(new ForbiddenError("Insufficient karma"));
	})
	.route('/')
		.get((req, res, next) => {
			const group = req.group!;
			getMeetings({groupId: group.id, ...req.query})
				.then(data => res.json(data))
				.catch(next);
		})
		.post((req, res, next) => {
			const meetings = req.body;
			try {validateMeetings(meetings)}
			catch (error) {
				return next(error);
			}
			addMeetings(req.user, meetings)
				.then(data => res.json(data))
				.catch(next);
		})
		.patch((req, res, next) => {
			const updates = req.body;
			try {validateMeetingUpdates(updates)}
			catch (error) {
				return next(error);
			}
			updateMeetings(req.user, updates)
				.then(data => res.json(data))
				.catch(next);
		})
		.delete((req, res, next) => {
			const ids = req.body;
			try {validateMeetingIds(ids)}
			catch (error) {
				return next(error);
			}
			deleteMeetings(req.user, ids)
				.then(data => res.json(data))
				.catch(next);
		});

export default router;
