/*
 * 802 tools server
 *
 * Robert Stacey
 */

require('dotenv').config();
//console.log(process.env);

const db = require('./utils/database');

async function initDatabase() {
	await db.init();
	await require('./utils/seedDatabase').init();
	console.log('init database complete');
}

async function initServices() {
	console.log('init users...');
	await require('./auth/users').init();
	console.log('init webex...');
	await require('./services/webex').init();
	console.log('init calendar...');
	await require('./services/calendar').init();
	console.log('init services complete');
}

function initServer() {
	console.log('init server...');
	const path = require('path');
	const express = require('express');
	const app = express();

	app.set('port', process.env.PORT || 8080);
	app.use(express.json());
	app.use(express.urlencoded({extended: true}));

	if (process.env.NODE_ENV === 'development') {
		// Log requests to console
		app.use((req, res, next) => {
			console.log(req.method, req.url);
			next();
		});
	}

	// Default is to expire immediately
	app.all('*', (req, res, next) => {
		res.setHeader('Cache-Control', 'max-age=0');
		next();
	});

	app.use('/auth', require('./auth/login').default);
	app.use('/api', require('./api/router').default);

	// Error handler
	app.use((err, req, res, next) => {
		if (process.env.NODE_ENV === 'development')
			console.warn(err);
		let message;
		if (typeof err === 'string') {
			message = err;
		}
		else if (err.hasOwnProperty('message')) {
			// Error and its ilk caught here
			message = err.message;
		}
		else {
			try {
				message = err.toString();
			}
			catch(e) {
				message = JSON.stringify(err);
			}
		}
		let status = 400;
		if (err.name === "AuthError")
			status = 401;
		else if (err.name === "NotFoundError")
			status = 404;
		res.status(status).send(message);
	});


	//app.get('*/static*', (req, res, next) => {
	//	res.setHeader('Cache-Control', 'max-age=31536000');
	//	next();
	//});

	let devdir = '';
	if (process.env.NODE_ENV === 'development') {
		devdir = '../../build'
		console.log(path.join(__dirname, devdir))
	}

	app.use(
		express.static(path.join(__dirname, devdir, ''), {maxAge: 31536000})
	);

	app.get('/$', (req, res) => res.redirect('/comments'));
	app.get('/login', (req, res) => res.sendFile(path.join(__dirname, devdir, 'auth/index.html')));
	app.get('/logout', (req, res) => res.sendFile(path.join(__dirname, devdir, 'auth/logout.html')));
	app.get('/comments*', (req, res) => res.sendFile(path.join(__dirname, devdir, 'comments/index.html')));
	app.get('/membership*', (req, res) => res.sendFile(path.join(__dirname, devdir, 'membership/index.html')));
	//app.get('*', (req, res) => res.redirect('/'));

	app.listen(app.get('port'), () => {
		console.log('App listening on port %s', app.get('port'))
		console.log('Press Ctrl+C to quit.')
	});

	return app;
}

initDatabase()
	.then(initServices)
	.then(initServer)
	.catch(error => console.error(error));
