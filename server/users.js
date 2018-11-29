
module.exports = function (db) {
	var module = {};

	module.getAll = function (req, res, next) {
  		var ret = {status: "Error", message: "Unknown server error"};

   		db.query('SELECT * FROM users;', (err, results) => {
    		if (err) {
      			ret.message = JSON.stringify(err);
      			console.log(err);
      			return res
        			.status(200)
        			.send(ret);
   			}
    		console.log(`Send ${JSON.stringify(results)}`);
    		ret.status = 'OK';
    		ret.message = '';
    		ret.data = results;
    		return res
      			.status(200)
      			.send(ret);
  		});
	}

	module.getAccessLevel = function (sapin, email, callback) {
		if (sapin > 0) {
			SQL = 'SELECT * from users WHERE SAPIN=?';
			param = sapin;
		}
		else {
			SQL = 'SELECT * from users WHERE Email=?';
			param = email;
		}
		console.log(SQL + param);
		db.query(SQL, param, (err, results) => {
			console.log(JSON.stringify(results));
			if (err) {
				console.log(err);
				callback(1);
			}
			else {
				callback(results[0].Access);
			}
		});
	}

	module.add = function (req, res, next) {
		const data = req.body;
		console.log(data);

		var ret = {status: "Error", message: "Unknown server error"};

		var SQL = 'INSERT INTO users (SAPIN, Name, Email, Access) VALUES (?, ?, ?, ?);';
		db.query(SQL, [data.SAPIN, data.Name, data.Email, data.Access], (err, result) => {
			if (err) {
				console.log(err);

				ret.status = 'Error';
				ret.message = JSON.stringify(err);
				return res
					.status(200)
					.send(ret)
			}
			console.log(result);
			data.userid = result.insertId;
			ret.status = 'OK';
			ret.message = '';
			ret.data = data;
			//ret.data = result.data;
			return res
				.status(200)
				.send(ret)
		});
	}

	module.update = function (req, res, next) {
  		console.log(req.body);

  		// We use the email address as the primary key. It is also the username for authentication, so we can't change it
  		var email = req.body['Email'];
  		delete req.body['Email'];
  		console.log(req.body);

  		var ret = {status: "Error", message: "Unknown server error"};

  		db.query("UPDATE users SET ? WHERE Email=?",  [req.body, email], function(err, result) {
    		if (err) {
      			console.log(err.message);
      			ret.message = JSON.stringify(err);
      			return res
        			.status(200)
        			.send(ret);
    		}
    		ret.status = 'OK';
    		ret.message = '';
    		return res
      			.status(200)
      			.send(ret);
  		});
	}

	module.delete = function (req, res, next) {
    	console.log(req.body);

    	const userids = req.body;

    	var ret = {status: "Error", message: "Unknown server error"};

    	db.query('DELETE FROM users WHERE userid IN (?)', [userids], function(err, result) {
      		if (err) {
        		console.log(err.message);
        		ret.message = JSON.stringify(err);
        		return res
          			.status(200)
          			.send(ret);
      		}
      		ret.status = "OK";
      		ret.message = "";
      		return res
        		.status(200)
        		.send(ret);
    	});
	}

	module.import = function (req, res, next) {
	}

	return module;
}