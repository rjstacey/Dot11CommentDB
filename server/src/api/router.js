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
		if (req.path.match(/^\/users|^\/votingPool|^\/voters/i)) {
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
const users = require('../services/users')

router.get('/users', async (req, res, next) => {
	try {
		res.json(await users.getUsers())
	}
	catch(err) {next(err)}
})
router.put('/user/:userId', async (req, res, next) => {
	try {
		const {userId} = req.params
		const user = req.body
		const data = await users.updateUser(userId, user)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.post('/user', async (req, res, next) => {
	try {
		const user = req.body
		const data = await users.addUser(user)
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
		await users.deleteUsers(userIds)
		res.json(null)
	}
	catch(err) {next(err)}
})
router.post('/users/upload', upload.single('UsersFile'), async (req, res, next) => {
	try {
		if (!req.file) {
			throw 'Missing file'
		}
		const data = await users.uploadUsers(file)
		res.json(data)
	}
	catch(err) {next(err)}
})

/*
 * Ballot results API
 */
const results = require('../services/results')

router.get('/results/:ballotId', async (req, res, next) => {
	try {
		const {ballotId} = req.params
		const data = await results.getResults(ballotId)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.delete('/results/:ballotId', async (req, res, next) => {
	try {
		const {ballotId} = req.params
		const data = await results.deleteResults(ballotId)
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
		const data = await results.importEpollResults(sess, ballotId, epollNum)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.post('/results/upload/:ballotId/:type', upload.single('ResultsFile'), async (req, res, next) => {
	try {
		const {ballotId} = req.params
		const type = parseInt(req.params.type, 10)
		if (!req.file) {
			throw 'Missing file'
		}
		const data = await results.uploadResults(ballotId, type, req.file)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.get('/exportResults', (req, res, next) => {
	try {
		results.exportResults(req.query, res)
	}
	catch(err) {next(err)}
})


/*
* Ballots API
*
* GET /ballots - return the complete list of ballots
* GET /ballot/{ballotId} - return details on a specific ballot
* PUT /ballots/{ballotId} - update select fields in the ballot entry identified by ballotId
* POST: /ballots - add a ballot entry
* DELETE: /ballots - delete ballots identified by an array of BallotIDs
* GET: /epolls?{n}} - return a list of n epolls by scraping the mentor webpage for closed epolls.
*/
const ballots = require('../services/ballots')

router.get('/ballots', async (req, res, next) => {
	try {
		res.json(await ballots.getBallots())
	}
	catch(err) {next(err)}
})
router.get('/ballot/:ballotId', async (req, res, next) => {
	try {
		const {ballotId} = req.params
		const data = await ballots.getBallot(ballotId)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.put('/ballot/:ballotId', async (req, res, next) => {
	try {
		const ballotId = req.params.ballotId
		const ballot = req.body
		const data = await ballots.updateBallot(ballotId, ballot)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.post('/ballots', async (req, res, next) => {
	try {
		const ballot = req.body
		const data = await ballots.addBallot(ballot)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.delete('/ballots', async (req, res, next) => {
	try {
		const ballotIds = req.body
		if (!Array.isArray(ballotIds)) {
			throw 'Expected array of ballot IDs'
		}
		await ballots.deleteBallots(ballotIds)
		res.json(null)
	}
	catch(err) {next(err)}
})
router.get('/epolls', async (req, res, next) => {
	try {
		const n = req.query.hasOwnProperty('n')? parseInt(req.query.n): 0
		const data = await ballots.getEpolls(req.session, n)
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
const commentsModule = require('../services/comments')

router.get('/comments/:ballotId', (req, res, next) => {
	const {ballotId} = req.params
	return commentsModule.getComments(ballotId)
		.then(data => res.json(data), err => next(err))
})
router.put('/comment/:ballotId/:commentId', (req, res, next) => {
	const {ballotId, commentId} = req.params
	const comment = req.body
	return commentsModule.updateComment(ballotId, commentId, comment)
		.then(data => res.json(data), err => next(err))
})
router.put('/comments/:ballotId', (req, res, next) => {
	const {ballotId} = req.params
	const {commentIds, comments} = req.body
	return commentsModule.updateComments(ballotId, commentIds, comments)
		.then(data => res.json(data), err => next(err))
})
router.patch('/comments/startCommentId/:ballotId', (req, res, next) => {
	const {ballotId} = req.params
	const {StartCommentID} = req.body
	return commentsModule.setStartCommentId(ballotId, StartCommentID)
		.then(data => res.json(data), err => next(err))
})
router.delete('/comments/:ballotId', (req, res, next) => {
	const {ballotId} = req.params
	return commentsModule.deleteComments(ballotId)
		.then(data => res.json(data), err => next(err))
})
router.post('/comments/importFromEpoll/:ballotId/:epollNum', (req, res, next) => {
	const sess = req.session
	const {ballotId, epollNum} = req.params
	const startCommentId = req.body.StartCID || 1
	return commentsModule.importEpollComments(sess, ballotId, epollNum, startCommentId)
		.then(data => res.json(data), err => next(err))
})
router.post('/comments/upload/:ballotId/:type', upload.single('CommentsFile'), (req, res, next) => {
	const {ballotId} = req.params
	const type = parseInt(req.params.type, 10)
	if (!req.file) {
		return next('Missing file')
	}
	const startCommentId = req.body.StartCID || 1
	return commentsModule.uploadComments(ballotId, type, startCommentId, req.file)
		.then(data => res.json(data), err => next(err))
})
router.post('/comments/exportForMyProject', upload.single('file'), (req, res, next) => {
	const {BallotID, Filename} = JSON.parse(req.body.params)
	if (!BallotID) {
		return next('Missing parameter BallotID')
	}
	if (!req.file) {
		return next('Missing file')
	}
	return commentsModule.exportResolutionsForMyProject(BallotID, Filename, req.file, res).catch(err => next(err))
})
router.post('/comments/exportSpreadsheet', upload.single('file'), (req, res, next) => {
	const {BallotID, Filename} = JSON.parse(req.body.params)
	if (!BallotID) {
		return next('Missing parameter BallotID')
	}
	if (!req.file) {
		return next('Missing file')
	}
	return commentsModule.exportSpreadsheet(BallotID, Filename, req.file, res).catch(err => next(err))
})
router.post('/resolutions/:ballotId', async (req, res, next) => {
	try {
		const {ballotId} = req.params
		const resolutions = req.body
		if (!Array.isArray(resolutions)) {
			throw 'Expect an array parameter'
		}
		const data = await commentsModule.addResolutions(ballotId, resolutions)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.put('/resolutions/:ballotId', async (req, res, next) => {
	try {
		const {ballotId} = req.params
		const {CIDs, resolutions} = req.body
		if (resolutions === undefined || !Array.isArray(resolutions)) {
			throw 'Missing resolutions array'
		}
		const data = await commentsModule.updateResolutions(ballotId, CIDs, resolutions)
		console.log(data)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.delete('/resolutions/:ballotId', async (req, res, next) => {
	try {
		const {ballotId} = req.params
		const {resolutions} = req.body
		if (resolutions === undefined || !Array.isArray(resolutions)) {
			throw 'Missing resolutions array'
		}
		const data = await commentsModule.deleteResolutions(ballotId, resolutions)
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
		const {toUpdate, matchAlgorithm, matchAll, sheetName} = JSON.parse(req.body.params)
		if (!Array.isArray(toUpdate)) {
			throw 'Missing or invalid parameter toUpdate'
		}
		if (!matchAlgorithm || typeof matchAlgorithm !== 'string') {
			throw 'Missing or invalid parameter matchAlgorithm'
		}
		if (!ballotId || typeof ballotId !== 'string') {
			throw 'Missing or invalid parameter BallotID'
		}
		if (!req.file) {
			throw 'Missing file'
		}
		const data = await commentsModule.uploadResolutions(ballotId, toUpdate, matchAlgorithm, matchAll, sheetName, req.file)
		res.json(data)
	}
	catch(err) {next(err)}
})


/*
 * Voting pools and voters API
 */
const voters = require('../services/voters')

router.get('/votingPools', async (req, res, next) => {
	try {
		const {access} = req.session
		if (access <= 1) {
			throw 'Insufficient karma'
		}
		const data = await voters.getVotingPools()
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
		const data = voters.deleteVotingPools(votingPools)
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
		const data = await voters.getVoters(votingPoolType, votingPoolId)
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
		const data = await voters.addVoter(votingPoolType, votingPoolId, voter)
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
		const data = await voters.updateVoter(votingPoolType, votingPoolId, voterId, voter)
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
		const data = await voters.deleteVoters(votingPoolType, votingPoolId, voterIds)
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
		const data = await voters.uploadVoters(votingPoolType, votingPoolId, req.file)
		res.json(data)
	}
	catch(err) {next(err)}
})

module.exports = router
