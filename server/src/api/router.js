/*
 * 802.11 comment database API
 *
 * Robert Stacey
 */

'use strict'

const multer = require('multer')
const upload = multer()
const router = require('express').Router()
const rp = require('request-promise-native')

if (process.env.HTTP_PROXY) {
	rp.defaults({proxy: process.env.HTTP_PROXY})
}

/*
 * Enforce basic access
 */
router.all('*', (req, res, next) => {
	const {access} = req.session
	switch (req.method) {
	case 'GET':
		// Certain data is sensitive (has email addresses, etc.)
		if (req.path.test(/^\/users|^\/votingPool|^\/voters/i)) {
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
* PUT /user/{userId}: updates entry for a specific user ID.
* POST /user: adds a user to the database. Returns a unique user ID for user added.
* DELETE /users: deletes users from list of user IDs.
* POST /users/upload: insert users from file
*/
const users = require('../services/users')

router.get('/users', (req, res, next) => {
	try {
		users.getUsers().then(data => res.json(data))
	}
	catch(err) {next(err)}
})
router.put('/user/:userId', (req, res, next) => {
	try {
		const {userId} = req.params
		const user = req.body
		users.updateUser(userId, user).then(data => res.json(data))
	}
	catch(err) {next(err)}
})
router.post('/user', (req, res, next) => {
	try {
		const user = req.body
		users.addUser(user).then(data => res.json(data))
	}
	catch(err) {next(err)}
})
router.delete('/users', (req, res, next) => {
	try {
		userIds = req.body
		if (!Array.isArray(userIds)) {
			throw 'Expected array parameter'
		}
		users.deleteUsers(userIds).then(data => res.json(data))
	}
	catch(err) {next(err)}
})
router.post('/users/upload', upload.single('UsersFile'), (req, res, next) => {
	try {
		if (!req.file) {
			throw 'Missing file'
		}
		users.uploadUsers(file)
	}
	catch(err) {next(err)}
})

/*
 * Ballot results API
 */
const results = require('../services/results')

router.get('/results/:ballotId', (req, res, next) => {
	try {
		const {ballotId} = req.params
		results.getResults(ballotId).then(data => res.json(data))
	}
	catch(err) {next(err)}
})
router.delete('/results/:ballotId', (req, res, next) => {
	try {
		const {ballotId} = req.params
		results.deleteResults(ballotId).then(data => res.json(data))
	}
	catch(err) {next(err)}
})
router.post('/results/importFromEpoll/:ballotId/:epollNum', (req, res, next) => {
	try {
		const sess = req.session
		if (sess.access <= 1) {
			throw 'Insufficient karma'
		}
		const {ballotId, epollNum} = req.params
		results.importEpollResults(ballotId, epollNum).then(data => res.json(data))
	}
	catch(err) {next(err)}
})
router.post('/results/upload/:ballotId/:type', upload.single('ResultsFile'), (req, res, next) => {
	try {
		const {ballotId} = req.params
		const type = parseInt(req.params.type, 10)
		if (!req.file) {
			next('Missing file')
			return
		}

		results.uploadResults(ballotId, type, req.file).then(data => res.json(data))
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

router.get('/ballots', (req, res, next) => {
	try {
		ballots.getBallots().then(data => res.json(data))
	}
	catch(err) {next(err)}
})
router.get('/ballot/:ballotId', (req, res, next) => {
	try {
		const {ballotId} = req.params
		ballots.getBallot(ballotId).then(data => res.json(data))
	}
	catch(err) {next(err)}
})
router.put('/ballot/:ballotId', (req, res, next) => {
	try {
		const ballotId = req.params.ballotId
		const ballot = req.body
		ballots.updateBallot(ballotId, ballot).then(data => res.json(data))
	}
	catch(err) {next(err)}
})
router.post('/ballots', (req, res, next) => {
	try {
		const ballot = req.body
		ballots.addBallot(ballot).then(data => res.json(data))
	}
	catch(err) {next(err)}
})
router.delete('/ballots', (req, res, next) => {
	try {
		const ballotIds = req.body
		if (!Array.isArray(ballotIds)) {
			throw 'Expected array of ballot IDs'
		}
		ballots.deleteBallots(ballotIds).then(data => res.json(data))
	}
	catch(err) {next(err)}
})
router.get('/epolls', (req, res, next) => {
	try {
		const n = req.query.hasOwnProperty('n')? parseInt(req.query.n): 0
		ballots.getEpolls(req.session, n).then(data => res.json(data))
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
const comments = require('../services/comments')

router.get('/comments/:ballotId', (req, res, next) => {
	try {
		const {ballotId} = req.params
		comments.getComments(ballotId).then(data => res.json(data))
	}
	catch(err) {next(err)}
})
router.put('/comment/:ballotId/:commentId', (req, res, next) => {
	try {
		const {ballotId, commentId} = req.params
		const comment = req.body
		comments.updateComment(ballotId, commentId, comment).then(data => res.json(data))
	}
	catch(err) {next(err)}
})
router.delete('/comments/:ballotId', (req, res, next) => {
	try {
		const {ballotId} = req.params
		comments.deleteComments(ballotId).then(data => res.json(data))
	}
	catch(err) {next(err)}
})
router.post('/comments/importFromEpoll/:ballotId/:epollNum', (req, res, next) => {
	try {
		const sess = req.session
		const {ballotId, epollNum} = req.params
		const startCommentId = req.body.StartCID || 1
		comments.importEpollComments(sess, ballotId, epollNum, startCommentId).then(data => res.json(data))
	}
	catch(err) {next(err)}
})
router.post('/comments/upload/:ballotId/:type', upload.single('CommentsFile'), (req, res, next) => {
	try {
		const {ballotId} = req.params
		const type = parseInt(req.params.type, 10)
		if (!req.file) {
			throw 'Missing file'
		}
		const startCommentId = req.body.StartCID || 1
		comments.uploadComments(ballotId, type, startCommentId, req.file).then(data => res.json(data))
	}
	catch(err) {next(err)}
})
router.get('/exportComments/myProject', (req, res, next) => {
	try {
		const ballotId = req.query.BallotID
		if (!ballotId) {
			throw 'Missing parameter BallotID'
		}
		comments.exportMyProjectComments(ballotId, res)
	}
	catch(err) {next(err)}
})
router.post('/resolutions/:ballotId', (req, res, next) => {
	try {
		const {ballotId} = req.params
		const resolutions = req.body
		if (!Array.isArray(resolutions)) {
			throw 'Expect an array parameter'
		}
		comments.addResolutions(ballotId, resolutions).then(data => res.json(data))
	}
	catch(err) {next(err)}
})
router.put('/resolutions/:ballotId', (req, res, next) => {
	try {
		const {ballotId} = req.params
		const {CIDs, resolutions} = req.body
		if (resolutions === undefined || !Array.isArray(resolutions)) {
			throw 'Missing resolutions array'
		}
		comments.updateResolutions(ballotId, CIDs, resolutions).then(data => res.json(data))
	}
	catch(err) {next(err)}
})
router.delete('/resolutions/:ballotId', (req, res, next) => {
	try {
		const {ballotId} = req.params
		const {resolutions} = req.body
		if (resolutions === undefined || !Array.isArray(resolutions)) {
			throw 'Missing resolutions array'
		}
		comments.deleteResolutions(ballotId, resolutions).then(data => res.json(data))
	}
	catch(err) {next(err)}
})
router.post('/resolutions/upload', upload.single('ResolutionsFile'), (req, res, next) => {
	try {
		const ballotId = req.body.BallotID
		const matchAlgorithm = req.body.matchAlgorithm
		const matchAll = req.body.matchAll || true
		if (!ballotId) {
			throw 'Missing parameter BallotID'
		}
		if (!req.file) {
			throw 'Missing file'
		}
		comments.uploadResolutions(ballotId, matchAlgorithm, matchAll, req.file).then(data => res.json(data))
	}
	catch(err) {next(err)}
})


/*
 * Voting pools and voters API
 */
const voters = require('../services/voters')

router.get('/votingPools', (req, res, next) => {
	try {
		const {access} = req.session
		if (access <= 1) {
			throw 'Insufficient karma'
		}
		voters.getVotingPools().then(data => res,json(data))
	}
	catch(err) {next(err)}
})
router.delete('/votingPools', (req, res, next) => {
	try {
		const {access} = req.session
		if (access <= 2) {
			throw 'Insufficient karma'
		}
		const votingPools = req.body
		if (!Array.isArray(votingPools)) {
			throw "Array parameter missing"
		}
		voters.deleteVotingPools(votingPools).then(data => res.json(data))
	}
	catch(err) {next(err)}
})
router.get('/voters/:votingPoolType(SA|WG)/:votingPoolId', (req, res, next) => {
	try {
		const {access} = req.session
		if (access <= 1) {
			throw 'Insufficient karma'
		}
		const {votingPoolType, votingPoolId} = req.params
		voters.getVoters(votingPoolType, votingPoolId).then(data => res.send(data))
	}
	catch(err) {next(err)}
})
router.post('/voter/:votingPoolType(SA|WG)/:votingPoolId', (req, res, next) => {
	try {
		const {access} = req.session
		if (access <= 2) {
			throw 'Insufficient karma'
		}
		const {votingPoolType, votingPoolId} = req.params
		const voter = req.body
		voters.addVoter(votingPoolType, votingPoolId, voter).then(data => res.send(data))
	}
	catch(err) {next(err)}
})
router.put('/voter/:votingPoolType(SA|WG)/:votingPoolId/:voterId', (req, res, next) => {
	try {
		const {access} = req.session
		if (access <= 2) {
			throw 'Insufficient karma'
		}
		const {votingPoolType, votingPoolId, voterId} = req.params
		const voter = req.body
		voters.updateVoter(votingPoolType, votingPoolId, voterId, voter).then(data => res.send(data))
	}
	catch(err) {next(err)}
})
router.delete('/voters/:votingPoolType(SA|WG)/:votingPoolId', (req, res, next) => {
	try {
		const {access} = req.session
		if (access <= 2) {
			throw 'Insufficient karma'
		}
		const {votingPoolType, votingPoolId} = req.params
		const voterIds = votingPoolType === 'SA'? req.body.Emails: req.body.SAPINs
		voters.deleteVoters(votingPoolType, votingPoolId, voterIds).then(data => res.send(data))
	}
	catch(err) {next(err)}
})
router.post('/votersUpload/:votingPoolType(SA|WG)/:votingPoolId', upload.single('VotersFile'), (req, res, next) => {
	try {
		const {votingPoolType, votingPoolId} = req.params
		if (!req.file) {
			throw 'Missing file'
		}
		voters.uploadVoters(votingPoolType, votingPoolId, req.file).then(data => res.send(data))
	}
	catch(err) {next(err)}
})

module.exports = router
