/*
 * 802 tools server
 *
 * Robert Stacey
 */

import dotenv from 'dotenv';
import path from 'path';
import express from 'express';

import login from './auth/login';
import oauth2 from './auth/oauth2';
import api from './api/router';

import {init as databaseInit} from './utils/database';
import {init as seedDatabase} from './utils/seedDatabase';
import {init as webexInit} from './services/webex';
import {init as calendarInit} from './services/calendar';
import {init as emailInit} from './services/email';

dotenv.config();
//console.log(process.env);

async function initDatabase() {
	await databaseInit();
	await seedDatabase();
	console.log('init database complete');
}

async function initServices() {
	
	process.stdout.write('init webex... ');
	try {
		await webexInit();
		process.stdout.write('success\n');
	}
	catch (error) {
		console.error('init webex failed', error);
	}

	process.stdout.write('init calendar... ');
	try {
		await calendarInit();
		process.stdout.write('success\n');
	}
	catch (error) {
		console.error('init calendar failed', error);
	}

	process.stdout.write('init email... ');
	try {
		emailInit();
		process.stdout.write('success\n');
	}
	catch (error) {
		console.error('init email service failed')
	}
	console.log('init services complete');
}

function initServer() {
	console.log('init server...');
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

	app.use('/auth', login);

	// The /oauth2 interface is used for oauth2 completion callbacks
	app.use('/oauth2', oauth2);

	// The /api interface provides secure access to the REST API
	app.use('/api', api);

	// Error handler
	app.use((err, req, res, next) => {
		if (process.env.NODE_ENV === 'development')
			console.warn(err);
		let message: string;
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
		let status = 500;
		if (err.name === "TypeError")
			status = 400;
		else if (err.name === "AuthError")
			status = 401;
		else if (err.name === "ForbiddenError")
			status = 403;
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
