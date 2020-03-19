/*
 * HTTP interface for the 802.11 comment database
 *
 * Robert Stacey
 */

'use strict'

var express = require('express')
var multer = require('multer')
var upload = multer()
var app = express()

//app.enable('trust proxy');
app.use(express.json())
app.use(express.urlencoded({extended: true}))

var rp = require('request-promise-native').defaults({proxy: 'http://proxy-chain.intel.com:912'})

var connection = require('./database')

var expressSession = require('express-session')
var MySQLStore = require('express-mysql-session')(expressSession)
var sessionStore = new MySQLStore({}, connection.pool)
app.use(expressSession({
	//name: 'id42',
	secret: 'random_string_goes_here',
	resave: false,
	saveUninitialized: true,
	//cookie: { secure: true }
	store: sessionStore
}))

app.use((req, res, next) => {
	console.log(req.method, req.url)
	next()
})


function resData(res, data) {
	res.status(200).json(data)
}

function resErr(res, err) {
	console.log(err)
	let message
	if (typeof err === 'string') {
		message = err
	}
	else {
		//console.log(err)
		try {
			message = err.toString()
		}
		catch(e) {
			message = JSON.stringify(err)
		}
	}
	res.status(400).send(message)
}

/*
 * Enforce basic access
 */
app.all(['/users', '/votingPool', '/voters'], (req, res, next) => {
	const {access} = req.session;
	console.log('enforce', req.method, access)
	if (req.method === 'GET') {
		if (access <= 1) {
			return resErr(res, 'Insufficient karma')
		}
	}
	next()
})
app.all((req, res, next) => {
	if (req.path === '/login' || req.path === '/logout') {
		return next()
	}
	const {access, autheticated} = req.session
	switch (req.method) {
	case 'PUT':
	case 'POST':
	case 'DELETE':
		if (!autheticated) {
			return resErr(res, 'Not autheticated')
		}
		if (access <= 2) {
			return resErr(res, 'Insufficient karma')
		}
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
const users = require('./users')(connection)

app.get('/users', (req, res, next) => {
	users.getUsers(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.put('/user/:userId', (req, res, next) => {
	users.updateUser(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.post('/user', (req, res, next) => {
	users.addUser(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.delete('/users', (req, res, next) => {
	users.deleteUsers(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.post('/users/upload', upload.single('UsersFile'), (req, res, next) => {
	users.uploadUsers(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})

/*
app.get('/pdf', function (req, res, next) {

    console.log('Request for /pdf');
    // Get all the comments

    var data = new Uint8Array(fs.readFileSync('helloworld.pdf'));
    PDFJS.getDocument(data).then(function (pdfDocument) {
      console.log('Number of pages: ' + pdfDocument.numPages);
    });

    return res
	.status(200)
	.send('It is ready to go');

});
*/


/*
 * Ballot results API
 */
const results = require('./results')(connection, rp)

app.get('/results/:ballotId', (req, res, next) => {
	results.getResults(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.delete('/results/:ballotId', (req, res, next) => {
	results.deleteResults(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.post('/results/importFromEpoll/:ballotId/:epollNum', (req, res, next) => {
	results.importEpollResults(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.post('/results/upload/:ballotId/:type', upload.single('ResultsFile'), (req, res, next) => {
	results.uploadResults(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.get('/exportResults', (req, res, next) => {
	results.exportResults(req, res, next)
		.catch(err => resErr(res, err))
})


/*
 * Ballots API
 *
 * GET /ballots: return the complete array of ballot entries in the database
 * PUT /ballots: update select fields in a ballot entry identified by BallotID
 * POST: /ballots: add a ballot entry
 * DELETE: /ballots: delete ballots identified by an array of BallotIDs
 * GET: /epolls: return a list of epolls by scraping the mentor webpage for closed epolls.
 */
const ballots = require('./ballots')(connection, rp, results)

app.get('/ballots', (req, res, next) => {
	ballots.getBallots(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.get('/ballot/:ballotId', (req, res, next) => {
	ballots.getBallot(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.put('/ballot/:ballotId', (req, res, next) => {
	ballots.updateBallot(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.post('/ballots', (req, res, next) => {
	ballots.addBallot(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.delete('/ballots', (req, res, next) => {
	ballots.deleteBallots(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.get('/epolls', (req, res, next) => {
	ballots.getEpolls(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})


/*
 * Ballot comments API
 *
 * GET /comments/{ballotId} - return an array of comments for a given ballot
 * PUT /comment/{ballotId}/{commentId} - update a comment; returns the updated comment
 * DELETE /comments/{ballotId} - delete comments in the array of comment IDs
 * POST /comments/importFromEpoll/{ballotId}/{epollNum} - import comments from an epoll on mentor
 * POST /comments/upload/{ballotId}/{type} - import comments from a file; file format determined by type
 * GET /exportComments/myProject - export resolved comments in a form suitable for MyProject upload
 */
const comments = require('./comments')(connection, rp)

app.get('/comments/:ballotId', (req, res, next) => {
	comments.getComments(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.put('/comment/:ballotId/:commentId', (req, res, next) => {
	comments.updateComment(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.delete('/comments/:ballotId', (req, res, next) => {
	comments.deleteComments(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.post('/comments/importFromEpoll/:ballotId/:epollNum', (req, res, next) => {
	comments.importEpollComments(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.post('/comments/upload/:ballotId/:type', upload.single('CommentsFile'), (req, res, next) => {
	comments.uploadComments(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.get('/exportComments/myProject', (req, res, next) => {
	comments.exportMyProjectComments(req, res, next)
		.catch(err => resErr(res, err))
})
app.post('/resolutions/:ballotId', (req, res, next) => {
	comments.addResolutions(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.put('/resolutions/:ballotId', (req, res, next) => {
	comments.updateResolutions(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.delete('/resolutions/:ballotId', (req, res, next) => {
	comments.deleteResolutions(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.post('/resolutions/upload', upload.single('ResolutionsFile'), (req, res, next) => {
	comments.uploadResolutions(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})



/*
 * Voting pools and voters API
 */
const voters = require('./voters')(connection, rp)

app.get('/votingPools', (req, res, next) => {
	voters.getVotingPools(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.delete('/votingPools', (req, res, next) => {
	voters.deleteVotingPools(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.get('/voters/:votingPoolType(SA|WG)/:votingPoolId', (req, res, next) => {
	voters.getVoters(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.post('/voter/:votingPoolType(SA|WG)/:votingPoolId', (req, res, next) => {
	voters.addVoter(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.put('/voter/:votingPoolType(SA|WG)/:votingPoolId/:voterId', (req, res, next) => {
	voters.updateVoter(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.delete('/voters/:votingPoolType(SA|WG)/:votingPoolId', (req, res, next) => {
	voters.deleteVoters(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.post('/votersUpload/:votingPoolType(SA|WG)/:votingPoolId', upload.single('VotersFile'), (req, res, next) => {
	voters.uploadVoters(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})

/*
 * Session API
 *
 * GET /login: get current session information
 * POST /login: login with supplied credentials and return session information
 * POST /logout: logout
 */
const session = require('./session')(connection, rp, users);
app.get('/login', (req, res, next) => {
	session.getState(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.post('/login', (req, res, next) => {
	session.login(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})
app.post('/logout', (req, res, next) => {
	session.logout(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
})

app.use(express.static('app'))

// [START listen]
var PORT = process.env.PORT || 8080
app.listen(PORT, function () {
	console.log('App listening on port %s', PORT)
	console.log('Press Ctrl+C to quit.')
})
// [END listen]
// [END app]

module.exports = app;
