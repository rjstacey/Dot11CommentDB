/*
 * 802.11 comment database server
 *
 * Robert Stacey
 */

require('dotenv').config();
console.log(process.env);

const db = require('./util/database');

async function initDatabase() {
	await db.init();
	await require('./util/seedDatabase').init();
}

function initServer() {
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

	app.use('/auth', require('./auth/session').default);
	app.use('/api', require('./api/router').default);

	// Error handler
	app.use((err, req, res, next) => {
		console.warn(err)
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

	app.get('/$', (req, res) => res.redirect('/comments'));
	app.get('/comments', (req, res) => res.sendFile(path.join(__dirname, 'comments/index.html')));
	app.get('/membership', (req, res) => res.sendFile(path.join(__dirname, 'membership/index.html')));
	app.use(express.static(path.join(__dirname, '')));
	//app.get('*', (req, res) => res.redirect('/'));

	app.listen(app.get('port'), () => {
		console.log('App listening on port %s', app.get('port'))
		console.log('Press Ctrl+C to quit.')
	});

	return app;
}

initDatabase()
	.then(initServer)
	.catch(error => console.error(error));
