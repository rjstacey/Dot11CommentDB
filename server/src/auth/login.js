import {Router} from 'express';
import { createIeeeFetcher } from '../utils';
import {selectUser, getUser, setUser, delUser} from '../services/users';

//const cheerio = require('cheerio');
const db = require('../utils/database');
const jwt = require('./jwt');

const loginUrl = '/pub/login';
const logoutUrl = '/pub/logout';

async function login(ieeeClient, username, password) {
	let m, response;

	// Do an initial GET on /pub/login so that we get cookies. We can do a login without this, but
	// if we don't get the cookies associated with this GET, then the server seems to get confused
	// and won't have the approriate state post login.
	response = await ieeeClient.get(loginUrl);

	if (response.headers['content-type'] !== 'text/html' ||
		typeof response.data !== 'string' ||
		response.data.search(/<div class="title">Sign In<\/div>/) === -1) {
		throw new Error('Unexpected login page');
	}

	//const $ = cheerio.load(response.data);
	m = /name="v" value="(.*)"/.exec(response.data);
	const v = m? m[1]: '1';
	m = /name="c" value="(.*)"/.exec(response.data);
	const c = m? m[1]: '';

	const loginForm = {
		v: v, //: $('input[name="v"]').val(),
		c: c, //: $('input[name="c"]').val(),
		x1: username,
		x2: password,
		f0: 1, // "Sign In To" selector (1 = Attendance Tool, 2 = Mentor, 3 = My Project, 4 = Standards Dictionary)
		privacyconsent: 'on',
		ok_button: 'Sign+In'
	}

	// Now post the login data. There will be a bunch of redirects, but we should get a logged in page.
	// options.form = loginForm;
	response = await ieeeClient.post(loginUrl, loginForm);
	//console.log(response)

	if (response.data.search(/<div class="title">Sign In<\/div>/) !== -1) {
		m = /<div class="field_err">([^<]*)<\/div>/.exec(response.data);
		//console.log(response.data)
		throw new Error(m? m[1]: 'Not logged in');
	}

	m = /<span class="attendance_nav">Home - (.*), SA PIN: (\d+)<\/span>/.exec(response.data);
	if (!m) {
		m = /<div class="title">([^<]*)<\/div>/.exec(response.data);
		throw new Error(m? m[1]: 'Unexpected login page');
	}

	const Name = m[1];
	const SAPIN = parseInt(m[2], 10);

	// Add an interceptor that will login again if a request returns the login page
	ieeeClient.interceptors.response.use(
		(response) => {
			if (response.headers['content-type'] === 'text/html' &&
				typeof response.data === 'string' && 
				response.data.search(/<div class="title">Sign In<\/div>/) !== -1) {
				console.log('Try login again')
				m = /name="v" value="(.*)"/.exec(response.data);
				const v = m? m[1]: '1';
				m = /name="c" value="(.*)"/.exec(response.data);
				const c = m? m[1]: 'aNA__';
				const loginForm = {
					v,
					c,
					x1: username,
					x2: password,
					f0: 1,
					privacyconsent: 'on',
					ok_button: 'Sign+In'
				}
				return ieeeClient.post(loginUrl, loginForm);
			}
			return response;
		}
	);

	return {SAPIN, Name, Email: username};
}

function logout(ieeeClient) {
	return ieeeClient.get(logoutUrl);
}

/*
 * login API
 *
 * GET /login: get current user information
 * POST /login: login with supplied credentials and return user information
 * POST /logout: logout
 */
const router = Router();

router.get('/login', async (req, res, next) => {
	try {
		const userId = jwt.verify(req);
		const {ieeeClient, ...user} = await getUser(userId);
		res.json({user});
	}
	catch (err) {
		res.json({user: null});
	}
})

router.post('/login', async (req, res, next) => {
	try {
		// credentials
		const {username, password} = req.body;

		const ieeeClient = createIeeeFetcher();

		const {SAPIN, Name, Email} = await login(ieeeClient, username, password);

		const user = (await selectUser({SAPIN, Email})) || {SAPIN, Name, Email, Access: 0, Permissions: []};

		user.Token = jwt.token(user.SAPIN);
		setUser(user.SAPIN, {...user, ieeeClient});

		res.json({user});
	}
	catch (err) {next(err)}
})

router.post('/logout', async (req, res, next) => {
	try {
		const userId = jwt.verify(req);
		const user = await getUser(userId);
		if (user) {
			if (user.ieeeClient)
				logout(user.ieeeClient);
			delUser(user.SAPIN);
		}
		res.json({user: null});
	}
	catch (err) {next(err)}
})

export default router;
