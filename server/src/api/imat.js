/*
 * IMAT API
 * (IEEE SA attendance system)
 *
 * GET /imat/committees/{group}
 *		Get committees for a specified group.
 *		Returns an array of committee objects.
 *
 * GET /imat/meetings
 *		Get sessions (IMAT meetings).
 *		Returns an array of IMAT meeting objects.
 *
 * GET /imat/breakouts/{imatMeetingId}
 *		Get breakouts, timeslots and committees for the session (IMAT meeting) identified by the imatMeetingId parameter.
 *		Returns an object with shape {imatMeeting{}, breakouts[], timeouts[], committees[]}, where imatMeeting is an object with 
 *		session (IMAT meeting) information, breakouts is an array of breakout objects, timeslots is an array of timeslot objects
 *		and committees is an array of committee objects.
 *
 * POST /imat/breakouts/{imatMeetingId}
 *		Add breakouts to the session (IMAT meeting) identified by the imatMeetingId parameter.
 *		Returns an array of breakout objects as added.
 *
 * PUT /imat/breakouts/{imatMeetingId}
 *		Update breakouts for the session (IMAT meeting) identified by the imatMeetingId parameter.
 *		The body contains an array of breakout objects.
 *		Returns an array of breakout objects as updated.
 *
 * DELETE /imat/breakouts/{imatMeetingId}
 *		Delete breakouts from the session (IMAT meeting) identified by the imatMeetingId parameter
 *		The body contains an array of breakout IDs.
 *		Returns the number of breakouts deleted.
 *
 * GET /imat/attendance/{imatMeetingId}/{imatBreakoutId}
 *		Get a list of attendees for a specified breakout.
 *		Returns an array of attendance objects (user info with timestamp).
 */

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

const router = require('express').Router();

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
