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
import { Router } from 'express';
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
	validateImatBreakouts,
	validateImatBreakoutUpdates,
	validateImatBreakoutIds
} from '../services/imat';

const router = Router();

router
	.get('/committees', (req, res, next) => {
		getImatCommittees(req.user, req.group!)
			.then(data => res.json(data))
			.catch(next);
	})
	.get('/meetings', (req, res, next) => {
		getImatMeetings(req.user)
			.then(data => res.json(data))
			.catch(next);
	})
	.route('/breakouts/:imatMeetingId(\\d+)')
		.get((req, res, next) => {
			const imatMeetingId = Number(req.params.imatMeetingId);
			getImatBreakouts(req.user, imatMeetingId)
				.then(data => res.json(data))
				.catch(next);
		})
		.post((req, res, next) => {
			const imatMeetingId = Number(req.params.imatMeetingId);
			const breakouts = req.body;
			try {validateImatBreakouts(breakouts)}
			catch (error) {
				return next(error);
			}
			addImatBreakouts(req.user, imatMeetingId, breakouts)
				.then(data => res.json(data))
				.catch(next);
		})
		.put(async (req, res, next) => {
			const imatMeetingId = Number(req.params.imatMeetingId);
			const breakouts = req.body;
			try {validateImatBreakoutUpdates(breakouts)}
			catch (error) {
				return next(error);
			}
			updateImatBreakouts(req.user, imatMeetingId, breakouts)
				.then(data => res.json(data))
				.catch(next);
		})
		.delete(async (req, res, next) => {
			const imatMeetingId = Number(req.params.imatMeetingId);
			const ids = req.body;
			try {validateImatBreakoutIds(ids)}
			catch (error) {
				return next(error)
			}
			deleteImatBreakouts(req.user, imatMeetingId, ids)
				.then(data => res.json(data))
				.catch(next);
		});

router
	.get('/attendance/:imatMeetingId(\\d+)$', (req, res, next) => {
		const imatMeetingId = Number(req.params.imatMeetingId);
		getImatMeetingAttendance(req.user, imatMeetingId)
			.then(data => res.json(data))
			.catch(next);
	})
	.get('/attendance/:imatMeetingId(\\d+)/:imatBreakoutId(\\d+)', async (req, res, next) => {
		const imatMeetingId = Number(req.params.imatMeetingId);
		const imatBreakoutId = Number(req.params.imatBreakoutId);
		getImatBreakoutAttendance(req.user, imatMeetingId, imatBreakoutId)
			.then(data => res.json(data))
			.catch(next);
	})
	.get('/dailyAttendance/:imatMeetingId(\\d+)', async (req, res, next) => {
		const imatMeetingId = Number(req.params.imatMeetingId);
		getImatMeetingDailyAttendance(req.user, imatMeetingId)
			.then(data => res.json(data))
			.catch(next);
	});

export default router;
