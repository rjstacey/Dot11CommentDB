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
import { isPlainObject } from '../utils';
import {
	getMeetings,
	updateMeetings,
	addMeetings,
	deleteMeetings,
} from '../services/meetings';

const router = Router();

router.get('/$', async (req, res, next) => {
	try {
		const data = await getMeetings(req.query);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/$', async (req, res, next) => {
	try {
		const meetings = req.body;
		if (!Array.isArray(meetings))
			throw new TypeError('Bad or missing of meeting objects');
		if (!meetings.every(meeting => isPlainObject(meeting)))
			throw new TypeError('Expected an array of objects');
		const data = await addMeetings(req.user, meetings);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/$', async (req, res, next) => {
	try {
		const updates = req.body;
		if (!Array.isArray(updates))
			throw new TypeError('Bad or missing array of update objects');
		if (!updates.every(u => isPlainObject(u) && typeof u.id === 'number' && isPlainObject(u.changes)))
			throw new TypeError('Expected array of objects to have shape {id, changes}');
		const data = await updateMeetings(req.user, updates);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/$', async (req, res, next) => {
	try {
		const ids = req.body;
		if (!Array.isArray(ids))
			throw new TypeError('Bad or missing array of meeting identifiers');
		if (!ids.every(id => typeof id === 'number'))
			throw new TypeError('Expected an array of numbers');
		const data = await deleteMeetings(req.user, ids);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
