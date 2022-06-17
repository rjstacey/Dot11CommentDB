import { createFetcher } from '../utils';

const cheerio = require('cheerio');
const db = require('../utils/database');
const users = require('./users');
const jwt = require('./jwt');


async function login(req) {

	// credentials
	const {username, password} = req.body;

	const ieeeClient = createFetcher();

	// Do an initial GET on /pub/login so that we get cookies. We can do a login without this, but
	// if we don't get the cookies associated with this GET, then the server seems to get confused
	// and won't have the approriate state post login.
	let response = await ieeeClient.get('https://imat.ieee.org/pub/login');

	const $ = cheerio.load(response.data);
	const loginForm = {
		v: $('input[name="v"]').val(),
		c: $('input[name="c"]').val(),
		x1: username,
		x2: password,
		f0: 1, // "Sign In To" selector (1 = Attendance Tool, 2 = Mentor, 3 = My Project, 4 = Standards Dictionary)
		privacyconsent: 'on',
		ok_button: 'Sign+In'
	}

	// Now post the login data. There will be a bunch of redirects, but we should get a logged in page.
	// options.form = loginForm;
	response = await ieeeClient.post('https://imat.ieee.org/pub/login', new URLSearchParams(loginForm));
	//console.log(response)

	if (response.data.search(/<div class="title">Sign In<\/div>/) !== -1) {
		const m = response.data.match(/<div class="field_err">(.*)<\/div>/);
		throw new Error(m? m[1]: 'Not logged in');
	}

	const n = response.data.match(/<span class="attendance_nav">Home - (.*), SA PIN: ([0-9]+)<\/span>/)
	if (!n)
		throw new Error('Unexpected login page');

	const Name = n[1];
	const SAPIN = parseInt(n[2], 10);


	return {SAPIN, Name, Email: username, ieeeClient};
}

function logout({ieeeClient}) {
	if (ieeeClient)
		return ieeeClient.get('https://imat.ieee.org/pub/logout');
}

/*
 * login API
 *
 * GET /login: get current user information
 * POST /login: login with supplied credentials and return user information
 * POST /logout: logout
 */
const router = require('express').Router();

router.get('/login', async (req, res, next) => {
	try {
		const userId = jwt.verify(req);
		const {ieeeClient, ...user} = await users.getUser(userId);
		res.json({user});
	}
	catch (err) {
		res.json({user: null});
	}
})

router.post('/login', async (req, res, next) => {
	try {
		const {SAPIN, Name, Email, ieeeClient} = await login(req);

		const SQL = 'SELECT SAPIN, Name, Email, Status, Access FROM members WHERE ' +
			(SAPIN > 0? `SAPIN=${db.escape(SAPIN)}`: `Email=${db.escape(Email)}`);
		const results = await db.query(SQL);
		const user = (results.length > 0)
			? results[0]
			: {SAPIN, Name, Email, Access: 0};

		/* Hack: adjust my access */
		if (user.SAPIN === 5073)
			user.Access = 3;

		user.Token = jwt.token(user.SAPIN);
		users.setUser(user.SAPIN, {...user, ieeeClient});

		res.json({user});
	}
	catch (err) {next(err)}
})

router.post('/logout', async (req, res, next) => {
	try {
		const userId = jwt.verify(req);
		const user = await users.getUser(userId);
		if (user) {
			logout(user);
			users.delUser(user.SAPIN);
		}
		res.json({user: null});
	}
	catch (err) {next(err)}
})

export default router;
