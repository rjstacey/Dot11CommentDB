const cheerio = require('cheerio')
const rp = require('request-promise-native')
const users = require('../services/users')
const jwt = require('./jwt')

async function login(req) {

	// credentials
	const {username, password} = req.body

	const ieeeCookieJar = rp.jar();

	const options = {
		url: 'https://imat.ieee.org/pub/login',
		jar: ieeeCookieJar,
		resolveWithFullResponse: true,
		simple: false,
		followAllRedirects: true
	}

	// Do an initial GET on /pub/login so that we get cookies. We can do a login without this, but
	// if we don't get the cookies associated with this GET, then the server seems to get confused
	// and won't have the approriate state post login.
	let ieeeRes = await rp.get(options)

	const $ = cheerio.load(ieeeRes.body)
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
	ieeeRes = await rp.post(Object.assign({}, options, {form: loginForm}));
	if (ieeeRes.statusCode === 200 && ieeeRes.body.search(/<div class="title">Sign In<\/div>/) !== -1) {
		const m = ieeeRes.body.match(/<div class="field_err">(.*)<\/div>/)
		throw m? m[1]: 'Not logged in'
	}

	// Update the URL to the user's home and do another get.
	//options.url = 'https://development.standards.ieee.org/' + req.session.username + '/home';
	//ieeeRes = await rp.get(options);

	// We should receive a bold message: Welcome: <name> (SA PIN: <sapin>)
	//var n = ieeeRes.body.match(/<big>Welcome: (.*) \(SA PIN: ([0-9]+)\)<\/big>/);
	// We should receive a message: Home - <name>, SA PIN: <sapin>
	//console.log(ieeeRes.body)
	const n = ieeeRes.body.match(/<span class="attendance_nav">Home - (.*), SA PIN: ([0-9]+)<\/span>/)
	if (!n) {
		throw 'Unexpected login page'
	}
	const name = n[1]
	const sapin = parseInt(n[2], 10)
	let user = await users.getUser(sapin, username)
	if (user === null) {
		// User not in database; create new entry with default access level
		if (sapin) {
			user = await users.addUser({SAPIN: sapin, Name: name, Access: 0})
		}
		else {
			throw 'SAPIN not available'
		}
	}
	else {
		// User info in database differs from login info; update user
		if (user.SAPIN !== sapin || user.Email !== username || user.Name !== name) {
			let newUser = Object.assign({}, user, {SAPIN: sapin, Name: name})
			user = await users.updateUser(user.SAPIN, newUser)
			console.log('update user:', user, newUser)
		}
	}

	/* Hack: adjust my access */
	if (user.SAPIN === 5073)
		user.Access = 3;

	/*newOptions = {
		url: `https://mentor.ieee.org/802.11/polls/closed?n=1`,
		jar: sess.ieeeCookieJar
	}
	ieeeRes = await rp.get(newOptions)
	var $ = cheerio.load(ieeeRes);
	console.log($('div.title').html())*/

	return {user, ieeeCookieJar};
}

function logout(ieeeCookieJar) {
	return rp.get({url: 'https://imat.ieee.org/pub/logout', jar: ieeeCookieJar})
}

/*
* Session API
*
* GET /login: get current session information
* POST /login: login with supplied credentials and return session information
* POST /logout: logout
*/
const router = require('express').Router()
router.get('/login', async (req, res, next) => {
	try {
		const userId = jwt.verify(req);
		const {ieeeCookieJar, ...user} = await users.getUser(userId);
		res.json({user});
	}
	catch (err) {
		res.json({user: null});
	}
})

router.post('/login', async (req, res, next) => {
	try {
		const {user, ieeeCookieJar} = await login(req);

		user.Token = jwt.token(user.SAPIN);
		users.setUser(user.SAPIN, {...user, ieeeCookieJar});

		res.json({user});
	}
	catch (err) {next(err)}
})

router.post('/logout', async (req, res, next) => {
	try {
		const userId = jwt.verify(req);
		const user = await users.getUser(userId);
		if (user) {
			logout(user.ieeeCookieJar);
			users.delUser(user.SAPIN);
		}
		res.json({user: null});
	}
	catch (err) {next(err)}
})

export default router;
