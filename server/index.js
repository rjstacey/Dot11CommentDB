/*
 * HTTP interface for the 802.11 comment database
 *
 * Robert Stacey
 */

// [START app]
'use strict';

// [START setup]
var express = require('express');
var multer = require('multer');
var upload = multer();
var app = express();

//app.enable('trust proxy');
app.use(express.json());
app.use(express.urlencoded({extended: true}));

var rp = require('request-promise-native').defaults({proxy: 'http://proxy-chain.intel.com:912'});

var connection = require('./database');
// [END setup]

var express_session = require('express-session');
app.use(express_session({
	//name: 'id42',
	secret: 'random_string_goes_here',
	resave: false,
	saveUninitialized: true,
	//cookie: { secure: true }
}));

app.use((req, res, next) => {
	console.log(req.method, req.url);
	next();
});

function resData(res, data) {
	var ret = {status: 'OK'};
	if (data) {
		ret.data = data
	}
	res.status(200).send(ret)
}

function resErr(res, err) {
	console.log(err)
	var ret = {
		status: 'Error',
		err: err
	};
	if (typeof err === 'string') {
		ret.message = err
	}
	else {
		ret.message = JSON.stringify(err)
	}
	res.status(200).send(ret)
}

/*
 * Users API
 *
 * Maintain a database table of users.
 * 
 * GET /users: returns the complete array of user entries in the database.
 * PUT /users: updates entries for the users based on user ID.
 * POST /users: adds a user to the database. Generates a unique user ID for user added.
 * DELETE /users: deletes users from list of user IDs.
 */
const users = require('./users')(connection);

app.get('/users', (req, res, next) => {
	users.getUsers(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.put('/users', (req, res, next) => {
	users.updateUser(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.post('/users', (req, res, next) => {
	users.addUser(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.delete('/users', (req, res, next) => {
	users.deleteUser(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});

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
 * Ballots API
 *
 * GET /ballots: return the complete array of ballot entries in the database
 * PUT /ballots: update select fields in a ballot entry identified by BallotID
 * POST: /ballots: add a ballot entry
 * DELETE: /ballots: delete ballots identified by an array of BallotIDs
 * GET: /epolls: return a list of epolls by scraping the mentor webpage for closed epolls.
 */
const ballots = require('./ballots')(connection, rp);

app.get('/ballots', (req, res, next) => {
	ballots.getBallots(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.put('/ballot/:ballotId', (req, res, next) => {
	ballots.updateBallot(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.post('/ballots', (req, res, next) => {
	ballots.addBallot(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.delete('/ballots', (req, res, next) => {
	ballots.deleteBallots(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.get('/epolls', (req, res, next) => {
	ballots.getEpolls(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});

/*
 * Comments API
 */
const comments = require('./comments')(connection, rp);

app.get('/comments', (req, res, next) => {
	comments.getComments(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.put('/comment', (req, res, next) => {
	comments.updateComment(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.delete('/comments/BallotId', (req, res, next) => {
	comments.deleteByBallotID(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.post('/comments/import', (req, res, next) => {
	comments.importComments(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.post('/comments/upload', upload.single('CommentsFile'), (req, res, next) => {
	comments.uploadComments(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.post('/resolution', (req, res, next) => {
	comments.addResolution(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.put('/resolution', (req, res, next) => {
	comments.updateResolution(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.delete('/resolution', (req, res, next) => {
	comments.deleteResolution(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.post('/resolutions/upload', upload.single('ResolutionsFile'), (req, res, next) => {
	comments.uploadResolutions(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});

/*
 * Ballot results API
 */
const results = require('./results')(connection, rp);

app.get('/results', (req, res, next) => {
	results.getResults(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.delete('/results', (req, res, next) => {
	results.deleteResults(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.get('/results/summary', (req, res, next) => {
	results.summarizeResults(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.post('/results/import', (req, res, next) => {
	results.importResults(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.post('/results/upload', upload.single('ResultsFile'), (req, res, next) => {
	results.uploadResults(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.get('/results/export', (req, res, next) => {
	results.exportResults(req, res, next)
		.catch(err => resErr(res, err))
});

/*
 * Voting pools and voters API
 */
const voters = require('./voters')(connection, rp);

app.get('/votingPool', (req, res, next) => {
	voters.getVotingPool(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.delete('/votingPool', (req, res, next) => {
	voters.deleteVotingPool(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.post('/votingPool', (req, res, next) => {
	voters.addVotingPool(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.get('/voters', (req, res, next) => {
	voters.getVoters(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.post('/voters', (req, res, next) => {
	voters.addVoter(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.delete('/voters', (req, res, next) => {
	voters.deleteVoters(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.post('/voters/upload', upload.single('VotersFile'), (req, res, next) => {
	voters.uploadVoters(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});

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
});
app.post('/login', (req, res, next) => {
	session.login(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});
app.post('/logout', (req, res, next) => {
	session.logout(req, res, next)
		.then(data => resData(res, data), err => resErr(res, err))
});

app.use(express.static('app'));

// [START listen]
var PORT = process.env.PORT || 8080;
app.listen(PORT, function () {
	console.log('App listening on port %s', PORT);
	console.log('Press Ctrl+C to quit.');
});
// [END listen]
// [END app]

module.exports = app;
