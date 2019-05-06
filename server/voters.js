
const csvParse = require('csv-parse/lib/sync')

function parseVoters(votersCsvBuffer) {

	const p = csvParse(votersCsvBuffer, {columns: false});
	if (p.length === 0) {
		throw 'Got empty .csv file';
	}

	// Row 0 is the header
	expected = ['SA PIN', 'LastName', 'FirstName', 'MI', 'Email'];
	if (expected.reduce((r, v, i) => v !== p[0][i], false)) {
		throw `Unexpected column headings ${p[0].join()}. Expected ${expected.join()}.`
	}
	p.shift();

	return p.map(c => {
		return {
			SAPIN: c[0],
			LastName: c[1],
			FirstName: c[2],
			MI: c[3],
			Email: c[4]
		}
	});
}


module.exports = function(db, rp) {
	var module = {};

	module.getVotingPool = function (req, res, next) {
		const SQL = 'SELECT vp.*, (SELECT COUNT(*) FROM voters AS v WHERE vp.VotingPoolID = v.VotingPoolID) AS VoterCount FROM votingpool AS vp ORDER BY vp.Name';
		return db.query(SQL)
	}

	module.deleteVotingPool = function (req, res, next) {
		console.log(req.body);

		var where = '';
		if (req.body.hasOwnProperty('VotingPoolIDs')) {
			if (!Array.isArray(req.body.VotingPoolIDs)) {
				return Promise.reject('Parameter VotingPoolIDs must be an array')
			}
			where = ` WHERE VotingPoolID IN (${db.escape(req.body.VotingPoolIDs.join())})`;
		}
		else if (req.body.hasOwnProperty('VotingPoolID')) {
			where = ` WHERE VotingPoolID=${db.escape(req.body.VotingPoolID)}`;
		}
		else {
			return Promise.reject('Missing parameter; must have VotingPoolID or VotingPoolIDs')
		}

		var SQL = `DELETE FROM votingpool${where}; DELETE FROM voters${where}`;
		console.log(SQL);
		return db.query(SQL)
	}

	module.addVotingPool = (req, res, next) => {
		console.log(req.body);

		if (!req.body.hasOwnProperty('VotingPoolID')) {
			return Promise.reject('Missing parameter VotingPoolID')
		}

		var entry = {
			VotingPoolID: req.body.VotingPoolID,
			Name: req.body.Name
		}

		var SQL = `INSERT INTO votingpool (${Object.keys(entry)}) VALUES (${db.escape(Object.values(entry))});` +
			`SELECT vp.*, (SELECT COUNT(*) FROM voters AS v WHERE vp.VotingPoolID = v.VotingPoolID) AS VoterCount FROM votingpool AS vp WHERE vp.VotingPoolID = ${db.escape(entry.VotingPoolID)}`;
		console.log(SQL)
		return db.query(SQL)
			.then(results => {
				if (results.length !== 2) {
					throw "Unexpected SQL query result"
				}
				return results[1][0]
			})
			.catch(err => {
				throw err.code === 'ER_DUP_ENTRY'? "An entry already exists with this ID": JSON.stringify(err)
			})
	}

	module.getVoters = function (req, res, next) {
		const sess = req.session;

		if (!req.query.hasOwnProperty('VotingPoolID')) {
			return Promise.reject('Missing parameter VotingPoolID')
		}
		votingPoolId = req.query.VotingPoolID;

		return db.query('SELECT * FROM votingpool WHERE VotingPoolID=?; SELECT * FROM voters WHERE VotingPoolID=?', [votingPoolId, votingPoolId])
			.then(results => {
				if (results.length !== 2 || results[0].length != 1) {
					throw "Unexpected SQL result"
				}
				return {
					votingPool: results[0][0],
					voters: results[1]
				}
			})
	}

	module.addVoter = function (req, res, next) {
		console.log(req.body);

		if (!req.body.hasOwnProperty('VotingPoolID')) {
			return Promise.reject('Missing parameter VotingPoolID')
		}

		var entry = {
			VotingPoolID: req.body.VotingPoolID,
			SAPIN: req.body.SAPIN,
			LastName: req.body.LastName,
			FirstName: req.body.FirstName,
			MI: req.body.MI,
			Email: req.body.Email
		};

		const SQL = `INSERT INTO voters (${Object.keys(entry)}) VALUES (${db.escape(Object.values(entry))}); SELECT * FROM voters WHERE VotingPoolID=${db.escape(entry.VotingPoolID)}`;
		console.log(SQL)
		return db.query(SQL)
			.then(results => {
				console.log(results)
				if (results.length !== 2 || results[1].length !== 1) {
					throw "Unexpected SQL result"
				}
				return results[1][0];
			})
	}

	module.deleteVoters = function (req, res, next) {
		console.log(req);

		var where = '';
		if (req.body.hasOwnProperty('VotingPoolIDs')) {
			if (!Array.isArray(req.body.VotingPoolIDs)) {
				return Promise.reject('Parameter VotingPoolIDs must be an array')
			}
			where = ` WHERE VotingPoolID IN (${db.escape(req.body.VotingPoolIDs.join())})`;
		}
		else if (req.body.hasOwnProperty('VotingPoolID')) {
			where = ` WHERE VotingPoolID=${db.escape(req.body.VotingPoolID)}`;
		}
		else {
			return Promise.reject('Missing parameter; must have VotingPoolID or VotingPoolIDs')
		}

		var SQL = `DELETE FROM voters${where}`;
		console.log(SQL);
		return db.query(SQL)
	}

	module.uploadVoters = (req, res, next) => {
		//console.log(req);

		var votingPoolId = req.body.VotingPoolID;
		if (!votingPoolId) {
			return Promise.reject('Missing parameter VotingPoolID')
	    }
	    //console.log(req.file)
		if (!req.file) {
			return Promise.reject('Missing file');
		}

		var voters = parseVoters(req.file.buffer);

		return db.query('DELETE FROM voters WHERE VotingPoolID=?', [votingPoolId])
			.then(result => {

				if (voters.length === 0) {
					return Promise.resolve({Count: 0})
				}

				var SQL = `INSERT INTO voters (VotingPoolID, ${Object.keys(voters[0])}) VALUES`;
				voters.forEach((c, i) => {
					SQL += (i > 0? ',': '') + `(${db.escape(votingPoolId)}, ${db.escape(Object.values(c))})`;
				});
				SQL += ";\n";
				//console.log(SQL);
				return db.query(SQL)
					.then(result => {
						return {Count: voters.length}
					})
					.catch(err => {
						throw err.code === 'ER_DUP_ENTRY'? "Entry already exists with this ID": err
					});
			})
	}

	return module;
}