/*
 * Sessions API
 *
 * Maintain sessions list.
 * 
 * GET /sessions: return the complete list of sessions.
 * PATCH /session/{id}: update the identified session and returns the updated field values.
 * POST /session: add a session and returns the complete entry as added.
 * DELETE /sessions: delete sessions identified by a list of IDs. Returns null.
 * GET /session/{id}/breakouts: get list of breakouts for a session.
 * GET /session/{id}/breakout/{breakout_id}/attendees: get list of attendess for a specific breakout.
 * GET /session/{id}/attendees: get a list of attendees for a session.
 * POST /session/{id}/breakouts/import: import from IMAT the breakouts for a session.
 * POST /session/{id}/attendance_summary/import: import from IMAT the attendance summary for a session.
 * PATCH /session/{id}/attendance_summary: update attendance summary
 */
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

const router = require('express').Router();

router.get('/$', async (req, res, next) => {
	try {
		const data = await getSessions();
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/:id(\\d+)$', async (req, res, next) => {
	try {
		const id = parseInt(req.params.id, 10);
		const session = req.body;
		if (typeof session !== 'object')
			throw 'Missing or bad body; expected object';
		const data = await updateSession(id, session);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/$', async (req, res, next) => {
	try {
		const session = req.body;
		if (typeof session !== 'object')
			throw 'Missing or bad body; expected object';
		const data = await addSession(session);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/$', async (req, res, next) => {
	try {
		const ids = req.body;
		if (!Array.isArray(ids))
			throw 'Missing or bad body; expected array';
		const data = await deleteSessions(ids);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/:id(\\d+)/breakouts', async (req, res, next) => {
	try {
		const {user} = req;
		let id = parseInt(req.params.id, 10);
		const data = await getBreakouts(id);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/:id(\\d+)/breakout/:breakout_id(\\d+)/attendees', async (req, res, next) => {
	try {
		const {user} = req;
		const session_id = parseInt(req.params.id, 10);
		const breakout_id = parseInt(req.params.breakout_id, 10);
		const data = await getBreakoutAttendees(user, session_id, breakout_id);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/:id(\\d+)/attendees', async (req, res, next) => {
	try {
		const {user} = req;
		const session_id = parseInt(req.params.id, 10);
		const data = await getSessionAttendees(session_id);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/:id(\\d+)/breakouts/import', async (req, res, next) => {
	try {
		const {user} = req;
		let id = parseInt(req.params.id, 10);
		const data = await importBreakouts(user, id);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/attendance_summaries', async (req, res, next) => {
	try {
		const {ids, attendances} = req.body;
		if (!Array.isArray(ids) || typeof attendances !== 'object')
			throw 'Missing or bad body; expected {ids: [], attendances: {}}';
		const data = await upsertMemberAttendanceSummaries(ids, attendances);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/:id(\\d+)/attendance_summary/import', async (req, res, next) => {
	try {
		const {user} = req;
		let id = parseInt(req.params.id, 10);
		const data = await importAttendances(user, id);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
