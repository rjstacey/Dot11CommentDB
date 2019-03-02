
const csvParse = require('csv-parse/lib/sync')

function parseVoters(csvArray) {
	// Row 0 is the header:
	 // 'SA PIN', 'Date', 'Vote', 'Email'
	csvArray.shift();
	return csvArray.map(c => {
		return {
			SAPIN: c[0],
			Name: c[1],
			Email: c[2]
		}
	});
}


module.exports = function(db, rp) {
	var module = {};

	module.getVotingPool = function (req, res, next) {
		const sess = req.session;

		// Get a list of BallotIDs in BallotSeries. Keep them in order of ballot start date.
		const SQL = `SELECT vp.*, (SELECT COUNT(*) FROM voters AS v WHERE vp.VotingPoolID = v.VotingPoolID) AS VoterCount FROM votingpool AS vp ORDER BY Date`;
		return db.query2(SQL)
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
		return db.query2(SQL)
	}

	module.addVotingPool = (req, res, next) => {
		console.log(req.body);

		if (!req.body.hasOwnProperty('VotingPoolID')) {
			return Promise.reject('Missing parameter VotingPoolID')
		}

		var entry = {
			VotingPoolID: req.body.VotingPoolID,
			Name: req.body.Name,
			Date: new Date(req.body.Date).toISOString().slice(0, 10)
		}

		var SQL = `INSERT INTO votingpool (${Object.keys(entry)}) VALUES (${db.escape(Object.values(entry))});` +
			`SELECT vp.*, (SELECT COUNT(*) FROM voters AS v WHERE vp.VotingPoolID = v.VotingPoolID) AS VoterCount FROM votingpool AS vp WHERE vp.VotingPoolID = ${db.escape(entry.VotingPoolID)}`;
		console.log(SQL)
		return db.query2(SQL)
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

		return db.query2('SELECT * FROM voters WHERE VotingPoolID=?', [votingPoolId])
	}

	module.addVoter = function (req, res, next) {
		console.log(req.body);

		if (!req.body.hasOwnProperty('VotingPoolID')) {
			return Promise.reject('Missing parameter VotingPoolID')
		}

		var entry = {
			VotingPoolID: req.body.VotingPoolID,
			SAPIN: req.body.SAPIN,
			Name: req.body.Name,
			Email: req.body.Email,
		};

		const SQL = `INSERT INTO voters (${Object.keys(entry)}) VALUES (${db.escape(Object.values(entry))}); SELECT * FROM voters WHERE VotingPoolID=${db.escape(entry.BallotID)}`;
		db.query2(SQL)
			.then(result => {
				if (results.length !== 2 || results[1].length != 1) {
					throw "Unexpected result"
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
		return db.query2(SQL)
	}

	module.uploadVoters = (req, res, next) => {
		console.log(req.body);

		var votingPoolId = req.body.VotingPoolID;
		if (!votingPoolId) {
			return Promise.reject('Missing parameter VotingPoolID')
	    }
	    console.log(req.file)
		if (!req.file) {
			return Promise.reject('Got unexpected file type');
		}

		var votersArray = csvParse(req.file.buffer);
		if (votersArray.length === 0 || votersArray[0].length < 3) {
			return Promise.reject(votersArray.length === 0?
						'Got empty .csv file':
						`Unexpected number of columns ${voters[0].length} in .csv file`)
		}

		var voters = parseVoters(votersArray);
		if (voters.length === 0) {
			return Promise.resolve({Count: 0})
		}

		var SQL = `INSERT INTO voters (VotingPoolID, ${Object.keys(voters[0])}) VALUES`;
		voters.forEach((c, i) => {
			SQL += (i > 0? ',': '') + `(${db.escape(votingPoolId)}, ${db.escape(Object.values(c))})`;
		});
		SQL += ";\n";
		console.log(SQL);

		return db.query2(SQL)
			.then(result => {
				return {Count: voters.length}
			})
			.catch(err => {
				throw err.code === 'ER_DUP_ENTRY'? "Entry already exists with this ID": err
			});
	}

	return module;
}