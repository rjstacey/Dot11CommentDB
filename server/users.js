const csvParse = require('csv-parse/lib/sync');

function parseUsersCsv(usersCsv) {

	const p = csvParse(usersCsv, {columns: false});
	if (p.length === 0) {
		throw 'Got empty membership.csv';
	}

	// Row 0 is the header
	expected = ['SA PIN', 'LastName', 'FirstName', 'MI', 'Email', 'Status'];
	if (expected.reduce((r, v, i) => v !== p[0][i], false)) {
		throw `Unexpected column headings ${p[0].join()}. Expected ${expected.join()}.`
	}
	p.shift();

	return p.map(c => {
		return {
			SAPIN: c[0],
			Name: c[2] + ' ' + c[3] + ' ' + c[1],
			LastName: c[1],
			FirstName: c[2],
			MI: c[3],
			Email: c[4],
			Status: c[5],
		}
	});
}

module.exports = function (db) {
	var module = {};

	module.getUsers = (req, res, next) => {

		return db.query('SELECT * FROM users')
	}

	module.getAccessLevel = async (sapin, email, callback) => {
		var SQL;
		if (sapin > 0) {
			SQL = db.format('SELECT * from users WHERE SAPIN=?', [sapin]);
		}
		else {
			SQL = db.format('SELECT * from users WHERE Email=?', [email]);
		}
		console.log(SQL);
		const results = await db.query(SQL)
		return results.length > 0? results[0].Access: 0;
	}

	module.addUser = async (req, res, next) => {
		//console.log(req.body);

		var entry = {
			SAPIN: req.body.SAPIN,
			Name: req.body.Name,
			Email: req.body.Email,
			Access: req.body.Access
		};

		const results = await db.query(
			'INSERT INTO users (??) VALUES (?);',
			[Object.keys(entry), Object.values(entry)]
			)
		entry.UserID = result.insertId;
		return entry;
	}

	module.updateUser = async (req, res, next) => {
  		//console.log(req.body);

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

  		await db.query("UPDATE users SET ? WHERE UserID=?",  [entry, id])
		entry.UserID = id;
		return entry
	}

	module.deleteUser = (req, res, next) => {
    	//console.log(req.body);

		const userids = req.body;

		return db.query('DELETE FROM users WHERE userid IN (?)', [userids])
	}

	module.uploadUsers = async (req, res, next) => {
		//console.log(req.body);

		console.log(req.file)
		if (!req.file) {
			return Promise.reject('Missing file')
		}
		var users = parseUsersCsv(req.file.buffer);
		//console.log(users);

		if (users.length === 0) {
			console.log('no users')
			return {Count: 0}
		}

		const SQL = `INSERT INTO users (${Object.keys(users[0])}) VALUES ` +
			users.map(u => {return '(' + db.escape(Object.values(u)) + ')'}).join(',') +
			' ON DUPLICATE KEY UPDATE ' +
			'Name=VALUES(Name), LastName=VALUES(LastName), FirstName=VALUES(FirstName), MI=VALUES(MI), Email=VALUES(Email), Status=VALUES(Status);' +
			'SELECT * FROM users;';
		const results = await db.query(SQL);
		return results[1];
	}

	return module;
}