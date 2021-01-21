/*
 * 802.11 comment database API
 *
 * Robert Stacey
 */

'use strict'

const multer = require('multer')
const upload = multer()
const router = require('express').Router()

/*
 * Enforce basic access
 */
router.all('*', (req, res, next) => {
	const {access} = req.session
	switch (req.method) {
	case 'GET':
		// Certain data is sensitive (has email addresses, etc.)
		if (req.path.match(/^\/votingPool|^\/voters/i)) {
			console.log('validate access')
			if (access <= 1) {	// Need read access
				return next('Insufficient karma')
			}
		}
		break
	case 'PUT':
	case 'POST':
	case 'DELETE':
		if (access <= 2) {	// Need write access
			return next('Insufficient karma')
		}
		break
	}
	next()
})

/*
* Users API
*
* Maintain a database table of users.
* 
* GET /users: returns the complete array of user entries in the database.
* PUT /user/{userId}: updates entry for a specific user ID. Returns the complete entry for the updated user.
* POST /user: adds a user to the database. Returns the complete entry for the user added.
* DELETE /users: deletes users from list of user IDs. Returns null.
* POST /users/upload: insert users from file. Returns the complete array of user entries in the database.
*/
import {
	getUsers,
	updateUser,
	addUser,
	deleteUsers,
	uploadUsers
} from '../services/users';

router.get('/users', async (req, res, next) => {
	try {
		res.json(await getUsers())
	}
	catch(err) {next(err)}
})
router.put('/user/:userId', async (req, res, next) => {
	try {
		const {userId} = req.params
		const user = req.body
		const data = await updateUser(userId, user)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.post('/user', async (req, res, next) => {
	try {
		const user = req.body
		const data = await addUser(user)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.delete('/users', async (req, res, next) => {
	try {
		const userIds = req.body
		if (!Array.isArray(userIds)) {
			throw 'Expected array parameter'
		}
		await deleteUsers(userIds)
		res.json(null)
	}
	catch(err) {next(err)}
})
router.post('/users/upload', upload.single('UsersFile'), async (req, res, next) => {
	try {
		if (!req.file) {
			throw 'Missing file'
		}
		const data = await uploadUsers(file)
		res.json(data)
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
		const {ballotId} = req.params
		const data = await getResults(ballotId)
		res.json(data)
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
		const sess = req.session
		if (sess.access <= 1) {
			throw 'Insufficient karma'
		}
		const {ballotId, epollNum} = req.params
		const data = await importEpollResults(sess, ballotId, epollNum)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.post('/results/uploadEpollResults/:ballotId', upload.single('ResultsFile'), async (req, res, next) => {
	try {
		const {ballotId} = req.params
		if (!req.file)
			throw 'Missing file'
		const data = await uploadEpollResults(ballotId, req.file)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.post('/results/uploadMyProjectResults/:ballotId', upload.single('ResultsFile'), async (req, res, next) => {
	try {
		const {ballotId} = req.params
		if (!req.file)
			throw 'Missing file'
		const data = await uploadMyProjectResults(ballotId, req.file)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.get('/exportResults', (req, res, next) => {
	try {
		exportResults(req.query, res)
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
//const ballots = require('../services/ballots')
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
		const ballots = req.body;
		if (!Array.isArray(ballots))
			throw 'Expect an array of ballots'
		const data = await updateBallots(ballots)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.post('/ballots', async (req, res, next) => {
	try {
		const ballots = req.body;
		if (!Array.isArray(ballots))
			throw 'Expect an array of ballots'
		const data = await addBallots(ballots)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.delete('/ballots', async (req, res, next) => {
	try {
		const ballots = req.body
		if (!Array.isArray(ballots))
			throw 'Expected array of ballots'
		await deleteBallots(ballots)
		res.json(null)
	}
	catch(err) {next(err)}
})
router.get('/epolls', async (req, res, next) => {
	try {
		const n = req.query.hasOwnProperty('n')? parseInt(req.query.n): 0
		const data = await getEpolls(req.session, n)
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

router.get('/comments/:ballotId', (req, res, next) => {
	const {ballotId} = req.params
	return getComments(ballotId)
		.then(data => res.json(data), err => next(err))
})
router.put('/comments', async (req, res, next) => {
	try {
		if (!req.body.hasOwnProperty('comments'))
			throw 'Missing comments parameter'
		const {comments} = req.body
		if (!Array.isArray(comments))
			throw 'Expect an array for comments parameter'
		console.log(req.session.user)
		const data = await updateComments(req.session.user.SAPIN, comments)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.patch('/comments/startCommentId/:ballotId', (req, res, next) => {
	const {ballotId} = req.params
	const {StartCommentID} = req.body
	return setStartCommentId(ballotId, StartCommentID)
		.then(data => res.json(data), err => next(err))
})
router.delete('/comments/:ballotId', (req, res, next) => {
	const {ballotId} = req.params
	return deleteComments(ballotId)
		.then(data => res.json(data), err => next(err))
})
router.post('/comments/importFromEpoll/:ballotId/:epollNum', (req, res, next) => {
	const sess = req.session
	const {ballotId, epollNum} = req.params
	const startCommentId = req.body.StartCID || 1
	return importEpollComments(sess, ballotId, epollNum, startCommentId)
		.then(data => res.json(data), err => next(err))
})
router.post('/comments/upload/:ballotId/:type', upload.single('CommentsFile'), (req, res, next) => {
	const {ballotId} = req.params
	const type = parseInt(req.params.type, 10)
	if (!req.file) {
		return next('Missing file')
	}
	const startCommentId = req.body.StartCID || 1
	return uploadComments(req.session, ballotId, type, startCommentId, req.file)
		.then(data => res.json(data), err => next(err))
})

import {
	addResolutions,
	updateResolutions,
	deleteResolutions,
	exportResolutionsForMyProject,
	exportSpreadsheet
} from '../services/resolutions'
import {uploadResolutions} from '../services/uploadResolutions'

router.post('/resolutions', async (req, res, next) => {
	try {
		if (!req.body.hasOwnProperty('resolutions'))
			throw 'Missing resolutions parameter'
		const {resolutions} = req.body
		if (!Array.isArray(resolutions))
			throw 'Expect an array for resolutions parameter'
		const data = await addResolutions(req.session.user.SAPIN, resolutions)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.put('/resolutions', async (req, res, next) => {
	try {
		if (!req.body.hasOwnProperty('resolutions'))
			throw 'Missing resolutions parameter'
		const {resolutions} = req.body
		if (!Array.isArray(resolutions))
			throw 'Expect an array for resolutions parameter'
		const data = await updateResolutions(req.session.user.SAPIN, resolutions)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.delete('/resolutions', async (req, res, next) => {
	try {
		if (!req.body.hasOwnProperty('resolutions'))
			throw 'Missing resolutions parameter'
		const {resolutions} = req.body
		if (!Array.isArray(resolutions))
			throw 'Expect an array for resolutions parameter'
		const data = await deleteResolutions(req.session.user.SAPIN, resolutions)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.post('/uploadResolutions/:ballotId', upload.single('ResolutionsFile'), async (req, res, next) => {
	try {
		const {ballotId} = req.params
		if (!req.body.params) {
			throw 'Missing parameters'
		}
		const {toUpdate, matchAlgorithm, matchUpdate, sheetName} = JSON.parse(req.body.params)
		if (!Array.isArray(toUpdate)) {
			throw 'Missing or invalid parameter toUpdate'
		}
		if (!matchAlgorithm || typeof matchAlgorithm !== 'string') {
			throw 'Missing or invalid parameter matchAlgorithm'
		}
		if (!matchUpdate || typeof matchUpdate !== 'string') {
			throw 'Missing or invalid parameter matchUpdate'
		}
		if (!ballotId || typeof ballotId !== 'string') {
			throw 'Missing or invalid parameter BallotID'
		}
		if (!req.file) {
			throw 'Missing file'
		}
		const data = await uploadResolutions(ballotId, toUpdate, matchAlgorithm, matchUpdate, sheetName, req.file)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.post('/comments/exportForMyProject', upload.single('file'), (req, res, next) => {
	const {BallotID, Filename} = JSON.parse(req.body.params)
	if (!BallotID) {
		return next('Missing parameter BallotID')
	}
	if (!req.file) {
		return next('Missing file')
	}
	return exportResolutionsForMyProject(BallotID, Filename, req.file, res).catch(err => next(err))
})
router.post('/comments/exportSpreadsheet', upload.single('file'), (req, res, next) => {
	const {BallotID, Filename} = JSON.parse(req.body.params)
	if (!BallotID) {
		return next('Missing parameter BallotID')
	}
	if (!req.file) {
		return next('Missing file')
	}
	return exportSpreadsheet(BallotID, Filename, req.file, res).catch(err => next(err))
})


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
		const {access} = req.session
		if (access <= 1) {
			throw 'Insufficient karma'
		}
		const data = await getVotingPools()
		res.json(data)
	}
	catch(err) {next(err)}
})
router.delete('/votingPools', async (req, res, next) => {
	try {
		const {access} = req.session
		if (access <= 2) {
			throw 'Insufficient karma'
		}
		const votingPools = req.body
		if (!Array.isArray(votingPools)) {
			throw "Array parameter missing"
		}
		const data = deleteVotingPools(votingPools)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.get('/voters/:votingPoolType(SA|WG)/:votingPoolId', async (req, res, next) => {
	try {
		const {access} = req.session
		if (access <= 1) {
			throw 'Insufficient karma'
		}
		const {votingPoolType, votingPoolId} = req.params
		const data = await getVoters(votingPoolType, votingPoolId)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.post('/voter/:votingPoolType(SA|WG)/:votingPoolId', async (req, res, next) => {
	try {
		const {access} = req.session
		if (access <= 2) {
			throw 'Insufficient karma'
		}
		const {votingPoolType, votingPoolId} = req.params
		const voter = req.body
		const data = await addVoter(votingPoolType, votingPoolId, voter)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.put('/voter/:votingPoolType(SA|WG)/:votingPoolId/:voterId', async (req, res, next) => {
	try {
		const {access} = req.session
		if (access <= 2) {
			throw 'Insufficient karma'
		}
		const {votingPoolType, votingPoolId, voterId} = req.params
		const voter = req.body
		const data = await updateVoter(votingPoolType, votingPoolId, voterId, voter)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.delete('/voters/:votingPoolType(SA|WG)/:votingPoolId', async (req, res, next) => {
	try {
		const {access} = req.session
		if (access <= 2) {
			throw 'Insufficient karma'
		}
		const {votingPoolType, votingPoolId} = req.params
		const voterIds = votingPoolType === 'SA'? req.body.Emails: req.body.SAPINs
		const data = await deleteVoters(votingPoolType, votingPoolId, voterIds)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.post('/votersUpload/:votingPoolType(SA|WG)/:votingPoolId', upload.single('VotersFile'), async (req, res, next) => {
	try {
		const {votingPoolType, votingPoolId} = req.params
		if (!req.file) {
			throw 'Missing file'
		}
		const data = await uploadVoters(votingPoolType, votingPoolId, req.file)
		res.json(data)
	}
	catch(err) {next(err)}
})

module.exports = router;
