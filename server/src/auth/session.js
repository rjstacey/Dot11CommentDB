const cheerio = require('cheerio')
const rp = require('request-promise-native')
const users = require('../services/users')

function getState(req) {
	const sess = req.session
	var info = null
	if (sess.username) {
		info = {
			username: sess.username,
			name: sess.name,
			sapin: sess.sapin,
			access: sess.access
		}
	}
	return info
}
  
async function login(req) {
	// Server side session for this user
	// If we haven't already done so, create a cookie jar for ieee.org.
	//var sess = req.session;
	if (req.session.ieeeCookieJar === undefined) {
		req.session.ieeeCookieJar = rp.jar()
	}
	req.session.username = req.body.username

	const options = {
		url: 'https://imat.ieee.org/pub/login',
		jar: req.session.ieeeCookieJar,
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
		x1: req.body.username,
		x2: req.body.password,
		f0: 1, // "Sign In To" selector (1 = Attendance Tool, 2 = Mentor, 3 = My Project, 4 = Standards Dictionary)
		privacyconsent: 'on',
		ok_button: 'Sign+In'
	}

	// Now post the login data. There will be a bunch of redirects, but we should get a logged in page.
	// options.form = loginForm;
	ieeeRes = await rp.post(Object.assign({}, options, {form: loginForm}));
	if (ieeeRes.statusCode === 200 && ieeeRes.body.search(/<div class="title">Sign In<\/div>/) !== -1) {
		m = ieeeRes.body.search(/<div class="field_err">(.*)<\/div>/)
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
	req.session.name = n? n[1]: 'Unknown'
	req.session.sapin = n? n[2]: 0
	req.session.access = await users.getAccessLevel(req.session.sapin, req.session.username)

	console.log('access level = ' + req.session.access)
	const info = {
		username: req.session.username,
		name: req.session.name, 
		sapin: req.session.sapin, 
		access: req.session.access,
	}

	/*newOptions = {
		url: `https://mentor.ieee.org/802.11/polls/closed?n=1`,
		jar: sess.ieeeCookieJar
	}
	ieeeRes = await rp.get(newOptions)
	var $ = cheerio.load(ieeeRes);
	console.log($('div.title').html())*/

	return info
}

function logout(req) {
	req.session.access = 0
	rp.get({url: 'https://imat.ieee.org/pub/logout', jar: req.session.ieeeCookieJar})
}

/*
* Session API
*
* GET /login: get current session information
* POST /login: login with supplied credentials and return session information
* POST /logout: logout
*/
const router = require('express').Router()
router.get('/login', (req, res, next) => {
	try {
		const data = getState(req)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.post('/login', async (req, res, next) => {
	try {
		const data = await login(req)
		res.json(data)
	}
	catch(err) {next(err)}
})
router.post('/logout', (req, res, next) => {
	try {
		logout(req)
		res.json(null)
	}
	catch(err) {next(err)}
})

module.exports = router
