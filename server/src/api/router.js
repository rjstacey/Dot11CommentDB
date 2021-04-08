/*
 * 802.11 comment database API
 *
 * Robert Stacey
 */

import {AccessLevel} from '../auth/access';
import {authorize} from '../auth/jwt'

const upload = require('multer')()
const router = require('express').Router()

/*
 * Authorize access to the API
 * Successful authorization leaves authorized user's data in req (in req.user)
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
		break;

	case 'POST': /* add */
	case 'DELETE': /* delete */
		if (req.path.match(/^\/comment|^\/resolution/i) && access >= AccessLevel.SubgroupAdmin)
			return next();
		if (req.path.match(/^\/ballot/i) && access >= AccessLevel.WGAdmin)
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
		break;
	}

	/* WG admin can do anything */
	if (access === AccessLevel.WGAdmin)
		return next();

	return res.status(403).send('Insufficient karma');
})

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
	getMembers,
	getMembersWithAttendance,
	updateMember,
	addMember,
	upsertMembers,
	deleteMembers,
	uploadMembers
} from '../services/members';

router.get('/users/attendance', async (req, res, next) => {
	try {
		const {user} = req;
		const data = await getMembersWithAttendance(user);
		res.json(data);
	}
	catch(err) {next(err)}
})
router.get('/users', async (req, res, next) => {
	try {
		const {user} = req;
		const data = await getMembers(user);
		res.json(data);
	}
	catch(err) {next(err)}
})
router.put('/user/:userId', async (req, res, next) => {
	try {
		const {userId} = req.params;
		const {user} = req.body;
		if (!user)
			throw 'Missing user parameter';
		const data = await updateMember(userId, user);
		res.json(data);
	}
	catch(err) {next(err)}
})
router.post('/user', async (req, res, next) => {
	try {
		const {user} = req.body;
		if (!user)
			throw 'Missing user parameter';
		const data = await addMember(user);
		res.json(data);
	}
	catch(err) {next(err)}
})
router.delete('/users', async (req, res, next) => {
	try {
		const ids = req.body;
		if (!ids || !Array.isArray(ids))
			throw 'Missing or bad users parameter';
		const data = await deleteMembers(ids);
		res.json(data);
	}
	catch(err) {next(err)}
})
router.post('/users/upload', upload.single('UsersFile'), async (req, res, next) => {
	try {
		if (!req.file)
			throw 'Missing file'
		const data = await uploadMembers(req.file)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.post('/users', async (req, res, next) => {
	try {
		const {users} = req.body;
		if (!users)
			throw 'Missing or bad users parameter';
		const data = await upsertMembers(users);
		res.json(data);
	}
	catch(err) {next(err)}
})

/*
 * Sessions API
 *
 * Maintain sessions list.
 * 
 * GET /sessions: returns the complete list of sessions.
 * PUT /session/{id}: updates the identified session. Returns the updated field values.
 * POST /session: add a session. Returns the complete entry as added.
 * DELETE /sessions: deletes sessions identified by a list of IDs. Returns null.
 */
import {
	getSessions,
	updateSession,
	addSession,
	deleteSessions,
	getImatMeetings,
	getTimeZones,
	importBreakouts,
	getBreakouts,
	getBreakoutAttendees,
	getSessionAttendees
} from '../services/sessions';

router.get('/sessions', async (req, res, next) => {
	try {
		const data = await getSessions();
		res.json(data);
	}
	catch(err) {next(err)}
})
router.put('/session/:id(\\d+)', async (req, res, next) => {
	try {
		const id = parseInt(req.params.id, 10);
		const {meeting} = req.body;
		if (!meeting)
			throw 'Missing meeting parameter';
		const data = await updateSession(id, meeting);
		res.json(data);
	}
	catch(err) {next(err)}
})
router.post('/session', async (req, res, next) => {
	try {
		const {meeting} = req.body;
		if (!meeting)
			throw 'Missing meeting parameter';
		const data = await addSession(meeting);
		res.json(data);
	}
	catch(err) {next(err)}
})
router.delete('/sessions', async (req, res, next) => {
	try {
		const ids = req.body;
		if (!Array.isArray(ids))
			throw 'Missing or bad body; expected array';
		const data = await deleteSessions(ids);
		res.json(data);
	}
	catch(err) {next(err)}
})
router.get('/session/:id(\\d+)/breakouts', async (req, res, next) => {
	try {
		const {user} = req;
		let id = parseInt(req.params.id, 10);
		const data = await getBreakouts(id);
		res.json(data);
	}
	catch(err) {next(err)}
})
router.get('/session/:id(\\d+)/breakout/:breakout_id(\\d+)/attendees', async (req, res, next) => {
	try {
		const {user} = req;
		const session_id = parseInt(req.params.id, 10);
		const breakout_id = parseInt(req.params.breakout_id, 10);
		const data = await getBreakoutAttendees(user, session_id, breakout_id);
		res.json(data);
	}
	catch(err) {next(err)}
})
router.get('/session/:id(\\d+)/attendees', async (req, res, next) => {
	try {
		const {user} = req;
		const session_id = parseInt(req.params.id, 10);
		const data = await getSessionAttendees(session_id);
		res.json(data);
	}
	catch(err) {next(err)}
})
router.post('/session/:id(\\d+)/importBreakouts', async (req, res, next) => {
	try {
		const {user} = req;
		let id = parseInt(req.params.id, 10);
		const data = await importBreakouts(user, id);
		res.json(data);
	}
	catch(err) {next(err)}
})
router.get('/timeZones', async (req, res, next) => {
	try {
		const data = await getTimeZones();
		res.json(data);
	}
	catch(err) {next(err)}
})
router.get('/imat/meetings', async (req, res, next) => {
	try {
		const {user} = req;
		const n = req.query.hasOwnProperty('n')? parseInt(req.query.n): 10;
		const data = await getImatMeetings(user, n);
		res.json(data);
	}
	catch(err) {next(err)}
})
router.get('/breakouts/:meetingNumber', async (req, res, next) => {
	try {
		const {user} = req;
		let meetingNumber;
		try {
			meetingNumber = parseInt(req.params.meetingNumber, 10);
		}
		catch(err) {
			throw 'Missing or bad parameter meetingNumber';	
		}
		const data = await getBreakouts(user, meetingNumber);
		res.json(data);
	}
	catch(err) {next(err)}
})

/*
 * Ballot results API
 */
import {
	getResults,
	deleteResults,
	importEpollResults,
	uploadEpollResults,
	uploadMyProjectResults,
	exportResults
} from '../services/results';

router.get('/results/:ballotId', async (req, res, next) => {
	try {
		const {user} = req;
		const {ballotId} = req.params
		const data = await getResults(user, ballotId)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.get('/resultsExport', (req, res, next) => {
	try {
		const {user} = req;
		exportResults(user, req.query, res)
	}
	catch(err) {next(err)}
})
router.delete('/results/:ballotId', async (req, res, next) => {
	try {
		const {ballotId} = req.params
		const data = await deleteResults(ballotId)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.post('/results/importFromEpoll/:ballotId/:epollNum', async (req, res, next) => {
	try {
		const {user} = req;
		const {ballotId, epollNum} = req.params;
		const data = await importEpollResults(user.ieeeCookieJar, user, ballotId, epollNum);
		res.json(data)
	}
	catch(err) {next(err)}
})
router.post('/results/uploadEpollResults/:ballotId', upload.single('ResultsFile'), async (req, res, next) => {
	try {
		const {user} = req;
		const {ballotId} = req.params;
		if (!req.file)
			throw 'Missing file'
		const data = await uploadEpollResults(user, ballotId, req.file)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.post('/results/uploadMyProjectResults/:ballotId', upload.single('ResultsFile'), async (req, res, next) => {
	try {
		const {user} = req;
		const {ballotId} = req.params;
		if (!req.file)
			throw 'Missing file'
		const data = await uploadMyProjectResults(user, ballotId, req.file)
		res.json(data)
	}
	catch(err) {next(err)}
})


/*
* Ballots API
*
* GET /ballot/{ballotId} - return details on a specific ballot
* GET /ballots - return the complete list of ballots
* PUT /ballots - update select fields in ballot entries
* POST: /ballots - add ballot entries
* DELETE: /ballots - delete ballots
* GET: /epolls?{n}} - return a list of n epolls by scraping the mentor webpage for closed epolls.
*/
import {
	getBallot,
	getBallots,
	updateBallots,
	addBallots,
	deleteBallots,
	getEpolls
} from '../services/ballots';

router.get('/ballot/:ballotId', async (req, res, next) => {
	try {
		const {ballotId} = req.params
		const data = await getBallot(ballotId)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.get('/ballots', async (req, res, next) => {
	try {
		res.json(await getBallots())
	}
	catch(err) {next(err)}
})
router.put('/ballots', async (req, res, next) => {
	try {
		const {user} = req;
		const ballots = req.body;
		if (!Array.isArray(ballots))
			throw 'Expect an array of ballots'
		const data = await updateBallots(user, ballots)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.post('/ballots', async (req, res, next) => {
	try {
		const {user} = req;
		const ballots = req.body;
		if (!Array.isArray(ballots))
			throw 'Expect an array of ballots'
		const data = await addBallots(user, ballots)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.delete('/ballots', async (req, res, next) => {
	try {
		const {user} = req;
		const ballots = req.body
		if (!Array.isArray(ballots))
			throw 'Expected array of ballots'
		await deleteBallots(user, ballots)
		res.json(null)
	}
	catch(err) {next(err)}
})
router.get('/epolls', async (req, res, next) => {
	try {
		const {user} = req;
		const n = req.query.hasOwnProperty('n')? parseInt(req.query.n): 0
		const data = await getEpolls(user, n)
		res.json(data)
	}
	catch(err) {next(err)}
})


/*
* Ballot comments API
*
* GET /comments/{ballotId} - return an array with all comments for a given ballot
* PUT /comment/{ballotId}/{commentId} - update a comment; returns the updated comment
* DELETE /comments/{ballotId} - delete all comments for a given ballot
* POST /comments/importFromEpoll/{ballotId}/{epollNum} - replace existing comments (if any) with comments imported from an epoll on mentor
* POST /comments/upload/{ballotId}/{type} - import comments from a file; file format determined by type
* GET /exportComments/myProject - export resolved comments in a form suitable for MyProject upload
*/
import {
	getComments,
	updateComment,
	updateComments,
	setStartCommentId,
	deleteComments,
	importEpollComments,
	uploadComments,
} from '../services/comments'

router.get('/comments/:ballotId', async (req, res, next) => {
	try {
		const {ballotId} = req.params;
		const data = await getComments(ballotId);
		res.json(data);
	}
	catch(err) {next(err)}
})
router.put('/comments', async (req, res, next) => {
	try {
		if (!req.body.hasOwnProperty('comments'))
			throw 'Missing comments parameter';
		const {comments} = req.body;
		if (!Array.isArray(comments))
			throw 'Expect an array for comments parameter';
		const data = await updateComments(req.user.SAPIN, comments);
		res.json(data);
	}
	catch(err) {next(err)}
})
router.patch('/comments/startCommentId/:ballotId', async (req, res, next) => {
	try {
		const {ballotId} = req.params;
		const {StartCommentID} = req.body;
		const data = await setStartCommentId(req.user.SAPIN, ballotId, StartCommentID);
		res.json(data);
	}
	catch(err) {next(err)}
})
router.delete('/comments/:ballotId', async (req, res, next) => {
	try {
		const {ballotId} = req.params;
		const data = await deleteComments(req.user.SAPIN, ballotId);
		res.json(data);
	}
	catch (err) {next(err)}
})
router.post('/comments/importFromEpoll/:ballotId/:epollNum', async (req, res, next) => {
	try {
		const {user} = req;
		const {ballotId, epollNum} = req.params;
		const startCommentId = req.body.StartCID || 1;
		const data = await importEpollComments(user.ieeeCookieJar, user.SAPIN, ballotId, epollNum, startCommentId);
		res.json(data);
	}
	catch(err) {next(err)}
})
router.post('/comments/upload/:ballotId/:type', upload.single('CommentsFile'), async (req, res, next) => {
	try {
		const {ballotId} = req.params;
		const type = parseInt(req.params.type, 10);
		if (!req.file)
			throw 'Missing file';
		const startCommentId = req.body.StartCID || 1;
		const data = await uploadComments(req.user.SAPIN, ballotId, type, startCommentId, req.file);
		res.json(data);
	}
	catch(err) {next(err)}
})

import {
	addResolutions,
	updateResolutions,
	deleteResolutions,
	exportResolutionsForMyProject,
	exportSpreadsheet
} from '../services/resolutions'
import {uploadResolutions} from '../services/uploadResolutions'

router.post('/resolutions$', async (req, res, next) => {
	try {
		const {user} = req;
		if (!req.body.hasOwnProperty('resolutions'))
			throw 'Missing resolutions parameter'
		const {resolutions} = req.body
		if (!Array.isArray(resolutions))
			throw 'Expect an array for resolutions parameter'
		const data = await addResolutions(user.SAPIN, resolutions)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.put('/resolutions$', async (req, res, next) => {
	try {
		const {user} = req;
		if (!req.body.hasOwnProperty('resolutions'))
			throw 'Missing resolutions parameter'
		const {resolutions} = req.body
		if (!Array.isArray(resolutions))
			throw 'Expect an array for resolutions parameter'
		const data = await updateResolutions(user.SAPIN, resolutions)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.delete('/resolutions$', async (req, res, next) => {
	try {
		const {user} = req;
		if (!req.body.hasOwnProperty('resolutions'))
			throw 'Missing resolutions parameter'
		const {resolutions} = req.body
		if (!Array.isArray(resolutions))
			throw 'Expect an array for resolutions parameter'
		const data = await deleteResolutions(user.SAPIN, resolutions)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.post('/resolutions/upload/:ballotId', upload.single('ResolutionsFile'), async (req, res, next) => {
	try {
		const {user} = req;
		const {ballotId} = req.params
		if (!req.body.params)
			throw 'Missing parameters'
		const {toUpdate, matchAlgorithm, matchUpdate, sheetName} = JSON.parse(req.body.params)
		if (!Array.isArray(toUpdate))
			throw 'Missing or invalid parameter toUpdate'
		if (!matchAlgorithm || typeof matchAlgorithm !== 'string')
			throw 'Missing or invalid parameter matchAlgorithm'
		if (!matchUpdate || typeof matchUpdate !== 'string')
			throw 'Missing or invalid parameter matchUpdate'
		if (!ballotId || typeof ballotId !== 'string')
			throw 'Missing or invalid parameter BallotID'
		if (!req.file)
			throw 'Missing file'

		const data = await uploadResolutions(user.SAPIN, ballotId, toUpdate, matchAlgorithm, matchUpdate, sheetName, req.file);

		res.json(data)
	}
	catch(err) {next(err)}
})
router.post('/comments/export/:format', upload.single('file'), (req, res, next) => {
	const {user} = req;
	const {format} = req.params;
	const {BallotID, Filename, Style} = JSON.parse(req.body.params)
	const CommentsSpreadsheetFormat = {
		MyProject: 'MyProject',
		Legacy: 'Legacy',
		Modern: 'Modern'
	};
	if (!CommentsSpreadsheetFormat[format])
		return next(`Unexpected format: ${format}`)
	if (!BallotID)
		return next('Missing parameter BallotID')
	if (format === CommentsSpreadsheetFormat.MyProject) {
		if (!req.file)
			return next('Missing file')
		return exportResolutionsForMyProject(BallotID, Filename, req.file, res).catch(err => next(err))
	}
	else {
		let isLegacy;
		if (format === CommentsSpreadsheetFormat.Legacy)
			isLegacy = true;
		else if (format === CommentsSpreadsheetFormat.Modern)
			isLegacy = false;
		else
			return next(`Invalid parameter format ${format}`)
		if (!Style)
			return next('Missing parameter Style')
		return exportSpreadsheet(user, BallotID, Filename, isLegacy, Style, req.file, res).catch(err => next(err))
	}
})

/*
 * Comments History API
 */
import {getCommentsHistory} from '../services/commentsHistory';

router.get('/commentsHistory/:comment_id', async (req, res, next) => {
	try {
		const {comment_id} = req.params
		const data = await getCommentsHistory(comment_id);
		res.json(data)
	}
	catch(err) {next(err)}
});

/*
 * Voting pools and voters API
 */
import {
	getVotingPools,
	deleteVotingPools,
	getVoters,
	addVoter,
	updateVoter,
	deleteVoters,
	uploadVoters
} from '../services/voters'

router.get('/votingPools', async (req, res, next) => {
	try {
		const data = await getVotingPools()
		res.json(data)
	}
	catch(err) {next(err)}
})
router.delete('/votingPools', async (req, res, next) => {
	try {
		const votingPools = req.body
		if (!Array.isArray(votingPools))
			throw "Array parameter missing"
		const data = deleteVotingPools(votingPools)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.get('/voters/:votingPoolType(SA|WG)/:votingPoolId', async (req, res, next) => {
	try {
		const {votingPoolType, votingPoolId} = req.params
		const data = await getVoters(votingPoolType, votingPoolId)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.post('/voter/:votingPoolType(SA|WG)/:votingPoolId', async (req, res, next) => {
	try {
		const {votingPoolType, votingPoolId} = req.params
		const voter = req.body
		const data = await addVoter(votingPoolType, votingPoolId, voter)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.put('/voter/:votingPoolType(SA|WG)/:votingPoolId/:voterId', async (req, res, next) => {
	try {
		const {votingPoolType, votingPoolId, voterId} = req.params
		const voter = req.body
		const data = await updateVoter(votingPoolType, votingPoolId, voterId, voter)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.delete('/voters/:votingPoolType(SA|WG)/:votingPoolId', async (req, res, next) => {
	try {
		const {votingPoolType, votingPoolId} = req.params;
		const {voterIds} = req.body;
		const data = await deleteVoters(votingPoolType, votingPoolId, voterIds);
		res.json(data);
	}
	catch(err) {next(err)}
})
router.post('/votersUpload/:votingPoolType(SA|WG)/:votingPoolId', upload.single('VotersFile'), async (req, res, next) => {
	try {
		const {votingPoolType, votingPoolId} = req.params
		if (!req.file)
			throw 'Missing file'
		const data = await uploadVoters(votingPoolType, votingPoolId, req.file)
		res.json(data)
	}
	catch(err) {next(err)}
})

export default router;
