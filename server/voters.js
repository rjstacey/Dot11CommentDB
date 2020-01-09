
const csvParse = require('csv-parse/lib/sync')

function parseVoters(votersCsvBuffer) {

	const p = csvParse(votersCsvBuffer, {columns: false});
	if (p.length === 0) {
		throw 'Got empty .csv file';
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
			LastName: c[1],
			FirstName: c[2],
			MI: c[3],
			Email: c[4],
			Status: c[5]
		}
	});
}


module.exports = function(db, rp) {
	var module = {};

	module.getVotingPool = function (req, res, next) {

		const {access} = req.session;
		if (access <= 1) {
			return Promise.reject('Insufficient karma')
		}

		return db.query(
			'SELECT vp.*, (SELECT COUNT(*) FROM voters AS v WHERE vp.VotingPoolID = v.VotingPoolID) AS VoterCount ' + 
			'FROM votingpool AS vp ORDER BY vp.Name'
			);
	}

	module.deleteVotingPool = function (req, res, next) {
		//console.log(req.body);

		const {access} = req.session;
		if (access <= 2) {
			return Promise.reject('Insufficient karma')
		}

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

	module.addVotingPool = async (req, res, next) => {
		//console.log(req.body);

		const {access} = req.session;
		if (access <= 2) {
			return Promise.reject('Insufficient karma')
		}

		if (!req.body.hasOwnProperty('VotingPoolID')) {
			return Promise.reject('Missing parameter VotingPoolID')
		}

		var entry = {
			VotingPoolID: req.body.VotingPoolID,
			Name: req.body.Name
		}

		var SQL = db.format(
			'INSERT INTO votingpool (??) VALUES (?); ' +
			'SELECT vp.*, (SELECT COUNT(*) FROM voters AS v WHERE vp.VotingPoolID = v.VotingPoolID) AS VoterCount ' +
			'FROM votingpool AS vp WHERE vp.VotingPoolID=?',
			[Object.keys(entry), Object.values(entry), entry.VotingPoolID]
			);
		console.log(SQL)
		try {
			const results = await db.query(SQL)
			if (results.length !== 2) {
				throw "Unexpected SQL query result"
			}
			return results[1][0]
		}
		catch(err) {
			throw err.code === 'ER_DUP_ENTRY'? new Error("An entry already exists with this ID"): err
		}
	}

	module.getVoters = async function (req, res, next) {

		const {access} = req.session;
		if (access <= 1) {
			return Promise.reject('Insufficient karma')
		}

		if (!req.query.hasOwnProperty('VotingPoolID')) {
			return Promise.reject('Missing parameter VotingPoolID')
		}
		votingPoolId = req.query.VotingPoolID;

		const results = await db.query(
			'SELECT * FROM votingpool WHERE VotingPoolID=?; ' + 
			'SELECT * FROM voters WHERE VotingPoolID=?',
			[votingPoolId, votingPoolId]
			)
		if (results.length !== 2 || results[0].length != 1) {
			throw new Error("Unexpected SQL result")
		}
		return {
			votingPool: results[0][0],
			voters: results[1]
		}
	}

	module.addVoter = async (req, res, next) => {
		//console.log(req.body);

		const {access} = req.session;
		if (access <= 2) {
			return Promise.reject('Insufficient karma')
		}

		if (!req.body.hasOwnProperty('VotingPoolID')) {
			return Promise.reject('Missing parameter VotingPoolID')
		}

		var entry = {
			VotingPoolID: req.body.VotingPoolID,
			SAPIN: req.body.SAPIN,
			LastName: req.body.LastName,
			FirstName: req.body.FirstName,
			MI: req.body.MI,
			Email: req.body.Email,
			Status: req.body.Status
		};

		try {
			const results = await db.query(
				'INSERT INTO voters (??) VALUES (?); ' +
				'SELECT * FROM voters WHERE VotingPoolID=? AND SAPIN=?',
				[Object.keys(entry), Object.values(entry), entry.VotingPoolID, entry.SAPIN]);
			if (results.length !== 2 && results[1].length === 1) {
				console.log(results);
				throw new Error("Unexpected SQL result")
			}
			return results[1][0];
		}
		catch(err) {
			if (err.code === 'ER_DUP_ENTRY') {
				let msg = 
					`Cannot add voter with SAPIN ${entry.SAPIN} to voting pool ${entry.VotingPoolID}; ` +
					`a voter with that SAPIN already exists.`;
				throw new Error(msg);
			}
			throw err;
		}
	}

	module.updateVoter = async (req, res, next) => {
		//console.log(req.body);

		const {access} = req.session;
		if (access <= 2) {
			return Promise.reject('Insufficient karma')
		}

		if (!req.params.hasOwnProperty('votingPoolId') ||
			!req.params.hasOwnProperty('SAPIN')) {
			return Promise.reject('Missing parameter VotingPoolID and/or SAPIN')
		}
		const votingPoolId = parseInt(req.params.votingPoolId, 10);
		const SAPIN = parseInt(req.params.SAPIN, 10);

		var entry = {
			VotingPoolID: req.body.VotingPoolID,
			SAPIN: req.body.SAPIN,
			LastName: req.body.LastName,
			FirstName: req.body.FirstName,
			MI: req.body.MI,
			Email: req.body.Email,
			Status: req.body.Status
		};
		for (let key of Object.keys(entry)) {
			if (entry[key] === undefined) {
				delete entry[key]
			}
		}
		if (Object.keys(entry).length === 0) {
			return Promise.resolve(null)
		}

		try {
			const results = await db.query(
				'UPDATE voters SET ? WHERE VotingPoolID=? AND SAPIN=?;' +
				'SELECT * FROM voters WHERE VotingPoolID=? AND SAPIN=?',
				[entry, votingPoolId, SAPIN, votingPoolId, SAPIN]);

			if (results[0].affectedRows !== 1 || results[1].length !== 1) {
				console.log(results)
				throw new Error("Unexpected result from SQL UPDATE")
			}

			return results[1][0];
		}
		catch(err) {
			if (err.code === 'ER_DUP_ENTRY') {
				let msg = null;
				if (entry.votingPoolId && entry.SAPIN) {
					msg = 
						`Cannot change VotingPoolID to ${entry.VotingPoolID} and SAPIN to ${entry.SAPIN} ` +
						`for voter with VotingPoolID=${votingPoolId} and SAPIN=${SAPIN}; a voter those identifiers already exists.`;
				}
				else if (entry.votingPoolId) {
					msg = 
						`Cannot change VotingPoolID to ${entry.VotingPoolID} ` +
						`for voter with VotingPoolID=${votingPoolId} and SAPIN=${SAPIN}; a voter with that VotingPoolID already exists.`;
				}
				else if (entry.SAPIN) {
					msg = 
						`Cannot change SAPIN to ${entry.SAPIN} ` +
						`for voter with VotingPoolID=${votingPoolId} and SAPIN=${SAPIN}; a voter with that SAPIN already exists.`;
				}
				if (msg) {
					throw msg
				}
			}
			throw err
		}
	}

	module.deleteVoters = function (req, res, next) {
		//console.log(req.body);

		const {access} = req.session;
		if (access <= 2) {
			return Promise.reject('Insufficient karma')
		}

		if (!req.body.hasOwnProperty('VotingPoolID') ||
			!req.body.hasOwnProperty('SAPINs')) {
			return Promise.reject('Missing parameter; must have VotingPoolID and SAPINs')
		}
		const {VotingPoolID, SAPINs} = req.body;
		const SQL = db.format('DELETE FROM voters WHERE VotingPoolID=? AND SAPIN IN (?)', [VotingPoolID, SAPINs]);
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