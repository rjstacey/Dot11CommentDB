/*
 * Sessions API
 *
 * GET /
 *		Get sessions.
 *		Return and array of session objects.
 *
 * POST /
 *		Add a session.
 *		Body is the session object to be added.
 *		Returns the session object as added.
 *
 * PATCH /{id}
 * 		Update a session.
 *		URL parameters:
 *			id:any 		Identifies the session
 *		Body is an object with the session parameters to change.
 *		Returns the session object as updated.
 *
 * DELETE /
 *		Delete sessions.
 *		Body contains an array of session identifiers.
 *		Returns the number of sessions deleted.
 *
 * GET /session/{id}/breakouts: get list of breakouts for a session.
 * GET /session/{id}/breakout/{breakout_id}/attendees: get list of attendess for a specific breakout.
 * GET /session/{id}/attendees: get a list of attendees for a session.
 * POST /session/{id}/breakouts/import: import from IMAT the breakouts for a session.
 * POST /session/{id}/attendance_summary/import: import from IMAT the attendance summary for a session.
 * PATCH /session/{id}/attendance_summary: update attendance summary
 */
import {Router} from 'express';

import {isPlainObject} from '../utils';
import {
	getSessions,
	updateSession,
	addSession,
	deleteSessions,
	importBreakouts,
	importAttendances,
	upsertMemberAttendanceSummaries,
	getBreakouts,
	getBreakoutAttendees,
	getSessionAttendees
} from '../services/sessions';

const router = Router();

router
	.route('/')
		.get((req, res, next) => {
			getSessions()
				.then(data => res.json(data))
				.catch(next);
		})
		.post((req, res, next) => {
			const session = req.body;
			if (!isPlainObject(session))
				return next(new TypeError('Bad or missing body; expected object'));
			addSession(session)
				.then(data => res.json(data))
				.catch(next);
		})
		.patch(async (req, res, next) => {
			if (!isPlainObject(req.body))
				return next(new TypeError("Bad or missing session object"));
			const {id, changes} = req.body;
			if (typeof id !== 'number' || !isPlainObject(changes))
				return next(new TypeError("Bad body; expected update object with shape {id, changes}"))
			updateSession(id, changes)
				.then(data => res.json(data))
				.catch(next);
		})
		.delete((req, res, next) => {
			const ids = req.body;
			if (!Array.isArray(ids))
				return next(new TypeError('Bad or missing array of session identifiers'));
			if (!ids.every(id => typeof id === 'number'))
				return next(new TypeError('Expected an array of numbers'));
			deleteSessions(ids)
				.then(data => res.json(data))
				.catch(next)
		});
	
router


router.get('/:id(\\d+)/breakouts', async (req, res, next) => {
	try {
		const {user} = req;
		let id = parseInt(req.params.id);
		const data = await getBreakouts(id);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/:id(\\d+)/breakout/:breakout_id(\\d+)/attendees', async (req, res, next) => {
	try {
		const {user} = req;
		const session_id = parseInt(req.params.id);
		const breakout_id = parseInt(req.params.breakout_id, 10);
		const data = await getBreakoutAttendees(user, session_id, breakout_id);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/:id(\\d+)/attendees', async (req, res, next) => {
	try {
		const {user} = req;
		const session_id = parseInt(req.params.id);
		const data = await getSessionAttendees(session_id);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/:id(\\d+)/breakouts/import', async (req, res, next) => {
	try {
		const {user} = req;
		let id = parseInt(req.params.id);
		const data = await importBreakouts(user, id);
		res.json(data);
	}
	catch(err) {next(err)}
});

/*
There is an error here: ids is an array but function accepts number
router.patch('/attendance_summaries', async (req, res, next) => {
	try {
		const {ids, attendances} = req.body;
		if (!Array.isArray(ids) || typeof attendances !== 'object')
			throw new TypeError('Missing or bad body; expected {ids: [], attendances: {}}');
		const data = await upsertMemberAttendanceSummaries(ids, attendances);
		res.json(data);
	}
	catch(err) {next(err)}
});
*/

router.post('/:id(\\d+)/attendance_summary/import', async (req, res, next) => {
	try {
		const {user} = req;
		let id = parseInt(req.params.id);
		const data = await importAttendances(user, id);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
