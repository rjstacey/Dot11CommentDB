var cheerio = require('cheerio');

module.exports = function (db, rp, users) {
  var module = {};

  module.getState = function (req, res, next) {
    const sess = req.session;
    var ret = {status: "OK", data: null};
    if (sess.username) {
      ret.data = {
        username: sess.username,
        name: sess.name,
        sapin: sess.sapin,
        access: sess.access
      };
    }
    res.status(200).send(ret);
  }
  
	module.login = function (req, res, next) {

  	// Server side session for this user
  	// If we haven't already done so, create a cookie jar for ieee.org.
  	var sess = req.session;
  	if (sess.ieeeCookieJar === undefined) {
    	sess.ieeeCookieJar = rp.jar();
  	}
  	sess.username = req.body.username;

    var options = {
    	url: 'https://development.standards.ieee.org/pub/login',
      //followAllRedirects: true,
      jar: sess.ieeeCookieJar,
      resolveWithFullResponse: true,
      simple: false
    };

    // Do an initial GET on /pub/login so that we get cookies. We can do a login without this, but
    // if we don't get the cookies associated with this GET, then the server seems to get confused
    // and won't have the approriate state post login.
    rp.get(options)
      .then(ieeeRes => {

        var $ = cheerio.load(ieeeRes.body);
        var loginForm = {
          v: $('input[name="v"]').val(),
          c: $('input[name="c"]').val(),
          x1: req.body.username,
          x2: req.body.password,
          f0: 3, // "Sign In To" selector (1 = Attendance Tool, 2 = Mentor, 3 = My Project, 4 = Standards Dictionary)
          privacyconsent: 'on',
          ok_button: 'Sign+In'
        };

        // Now post the login data. There will be a bunch of redirects, but we should get a logged in page.
        //options.form = loginForm;
   	    return rp.post(Object.assign({}, options, {form: loginForm}));
      })
      .then(ieeeRes => {
        if (ieeeRes.statusCode === 302) {
          // Update the URL to the user's home and do another get.
          options.url = 'https://development.standards.ieee.org/' + sess.username + '/home';
          return rp.get(options);
        }
        else {
          m = ieeeRes.body.match(/<div class="field_err">(.*)<\/div>/);
          return Promise.reject(m? m[1]: 'Not logged in');
        }
      })
      .then(ieeeRes => {
        // We should receive a bold message: Welcome: <username> (SA PIN: <sapin>)
        var n = ieeeRes.body.match(/<big>Welcome: (.*) \(SA PIN: ([0-9]+)\)<\/big>/);
        sess.name = n? n[1]: 'Unknown';
        sess.sapin = n? n[2]: 0;

        users.getAccessLevel(sess.sapin, sess.username, (access) => {
          console.log('access level = ' + access);
          sess.access = access;

          var data = {
            username: sess.username,
            name: sess.name, 
            sapin: sess.sapin, 
            access: sess.access
          };
          res.status(200).send({
            status: 'OK',
            data: data
          });
        });
      })
      .catch(err => {
        res.status(200).send({
          status: 'Error',
          message: typeof err === 'string'? err: JSON.stringify(err)
        });
      });
	}

	module.logout = (req, res, next) => {
		console.log(req.headers);

		var sess = req.session;

		var ret = {status: "Error", message: "Unknown server error"};

		rp.get({url: 'https://development.standards.ieee.org/pub/logout', jar: sess.ieeeCookieJar})
      .then(body => {
        res.status(200).send({
          status: 'OK'
        });
      })
      .catch(err => {
        res.status(200).send({
          status: 'Error',
          message: JSON.stringify(err)
        });
      });
	}

  return module;
}