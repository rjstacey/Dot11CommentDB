
module.exports = function (db, request, users) {
  var module = {};
  
	module.login = function (req, res, next) {

    //console.log(request);

		const loginForm = {
    	x1: req.body.username,
    	x2: req.body.password,
    	tz: req.body.tz,   // Timezone (not really needed)
    	v: 1,   // ?
    	f0: 3,   // "Sign In To" selector (1 = Attendance Tool, 2 = Mentor, 3 = My Project, 4 = Standards Dictionary)
    	privacyconsent: 'on'
  	};

  	// Server side session for this user
  	// If we haven't already done so, create a cookie jar for ieee.org.
  	const sess = req.session;
  	if (sess.ieeeCookieJar === undefined) {
    	sess.ieeeCookieJar = request.jar();
  	}
  	sess.username = req.body.username;

  	var ret = {status: "Error", message: "Unknown server error"};

    const options = {
    	url: 'https://development.standards.ieee.org/pub/login',
      followAllRedirects: true,
      jar: sess.ieeeCookieJar
    };

    // Do an initial GET on /pub/login so that we get cookies. We can do a login without this, but
    // if we don't get the cookies associated with this GET, then the server seems to get confused
    // and won't have the approriate state post login.
    return request
      .get(options, (err, ieeeRes, body) => {

        if (err) {
          console.log(err);
          return res
            .status(200)
            .send(ret);
        }

        // Now post the login data. There will be a bunch of redirects, but we should get a logged in page.
        options.form = loginForm;
   	    return request
          .post(options, (err, ieeeRes, body) => {

            if (err) {
        	    console.log(err);
        	    return res
        		    .status(200)
        		    .send(ret);
            }

            var m = body.match(/<div class="welcome">\s*<strong>(.*)<\/strong>/);
            if (m) {
              // Got the "welcome" webpage so we are logged in
              console.log(m[1]);
              sess.name = m[1];

              // Update the URL to the user's home and do another get.
              options.url = 'https://development.standards.ieee.org/' + sess.username + '/home';
              return request
                .get(options, (err, ieeeRes, body) => {
                  if (err) {
                    console.log(err);
                    return res
                      .status(200)
                      .send(ret);
                  }

                  // We should receive a bold message: Welcome: <username> (SA PIN: <sapin>)
                  //console.log(body);
                  var n = body.match(/<big>Welcome: (.*) \(SA PIN: ([0-9]+)\)<\/big>/);
                  //console.log(n);
                  if (n) {
                    sess.sapin = n[2];
                  }
                  users.getAccessLevel(sess.sapin, sess.username, (access) => {
                    console.log('access level = ' + access);
                    sess.access = access;

                    ret.status = 'OK';
                    ret.message = '';
                    ret.data = {name: sess.name, sapin: sess.sapin, access: sess.access};
                    return res
                      .status(200)
                      .send(ret);
                  });
                });
            }

            m = body.match(/<div class="field_err">(.*)<\/div>/);
            if (m) {
              // Got the "field error" web page; authentication error
              console.log(m[1]);
              ret.message = m[1];
              return res
                .status(200)
                .send(ret);
            }

            // Don't really know what we got
            ret.message = 'Not logged in';
            return res
	           .status(200)
	           .send(ret);
          });
      });
	}

	module.logout = function (req, res, next) {
		console.log(req.headers);

  		var sess = req.session;

  		var ret = {status: "Error", message: "Unknown server error"};

  		request.get({url: 'https://development.standards.ieee.org/pub/logout', jar: sess.ieeeCookieJar}, (err, response, body) => {
    		if (err) {
      			ret.message = 'problem with logout: ' + err;
      			return res
        			.send(ret);
    		}
    		ret.status = 'OK';
    		ret.message = '';
    		return res
      			.send(ret);
  		});
	}

  return module;
}