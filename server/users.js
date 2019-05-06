
module.exports = function (db) {
	var module = {};

	module.getUsers = function (req, res, next) {

		return db.query('SELECT * FROM users')
	}

	module.getAccessLevel = function (sapin, email, callback) {
		var SQL;
		if (sapin > 0) {
			SQL = db.format('SELECT * from users WHERE SAPIN=?', [sapin]);
		}
		else {
			SQL = db.format('SELECT * from users WHERE Email=?', [email]);
		}
		console.log(SQL);
		return db.query(SQL)
			.then(results => {
				console.log(JSON.stringify(results));
				return results.length > 0? results[0].Access: 1;
			})
	}

	module.addUser = function (req, res, next) {
		console.log(req.body);

		var entry = {
			SAPIN: req.body.SAPIN,
			Name: req.body.Name,
			Email: req.body.Email,
			Access: req.body.Access
		};

		var SQL = `INSERT INTO users (${Object.keys(entry)}) VALUES (${db.escape(Object.values(entry))});`;
		return db.query(SQL)
			.then(result => {
				entry.UserID = result.insertId;
				return entry;
			})
	}

	module.updateUser = function (req, res, next) {
  		console.log(req.body);

  		if (!req.body.hasOwnProperty('UserID')) {
  			return Promise.reject('Missing parameter UserID')
		}
		var id = req.body.UserID;

		var entry = {
			SAPIN: req.body.SAPIN,
			Name: req.body.Name,
			Email: req.body.Email,
			Access: req.body.Access
		};
		Object.keys(entry).forEach(key => {
			if (entry[key] === undefined) {
				delete entry[key]
			}
		});
		if (Object.keys(entry).length === 0) {
			return Promise.resolve();
		}

  		return db.query("UPDATE users SET ? WHERE UserID=?",  [entry, id])
  			.then(result => {
				entry.UserID = id;
				return entry
			})
	}

	module.deleteUser = function (req, res, next) {
    	console.log(req.body);

		const userids = req.body;

		return db.query('DELETE FROM users WHERE userid IN (?)', [userids])
	}

	return module;
}