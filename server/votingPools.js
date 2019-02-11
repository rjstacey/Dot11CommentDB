
module.exports = function(db, rp) {
	var module = {};

	module.getVotingPool = function (req, res, next) {
		const sess = req.session;


		// Get a list of BallotIDs in BallotSeries. Keep them in order of ballot start date.
		var SQL = `SELECT vp.*, (SELECT COUNT(*) FROM voters AS v WHERE vp.VotingPoolID = v.VotingPoolID) AS VoterCount FROM votingpool AS vp ORDER BY Date`;
		db.query2(SQL)
			.then(results => {
				console.log(results);
				res.status(200).send({
					status: 'OK',
					data: results
				});
			})
			.catch(err => {
				console.log(err);
				res.status(200).send({
					status: 'Error',
					message: JSON.stringify(err)
				});
			});
	}

	module.deleteVotingPool = function (req, res, next) {
		console.log(req.body);

		var where = '';
		if (req.body.hasOwnProperty('VotingPoolIDs')) {
			if (!Array.isArray(req.body.VotingPoolIDs)) {
				res.status(200).send({
					status: 'Error',
					message: 'Parameter VotingPoolIDs must be an array'
				});
				return;
			}
			where = ` WHERE VotingPoolID IN (${db.escape(req.body.VotingPoolIDs.join())})`;
		}
		else if (req.body.hasOwnProperty('VotingPoolID')) {
			where = ` WHERE VotingPoolID=${db.escape(req.body.VotingPoolID)}`;
		}
		else {
			res.status(200).send({
				status: 'Error',
				message: 'Missing parameter; must have VotingPoolID or VotingPoolIDs'
			});
			return;
		}

		var SQL = `DELETE FROM votingpool${where}; DELETE FROM voters${where}`;
		console.log(SQL);
		db.query2(SQL)
			.then(results => {
				res.status(200).send({status: 'OK'});
			})
			.catch(err => {
				console.log(err);
				res.status(200).send({
					status: 'Error',
					message: JSON.stringify(err)
				});
			});
	}

	module.addVotingPool = (req, res, next) => {
		console.log(req.body);

		if (!req.body.hasOwnProperty('VotingPoolID')) {
			res.status(200).send({
				status: 'Error',
				message: 'Missing parameter VotingPoolID.'
			});
			return;
	    }
	    var entry = {
	    	VotingPoolID: req.body.VotingPoolID,
	    	Name: req.body.Name,
	    	Date: new Date(req.body.Date).toISOString().slice(0, 10)
	    }

	    var SQL = `INSERT INTO votingpool (${Object.keys(entry)}) VALUES (${db.escape(Object.values(entry))})`
	    console.log(SQL)
		db.query2(SQL)
			.then(result => {
				var SQL = `SELECT vp.*, (SELECT COUNT(*) FROM voters AS v WHERE vp.VotingPoolID = v.VotingPoolID) AS VoterCount FROM votingpool AS vp WHERE vp.VotingPoolID = ${db.escape(entry.VotingPoolID)}`;
				return db.query2(SQL);
			})
			.then(result => {
				res.status(200).send({
					status: 'OK',
					data: result[0]
				});
			})
			.catch(err => {
				console.log(JSON.stringify(err))
				res.status(200).send({
					status: 'Error',
					message: err.code === 'ER_DUP_ENTRY'? "Entry already exists with this ID": JSON.stringify(err)
				});
			});
	}

	return module;
}