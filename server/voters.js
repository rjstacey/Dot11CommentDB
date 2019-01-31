
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

	module.getVoters = function (req, res, next) {
		const sess = req.session;

		var where = '';
		if (req.query.hasOwnProperty('BallotID')) {
			if (Array.isArray(req.query.BallotID)) {
				where = ` WHERE BallotID IN (${db.escape(req.query.BallotID.join())})`;
			}
			else {
				where = ` WHERE BallotID=${db.escape(req.query.BallotID)}`;
			}
		}
		else {
			res.status(200).send({
				status: 'Error',
				message: 'Missing parameter BallotID'
			});
			return;
		}

		// Get all the ballots and count the number of comments associated with each ballot
		const SQL = `SELECT * FROM voters${where};`;
		db.query2(SQL)
			.then(results => {
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

	module.deleteVoters = function (req, res, next) {
		console.log(req);

		var ret = {status: "Error", message: "Unknown server error"};

		var where = '';
		if (req.body.hasOwnProperty('BallotID')) {
			if (Array.isArray(req.query.BallotID)) {
				where = ` WHERE BallotID IN (${db.escape(req.body.BallotID.join())})`;
			}
			else {
				where = ` WHERE BallotID=${db.escape(req.body.BallotID)}`;
			}
		}
		else {
			res.status(200).send({
				status: 'Error',
				message: 'Missing parameter BallotID'
			});
			return;
		}

		var SQL = `DELETE FROM voters${where}`;
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

	module.uploadVoters = (req, res, next) => {
		console.log(req.body);

		if (!req.body['BallotID']) {
			res.status(200).send({
				status: 'Error',
				message: 'Missing parameter BallotID.'
			});
			return;
	    }
	    var ballotId = req.body.BallotID;
	    console.log(req.file)
		if (!req.file) {
			res.status(200).send({
				status: 'Error',
				message: 'Got unpected file type'
			});
			return;
		}

		var votersArray = csvParse(req.file.buffer);
		if (votersArray.length === 0 || votersArray[0].length < 3) {
			res.status(200).send({
					status: 'Error',
					message: votersArray.length === 0?
						'Got empty .csv file':
						`Unexpected number of columns ${voters[0].length} in .csv file`
				});
			return;
		}

		var voters = parseVoters(votersArray);
		if (voters.length === 0) {
			res.status(200).send({
				status: 'OK',
				data: {Count: 0}
			});
		}

		var SQL = `INSERT INTO voters (BallotID, ${Object.keys(voters[0])}) VALUES`;
		voters.forEach((c, i) => {
			SQL += (i > 0? ',': '') + `(${db.escape(ballotId)}, ${db.escape(Object.values(c))})`;
		});
		SQL += ";\n";
		console.log(SQL);

		return db.query2(SQL)
			.then(result => {
				res.status(200).send({
					status: 'OK',
					data: {Count: voters.length}
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