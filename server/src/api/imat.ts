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
import {Router} from 'express';

import {isPlainObject} from '../utils';
import {
	getImatCommittees,
	getImatMeetings,
	getImatBreakouts,
	addImatBreakouts,
	updateImatBreakouts,
	deleteImatBreakouts,
	getImatBreakoutAttendance
} from '../services/imat';

const router = Router();

router.get('/committees/:group', async (req, res, next) => {
	try {
		const {group} = req.params;
		const data = await getImatCommittees(req.user, group);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/meetings$', async (req, res, next) => {
	try {
		const data = await getImatMeetings(req.user);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/breakouts/:imatMeetingId(\\d+)', async (req, res, next) => {
	try {
		const imatMeetingId = parseInt(req.params.imatMeetingId);
		const data = await getImatBreakouts(req.user, imatMeetingId);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/breakouts/:imatMeetingId(\\d+)', async (req, res, next) => {
	try {
		const imatMeetingId = parseInt(req.params.imatMeetingId);
		const breakouts = req.body;
		if (!Array.isArray(breakouts))
			throw new TypeError('Bad or missing body; expected array of breakouts');
		const data = await addImatBreakouts(req.user, imatMeetingId, breakouts);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.put('/breakouts/:imatMeetingId(\\d+)', async (req, res, next) => {
	try {
		const imatMeetingId = parseInt(req.params.imatMeetingId);
		const breakouts = req.body;
		if (!Array.isArray(breakouts))
			throw new TypeError('Bad or missing body; expected array of breakouts');
		const data = await updateImatBreakouts(req.user, imatMeetingId, breakouts);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/breakouts/:imatMeetingId(\\d+)', async (req, res, next) => {
	try {
		const imatMeetingId = parseInt(req.params.imatMeetingId);
		const ids = req.body;
		if (!Array.isArray(ids))
			throw new TypeError('Bad or missing body; expected array of breakout IDs');
		const data = await deleteImatBreakouts(req.user, imatMeetingId, ids);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/attendance/:imatMeetingId(\\d+)/:imatBreakoutId(\\d+)', async (req, res, next) => {
	try {
		const imatMeetingId = parseInt(req.params.imatMeetingId);
		const imatBreakoutId = parseInt(req.params.imatBreakoutId);
		const data = await getImatBreakoutAttendance(req.user, imatMeetingId, imatBreakoutId);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
