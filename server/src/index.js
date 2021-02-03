/*
 * 802.11 comment database server
 *
 * Robert Stacey
 */

'use strict'

require('dotenv').config();
//console.log(process.env);

const db = require('./util/database');

async function initDatabase() {
	await db.init();
	await require('./util/seedDatabase').init();
}

async function initSession() {
	const expressSession = require('express-session');
	const MySQLStore = require('express-mysql-session')(expressSession);
	const sessionStore = new MySQLStore({}, db.getPool());
	return expressSession({
		//name: 'id42',
		secret: 'random_string_goes_here',
		resave: false,
		saveUninitialized: true,
		//cookie: { secure: true }
		store: sessionStore
	});
}

function initServer(session) {
	const path = require('path');
	const express = require('express');
	const app = express();

	app.set('port', process.env.PORT || 8080);
	app.use(express.json());
	app.use(express.urlencoded({extended: true}));
	app.use(session);

	// Log requests to console
	app.use((req, res, next) => {
		console.log(req.method, req.url/*, req.session*/);
		next();
	});

	app.use('/auth', require('./auth/session').default);
	// secure API with JWT
	app.use('/api', require('./util/jwt').verify, require('./api/router').default);

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

	app.listen(app.get('port'), () => {
		console.log('App listening on port %s', app.get('port'))
		console.log('Press Ctrl+C to quit.')
	});

	return app;
}


initDatabase()
	.then(initSession)
	.then(initServer)
	.catch(error => console.error(error));
