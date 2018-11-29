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

var app = express();

//app.enable('trust proxy');
app.use(express.json());
app.use(express.urlencoded({extended: true}));

var request = require('request').defaults({proxy: 'http://proxy-chain.intel.com:912'});

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
  console.log('Get users: ' + req.url);
  users.getAll(req, res, next)
});
app.post('/users', (req, res, next) => {
  console.log('Update users: ' + req.url);
  users.update(req, res, next)
});
app.put('/users', (req, res, next) => {
  console.log('Add users: ' + req.url);
  users.add(req, res, next)
});
app.delete('/users', (req, res, next) => {
  console.log('Delete users: ' + req.url);
  users.delete(req, res, next)
});
app.put('/users/import', (req, res, next) => {
  console.log('Import users: ' + req.url);
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
const ballots = require('./ballots')(connection, request);

app.get('/ballots', (req, res, next) => {
  console.log('Get all ballots: ' + req.url);
  ballots.getAll(req, res, next)
});
app.post('/ballots', (req, res, next) => {
  console.log('Update ballot: ' + req.url);
  ballots.update(req, res, next)
});
app.put('/ballots', (req, res, next) => {
  console.log('Add ballot: ' + req.url);
  ballots.add(req, res, next)
});
app.delete('/ballots', (req, res, next) => {
  console.log('Delete ballot: ' + req.url);
  ballots.delete(req, res, next)
});
app.get('/epolls', (req, res, next) => {
  console.log('Get epolls: ' + req.url);
  ballots.getEpolls(req, res, next)
});
app.put('/ballots/import', (req, res, next) => {
  console.log('Import ballots: ' + req.url);
  ballots.import(req, res, next)
});

/*
 * Comments API
 */
const comments = require('./comments')(connection, request);

app.get('/comments', (req, res, next) => {
  console.log('Get comments: ' + req.url);
  comments.getAll(req, res, next);
});
app.put('/comments', (req, res, next) => {
  comments.update(req, res, next);
});
app.delete('/comments/BallotId', (req, res, next) => {
  console.log('Delete comments by BallotID: ' + req.url);
  comments.deleteByBallotID(req, res, next)
});
app.put('/comments/import', (req, res, next) => {
  console.log('Imports comments from epoll: ' + req.url);
  comments.import(req, res, next)
});
/*
 * Session API
 *
 * Login: post form with login credentials
 * Logout: 
 */
const session = require('./session')(connection, request, users);

app.post('/login', (req, res, next) => {
  console.log('Login: '+ req.url);
  return session.login(req, res, next);
});

app.post('/logout', (req, res, next) => {
  console.log('Logout: '+ req.url);
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
