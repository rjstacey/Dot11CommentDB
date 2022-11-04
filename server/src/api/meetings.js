/*
 * Meetings API
 *
 * GET /meetings?constraints
 *		Get a list of meetings, optionally satisfying certain constraints (e.g., groupId, toDate, fromDate, id).
 *		Returns at object {meetings[], webexMeetings[]}, where meetings is an array of meetings that meet the constraints and
 *		webexMeetings is an array of Webex meetings associated with the meetings.
 *
 * POST /meetings (meetings[])
 *		Add a meetings
 *		Returns an object {meetings[], webexMeetings[]}, where meetings is an array of meetings added and webexMeetings is the the associated Webex meetings.
 *
 * PATCH /meetings (updates[])
 *		Update meetings. The body contains an array of updates with shape {id, changes}, where id identifies the meeting and changes is an object
 *		with parameters changes.
 *		Returns an object {meetings[], webexMeetings[]},
 * 
 * DELETE /meetings (ids[])
 *		Delete meetings. The body contains an array of meeting IDs.
 *		Returns the number of meetings deleted.
 */

import {
	getMeetings,
	updateMeetings,
	addMeetings,
	deleteMeetings,
} from '../services/meetings';

const router = require('express').Router();

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
			throw 'Missing or bad body; expected array';
		const data = await addMeetings(req.user, meetings);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/$', async (req, res, next) => {
	try {
		const updates = req.body;
		if (!Array.isArray(updates))
			throw 'Missing or bad body; expected array';
		const data = await updateMeetings(req.user, updates);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/$', async (req, res, next) => {
	try {
		const ids = req.body;
		if (!Array.isArray(ids))
			throw 'Missing or bad body; expected array';
		const data = await deleteMeetings(req.user, ids);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
