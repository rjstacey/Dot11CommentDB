/*
 * 802.11 comment database server
 *
 * Robert Stacey
 */

'use strict'

require('dotenv').config();

const path = require('path');
const express = require('express');

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

const db = require('./util/database');
require('./util/seedDatabase').init();

const expressSession = require('express-session');
const MySQLStore = require('express-mysql-session')(expressSession);
const sessionStore = new MySQLStore({}, db.pool);
app.use(expressSession({
	//name: 'id42',
	secret: 'random_string_goes_here',
	resave: false,
	saveUninitialized: true,
	//cookie: { secure: true }
	store: sessionStore
}));

// Log requests to console
app.use((req, res, next) => {
	console.log(req.method, req.url);
	next();
});

app.use('/auth', require('./auth/session'));
// secure API with JWT
const jwt = require('./util/jwt').verify;
app.use('/api', jwt, require('./api/router'));

// Error handler
app.use((err, req, res, next) => {
	console.error(err)
	let message
	if (typeof err === 'string') {
		message = err
	}
	else {
		try {
			message = err.toString()
		}
		catch(e) {
			message = JSON.stringify(err)
		}
	}
	res.status(400).send(message)
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'app', 'index.html')));
app.use(express.static(path.join(__dirname, 'app')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'app', 'index.html')));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
	console.log('App listening on port %s', PORT)
	console.log('Press Ctrl+C to quit.')
});

module.exports = app;
