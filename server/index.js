// Copyright 2015-2016, Google, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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


/*
 * Users API
 *
 * Maintain a database table of users.
 * 
 * GET /users: returns the user database.
 * PUT /users: adds the array of users to the database. Generates a unique user ID for each user added.
 * POST /users: updates entries for the users based on user ID.
 * DELETE /users: deletes users from list of user IDs.
 * PUT /users/import: Import users from the IEEE database using the session users credentials.
 */
const users = require('./users')(connection);

app.get('/users', (req, res, next) => {
  users.getAll(req, res, next)
});
app.post('/users', (req, res, next) => {
  users.update(req, res, next)
});
app.put('/users', (req, res, next) => {
  users.add(req, res, next)
});
app.delete('/users', (req, res, next) => {
  users.delete(req, res, next)
});
app.put('/users/import', (req, res, next) => {
  users.import(req, res, next)
});

/*

app.get('/ieee/comments', function (req, res, next) {
  console.log('Get for '+ req.url);
  console.log(req.query);

  var sess = req.session;

  var epoll = req.query.epoll;

  request
    .get({url: `https://mentor.ieee.org/802.11/poll-comments.csv?p=${epoll}`, jar: sess.cookieJar}, function (err, response, body) {
    
      if (err) {
        res.send(err);
      }

      var comments = CSVToArray(body);

      //console.log(comments);
      res.send(comments);
    });
});


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
 */
const ballots = require('./ballots')(connection, rp);

app.get('/ballots', (req, res, next) => {
  ballots.getAll(req, res, next)
});
app.post('/ballots', (req, res, next) => {
  ballots.update(req, res, next)
});
app.put('/ballots', (req, res, next) => {
  ballots.add(req, res, next)
});
app.delete('/ballots', (req, res, next) => {
  ballots.delete(req, res, next)
});
app.get('/epolls', (req, res, next) => {
  ballots.getEpolls(req, res, next)
});
app.put('/ballots/import', (req, res, next) => {
  ballots.import(req, res, next)
});

/*
 * Comments API
 */
const comments = require('./comments')(connection, rp);

app.get('/comments', (req, res, next) => {
  comments.getAll(req, res, next);
});
app.delete('/comments/BallotId', (req, res, next) => {
  comments.deleteByBallotID(req, res, next)
});
app.put('/comments/import', (req, res, next) => {
  comments.importComments(req, res, next)
});
app.post('/comment', (req, res, next) => {
  comments.updateComment(req, res, next);
});
app.post('/resolution', (req, res, next) => {
  comments.updateResolution(req, res, next);
});
app.put('/resolution', (req, res, next) => {
  comments.addResolution(req, res, next);
});

/*
 * Ballot results API
 */
const results = require('./results')(connection, rp);

app.get('/results', (req, res, next) => {
  results.getResults(req, res, next);
});
app.delete('/results', (req, res, next) => {
  results.deleteResults(req, res, next)
});
app.get('/results/summary', (req, res, next) => {
  results.summarizeResults(req, res, next);
});
app.put('/results/import', (req, res, next) => {
  results.importResults(req, res, next)
});

/*
 * Ballot voters API
 */
const voters = require('./voters')(connection, rp);

app.get('/voters', (req, res, next) => {
  voters.getVoters(req, res, next);
});
app.delete('/voters', (req, res, next) => {
  voters.deleteVoters(req, res, next)
});
app.post('/voters', upload.single('VotersFile'), (req, res, next) => {
  voters.uploadVoters(req, res, next)
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
  return session.getState(req, res, next);
});
app.post('/login', (req, res, next) => {
  return session.login(req, res, next);
});
app.post('/logout', (req, res, next) => {
  return session.logout(req, res, next);
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
