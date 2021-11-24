/*
 * 802 tools server API
 *
 * Robert Stacey
 */

import {AccessLevel} from '../auth/access';
import {authorize} from '../auth/jwt'

const upload = require('multer')();
const router = require('express').Router();

/*
 * The open part of the API is satisfied here
 */
router.use('/timezones', require('./timezones').default);

/*
 * The remainder of the API requires an authorized user
 *
 * Authorize access to the API
 * Successful authorization leaves authorized user's context in req (in req.user)
 */
router.use(authorize);

/*
 * Enforce access levels
 *
 * Default is to deny access (status(403) at end of routine) unless permission is explicitly granted
 * through one the "return next()" statements.
 */
router.all('*', (req, res, next) => {
	const access = req.user.Access;

	switch (req.method) {
	case 'GET': /* read */
		/* public has read access to ballots, comments, resolutions and timeZones */
		if (req.path.match(/^\/ballot|^\/votingPools|^\/comment|^\/resolution|^\/timeZones/i))
			return next();
		/* members have read access to users */
		if (req.path.match(/^\/users/i) && access >= AccessLevel.Member)
			return next();
		/* subgroup admins have read access to results */
		if (req.path.match(/^\/result/i) && access >= AccessLevel.SubgroupAdmin)
			return next();
		/* subgroup admins have read access to telecons */
		if (req.path.match(/^\/telecons/i) && access >= AccessLevel.SubgroupAdmin)
			return next();
		break;

	case 'POST': /* add */
	case 'DELETE': /* delete */
		if (req.path.match(/^\/comment|^\/resolution/i) && access >= AccessLevel.SubgroupAdmin)
			return next();
		if (req.path.match(/^\/ballot/i) && access >= AccessLevel.WGAdmin)
			return next();
		/* subgroup admins have create/delete access to telecons */
		if (req.path.match(/^\/telecons/i) && access >= AccessLevel.SubgroupAdmin)
			return next();
		break;

	case 'PUT':
	case 'PATCH': /* modify existing */
		if (req.path.match(/^\/resolution/i) && access >= AccessLevel.Member)
			return next();
		if (req.path.match(/^\/comment/i) && access >= AccessLevel.SubgroupAdmin)
			return next();
		if (req.path.match(/^\/ballot/i) && access >= AccessLevel.WGAdmin)
			return next();
		/* subgroup admins have modify access to telecons */
		if (req.path.match(/^\/telecons/i) && access >= AccessLevel.SubgroupAdmin)
			return next();
		break;
	}

	/* WG admin can do anything */
	if (access === AccessLevel.WGAdmin)
		return next();

	return res.status(403).send('Insufficient karma');
});

/* Webex accounts API */
router.use('/webex', require('./webexAccounts').default);

/* Google calendar accounts API */
router.use('/calendar', require('./calendarAccounts').default);

/* Telecons API */
router.use('/telecons', require('./telecons').default);

/* Voting pools API */
router.use('/votingPools', require('./votingPools').default);

/* Voters API */
router.use('/voters', require('./voters').default);

/* Ballot API */
router.use('/ballots', require('./ballots').default);

/* ePolls API */
router.use('/epolls', require('./epolls').default);

/* Ballot results API */
router.use('/results', require('./results').default);

/* Ballot comments API */
router.use('/comments', require('./comments').default);

/* Comment resolutions API */
router.use('/resolutions', require('./resolutions').default);

/* Comment history API */
router.use('/commentHistory', require('./commentHistory').default);

/*
 * Members API
 *
 * Maintain the members roster.
 * 
 * GET /users: returns the complete array of user entries in the database.
 * PUT /user/{userId}: updates entry for a specific user ID. Returns the complete entry for the updated user.
 * POST /user: adds a user to the database. Returns the complete entry for the user added.
 * DELETE /users: deletes users from list of user IDs. Returns null.
 * POST /users/upload: insert users from file. Returns the complete array of user entries in the database.
 * POST /users: insert or update users. Returns the complete entry for the user added.
 */
import {
	getUsers,
	getMembersWithParticipation,
	getMembersSnapshot,
	updateMember,
	updateMembers,
	updateMemberStatusChange,
	deleteMemberStatusChange,
	addMemberContactEmail,
	updateMemberContactEmail,
	deleteMemberContactEmail,
	addMember,
	upsertMembers,
	deleteMembers,
	uploadMembers,
	importMyProjectRoster,
	exportMyProjectRoster
} from '../services/members';

router.get('/users$', async (req, res, next) => {
	try {
		const {user} = req;
		const data = await getUsers(user);
		res.json(data);
	}
	catch(err) {next(err)}
});
router.get('/members$', async (req, res, next) => {
	try {
		const data = await getMembersWithParticipation();
		res.json(data);
	}
	catch(err) {next(err)}
});
router.get('/members/snapshot$', async (req, res, next) => {
	try {
		const {date} = req.body;
		const data = await getMembersSnapshot(date);
		res.json(data);
	}
	catch(err) {next(err)}
});
router.patch('/member/:id(\\d+)$', async (req, res, next) => {
	try {
		const {id} = req.params;
		const member = req.body;
		if (typeof member !== 'object')
			throw 'Bad or missing member object';
		const data = await updateMember(id, member);
		res.json(data);
	}
	catch(err) {next(err)}
});
router.patch('/member/:id(\\d+)/StatusChangeHistory', async (req, res, next) => {
	try {
		const {id} = req.params;
		const statusChangeEntry = req.body;
		if (typeof statusChangeEntry !== 'object')
			throw 'Missing or bad StatusChangeHistory row object';
		const data = await updateMemberStatusChange(id, statusChangeEntry);
		res.json(data);
	}
	catch(err) {next(err)}
});
router.delete('/member/:id(\\d+)/StatusChangeHistory', async (req, res, next) => {
	try {
		const {id} = req.params;
		const statusChangeEntry = req.body;
		if (typeof statusChangeEntry !== 'object')
			throw 'Missing or bad StatusChangeHistory row object';
		const data = await deleteMemberStatusChange(id, statusChangeEntry.id);
		res.json(data);
	}
	catch(err) {next(err)}
});
router.patch('/member/:id(\\d+)/ContactEmails', async (req, res, next) => {
	try {
		const {id} = req.params;
		const entry = req.body;
		if (typeof entry !== 'object')
			throw 'Missing or bad ContactEmails row object';
		const data = await updateMemberContactEmail(id, entry);
		res.json(data);
	}
	catch(err) {next(err)}
});
router.post('/member/:id(\\d+)/ContactEmails', async (req, res, next) => {
	try {
		const {id} = req.params;
		const entry = req.body;
		if (typeof entry !== 'object')
			throw 'Missing or bad ContactEmails row object';
		const data = await addMemberContactEmail(id, entry);
		res.json(data);
	}
	catch(err) {next(err)}
});
router.delete('/member/:id(\\d+)/ContactEmails', async (req, res, next) => {
	try {
		const {id} = req.params;
		const entry = req.body;
		if (typeof entry !== 'object')
			throw 'Missing or bad ContactEmails row object';
		const data = await deleteMemberContactEmail(id, entry);
		res.json(data);
	}
	catch(err) {next(err)}
});
router.patch('/members$', async (req, res, next) => {
	try {
		const {id} = req.params;
		const members = req.body;
		if (!Array.isArray(members))
			throw 'Bad or missing members array';
		const data = await updateMembers(members);
		res.json(data);
	}
	catch(err) {next(err)}
});
router.post('/member', async (req, res, next) => {
	try {
		const {member} = req.body;
		if (!member)
			throw 'Missing member parameter';
		const data = await addMember(member);
		res.json(data);
	}
	catch(err) {next(err)}
});
router.delete('/members', async (req, res, next) => {
	try {
		const ids = req.body;
		if (!Array.isArray(ids))
			throw 'Missing or bad array parameter';
		const data = await deleteMembers(ids);
		res.json(data);
	}
	catch(err) {next(err)}
});
router.post('/members/upload/:format', upload.single('File'), async (req, res, next) => {
	try {
		const {user} = req;
		const {format} = req.params;
		if (!req.file)
			throw 'Missing file';
		const data = await uploadMembers(format, req.file)
		res.json(data)
	}
	catch(err) {next(err)}
});
router.post('/members/MyProjectRoster$', upload.single('File'), async (req, res, next) => {
	try {
		if (!req.file)
			throw 'Missing file';
		const data = await importMyProjectRoster(req.file);
		res.json(data);
	}
	catch(err) {next(err)}
});
router.get('/members/MyProjectRoster$', async (req, res, next) => {
	try {
		exportMyProjectRoster(res);
	}
	catch(err) {next(err)}
});
router.post('/members$', async (req, res, next) => {
	try {
		const {members} = req.body;
		if (!members)
			throw 'Missing or bad members parameter';
		const data = await upsertMembers(members);
		res.json(data);
	}
	catch(err) {next(err)}
});

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
 * GET /imat/meetings: get a list of meetings from IMAT
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

import {getImatMeetings} from '../services/imat';

router.get('/sessions', async (req, res, next) => {
	try {
		const data = await getSessions();
		res.json(data);
	}
	catch(err) {next(err)}
});
router.patch('/session/:id(\\d+)', async (req, res, next) => {
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
router.post('/session', async (req, res, next) => {
	try {
		const session = req.body;
		if (typeof session !== 'object')
			throw 'Missing or bad body; expected object';
		const data = await addSession(session);
		res.json(data);
	}
	catch(err) {next(err)}
});
router.delete('/sessions', async (req, res, next) => {
	try {
		const ids = req.body;
		if (!Array.isArray(ids))
			throw 'Missing or bad body; expected array';
		const data = await deleteSessions(ids);
		res.json(data);
	}
	catch(err) {next(err)}
});
router.get('/session/:id(\\d+)/breakouts', async (req, res, next) => {
	try {
		const {user} = req;
		let id = parseInt(req.params.id, 10);
		const data = await getBreakouts(id);
		res.json(data);
	}
	catch(err) {next(err)}
});
router.get('/session/:id(\\d+)/breakout/:breakout_id(\\d+)/attendees', async (req, res, next) => {
	try {
		const {user} = req;
		const session_id = parseInt(req.params.id, 10);
		const breakout_id = parseInt(req.params.breakout_id, 10);
		const data = await getBreakoutAttendees(user, session_id, breakout_id);
		res.json(data);
	}
	catch(err) {next(err)}
});
router.get('/session/:id(\\d+)/attendees', async (req, res, next) => {
	try {
		const {user} = req;
		const session_id = parseInt(req.params.id, 10);
		const data = await getSessionAttendees(session_id);
		res.json(data);
	}
	catch(err) {next(err)}
});
router.post('/session/:id(\\d+)/breakouts/import', async (req, res, next) => {
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
router.post('/session/:id(\\d+)/attendance_summary/import', async (req, res, next) => {
	try {
		const {user} = req;
		let id = parseInt(req.params.id, 10);
		const data = await importAttendances(user, id);
		res.json(data);
	}
	catch(err) {next(err)}
});
router.get('/imat/meetings', async (req, res, next) => {
	try {
		const {user} = req;
		const n = req.query.hasOwnProperty('n')? parseInt(req.query.n): 10;
		const data = await getImatMeetings(user, n);
		res.json(data);
	}
	catch(err) {next(err)}
});


export default router;
