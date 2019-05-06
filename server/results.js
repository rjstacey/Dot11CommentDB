const csvParse = require('csv-parse/lib/sync');

function parsePollResults(pollResultsCsv) {

	const p = csvParse(pollResultsCsv, {columns: false});
	if (p.length === 0) {
		throw 'Got empty poll-results.csv';
	}

	// Row 0 is the header
	expected = ['SA PIN', 'Date', 'Vote', 'Email'];
	if (expected.reduce((r, v, i) => v !== p[0][i], false)) {
		throw `Unexpected column headings ${p[0].join()}. Expected ${expected.join()}.`
	}
	p.shift();

	return p.map(c => {
		return {
			SAPIN: c[0],
			Vote: c[2],
			Email: c[3]
		}
	});
}


function colateResults(ballotSeries, voters=[]) {
	var results = [];

	if (!ballotSeries.length) {
		throw 'ballot series list is empty'
	}

	if (voters.length) {
		// This ballot has a voter pool
		results = voters.slice();

		// Collect each voters last vote and mark invalid abstains
		results.forEach(v => {
			v.Vote = ''
			v.Status = ''
			for (let i = ballotSeries.length-1; i >= 0; i--) {
				r = ballotSeries[i].results.find(r => r.SAPIN === v.SAPIN)
				if (r && r.Vote) {
					v.Vote = r.Vote
					v.CommentCount = r.CommentCount
					if (i != ballotSeries.length-1) {
						// If vote is from prior ballot, the record that in status
						v.Status = 'From ' + ballotSeries[i].BallotID
					}
					break
				}
			}
			if (!v.Vote) {
				v.Status = 'Did not vote';
			}
			if (/^Abstain/.test(v.Vote) && !/^Abstain.*expertise/.test(v.Vote)) {
				if (v.Status) {
					v.Status += ', '
				}
				v.Status += 'Abstain reason';
			}
			if (/^Disapprove/.test(v.Vote) && v.CommentCount === 0) {
				if (v.Status) {
					v.Status += ', '
				}
				v.Status += 'Without comment'
			}
		})
		// Add invalid votes (somebody that voted but is not in the pool)
		ballotSeries[ballotSeries.length - 1].results.forEach(r => {
			if (results.findIndex(v => v.SAPIN === r.SAPIN) < 0) {
				results.push(Object.assign({}, r, {Status: 'Not in pool'}))
			}
		})
	}
	else {
		// No voters pool, so only the votes from ballot count
		results = ballotSeries[ballotSeries.length - 1].results.slice()
		results.forEach(v => {
			v.Status = ''
			if (/Abstain/.test(v.Vote) && !/^Abstain.*expertise/.test(v.Vote)) {
				v.Status = 'Abstain reason';
			}
			if (/^Disapprove/.test(v.Vote) && v.CommentCount === 0) {
				if (v.Status) {
					v.Status += ', '
				}
				v.Status += 'Without comment'
			}
		})
	}

	return results;
}

function summarizeResults(results) {
	var summary = {
		Approve: 0,
		Disapprove: 0,
		Abstain: 0,
		InvalidVote: 0,
		InvalidAbstain: 0,
		InvalidDisapprove: 0,
		Total: 0
	};

	results.forEach(r => {
		if (/Not in pool/.test(r.Status)) {
			summary.InvalidVote++;
		}
		else if (/Abstain reason/.test(r.Status)) {
			summary.InvalidAbstain++;
		}
		else if (/Without comment/.test(r.Status)) {
			summary.InvalidDisapprove++;
		}
		else {
			if (/^Approve/.test(r.Vote)) {
				summary.Approve++;
			}
			else if (/^Disapprove/.test(r.Vote)) {
				summary.Disapprove++;
			}
			else if (/^Abstain.*expertise/.test(r.Vote)) {
				summary.Abstain++;
			}
		}
	})
	summary.Total = results.length;

	return summary;
}

module.exports = function(db, rp) {
	var module = {};

	module.getResultsLocal = function (ballotId) {

		if (!ballotId) {
			return Promise.reject('Missing parameter BallotID');
		}

		function recursiveBallotResultsGet(ballotSeries, ballotId) {
			return db.query('SELECT BallotID, VotingPoolID, PrevBallotID FROM ballots WHERE BallotID=?; ' +
							'SELECT r.*, (SELECT COUNT(*) FROM comments AS c WHERE BallotID=? AND c.CommenterSAPIN = r.SAPIN) AS CommentCount FROM results AS r WHERE BallotID=?;',
							[ballotId, ballotId, ballotId])
				.then(results => {
					if (results[0].length === 0) {
						return ballotList;
					}
					var b = Object.assign({}, results[0][0], {results: results[1]})
					ballotSeries.unshift(b);
					if (b.PrevBallotID) {
						return recursiveBallotResultsGet(ballotSeries, b.PrevBallotID);
					}
					else {
						return ballotSeries;
					}
				})
		}

		var votingPoolId;
		var votingPoolSize;
		var ballot;
		return db.query('SELECT * FROM ballots WHERE BallotID=?', [ballotId])	// Get ballot information
			.then(results => {
				ballot = results[0];
				return recursiveBallotResultsGet([], ballotId)	// then get results from each ballot in series
			})
			.then(ballotSeries => {
				if (ballotSeries.length === 0) {
					return Promise.reject('No such ballot')
				}
				votingPoolId  = ballotSeries[0].VotingPoolID;
				if (votingPoolId) {
					// if there is a voting pool, get that
					return db.query('SELECT SAPIN, LastName, FirstName, MI, Email FROM voters WHERE VotingPoolID=?', [votingPoolId])
						.then(voters => {
							votingPoolSize = voters.length;
							return colateResults(ballotSeries, voters)	// colate results against voting pool and prior ballots in series
						})
				}
				else {
					votingPoolSize = 0;
					return colateResults(ballotSeries)	// colate results for just this ballot
				}
			})
			.then(results => {
				//console.log(ballot)
				return {
					BallotID: ballotId,
					VotingPoolID: votingPoolId,
					VotingPoolSize: votingPoolSize,
					ballot,
					results,
					summary: summarizeResults(results)
				}
			})
	}

	module.getResults = function (req) {
		return module.getResultsLocal(req.query.BallotID);
	}

	module.deleteResults = function (req, res, next) {
		console.log(req.body);

		const ballotId = req.body.BallotID;
		if (!ballotId) {
			return Promise.reject('Missing parameter BallotID');
		}

		return db.query('DELETE FROM results WHERE BallotID=?', [ballotId])
	}

	module.importResults = (req, res, next) => {
		console.log(req.body);

		if (!req.body.hasOwnProperty('BallotID') ||
			!req.body.hasOwnProperty('EpollNum')) {
			return Promise.reject('Missing parameter BallotID and/or EpollNum.')
		}
		var ballotId = req.body.BallotID;
		var epollNum = req.body.EpollNum;

		const sess = req.session;

		var options = {
			url: `https://mentor.ieee.org/802.11/poll-results.csv?p=${epollNum}`,
			jar: sess.ieeeCookieJar,
			resolveWithFullResponse: true,
			simple: false
		}

		var pollResults;
		return rp.get(options)
			.then(ieeeRes => {
				console.log(ieeeRes.headers);

				if (ieeeRes.headers['content-type'] !== 'text/csv') {
					return Promise.reject('Not logged in')
				}

				pollResults = parsePollResults(ieeeRes.body);
				//console.log(results);

				return db.query('DELETE FROM results WHERE BallotID=?', [ballotId])
			})
			.then(results => {
				if (pollResults.length === 0) {
					return Promise.resolve(null);
				}

				var SQL = `INSERT INTO results (BallotID, ${Object.keys(pollResults[0])}) VALUES`;
				pollResults.forEach((c, i) => {
					SQL += (i > 0? ',': '') + `(${db.escape(ballotId)}, ${db.escape(Object.values(c))})`;
				});
				SQL += ";";

				return db.query(SQL)
					.catch(err => {
						return Promise.reject(err.code === 'ER_DUP_ENTRY'? "Entry already exists with this ID": err)
					});
			})
			.then(results => {
				return module.getResultsLocal(ballotId)
			})
	}

	module.uploadResults = function (req, res, next) {
		console.log(req.body);

		const ballotId = req.body.BallotID;
		if (!ballotId) {
			return Promise.reject('Missing parameter BallotID')
		}
		const votingPoolId = req.body.VotingPoolID;

		console.log(req.file)
		if (!req.file) {
			return Promise.reject('Missing file')
		}
		var results = parsePollResults(req.file.buffer);
		console.log(results);

		if (results.length === 0) {
			console.log('no results')
			return {Count: 0}
		}

		var INSERT_RESULTS_SQL = `INSERT INTO results (BallotID, ${Object.keys(results[0])}) VALUES`;
		results.forEach((c, i) => {
			INSERT_RESULTS_SQL += (i > 0? ',': '') + `(${db.escape(ballotId)}, ${db.escape(Object.values(c))})`;
		});

		var GET_RESULTS_SQL;
		if (votingPoolId) {
			GET_RESULTS_SQL = 
				`(SELECT COUNT(*) FROM voters AS v LEFT JOIN results AS r ON v.SAPIN = r.SAPIN WHERE v.VotingPoolID = ${votingPoolId} AND r.BallotID = ${ballotId} AND r.Vote LIKE "Approve") AS Approve, ` +
				`(SELECT COUNT(*) FROM voters AS v LEFT JOIN results AS r ON v.SAPIN = r.SAPIN WHERE v.VotingPoolID = ${votingPoolId} AND r.BallotID = ${ballotId} AND r.Vote LIKE "Disapprove") AS Disapprove, ` +
				`(SELECT COUNT(*) FROM voters AS v LEFT JOIN results AS r ON v.SAPIN = r.SAPIN WHERE v.VotingPoolID = ${votingPoolId} AND r.BallotID = ${ballotId} AND r.Vote LIKE "Abstain%expertise") AS Abstain, ` +
				`(SELECT COUNT(*) FROM voters AS v LEFT JOIN results AS r ON v.SAPIN = r.SAPIN WHERE v.VotingPoolID = ${votingPoolId} AND r.BallotID = ${ballotId} AND r.Vote LIKE "Abstain%" AND r.Vote NOT LIKE "Abstain%expertise") AS InvalidAbstain, ` +
				`(SELECT COUNT(*) FROM results AS r WHERE r.BallotID = ${ballotId} AND r.SAPIN NOT IN (SELECT SAPIN FROM voters AS v WHERE v.VotingPoolID = ${votingPoolId})) AS InvalidVote`
		}
		else {
			GET_RESULTS_SQL =
				'SELECT ' +
					'COUNT(*) AS Total, ' +
					'SUM(CASE WHEN Vote LIKE "Approve" THEN 1 ELSE 0 END) AS Approve, ' +
					'SUM(CASE WHEN Vote LIKE "Disapprove" THEN 1 ELSE 0 END) AS Disapprove, ' +
					'SUM(CASE WHEN Vote LIKE "Abstain%" THEN 1 ELSE 0 END) AS Abstain ' +
				`FROM results WHERE BallotID = "${ballotId}"`
		}

		return db.query(INSERT_RESULTS_SQL + ';' + GET_RESULTS_SQL + ';')
			.then(results => {
				if (results.length != 2 || results[1].length != 1) {
					return Promise.reject('Unexpected SQL query result')
				}
				return results[1][0];
			})
			.catch(err => {
				return Promise.reject(err.code === 'ER_DUP_ENTRY'? "Entry already exists with this ID": err)
			});
	}

	module.summarizeResults = (req, res, next) => {
		if (!req.body.hasOwnProperty('BallotID')) {
      		res.status(200).send({
      			status: 'Error',
      			message: "Missing parameter BallotID"
      		});
			return;
		}
		var ballotId = req.body.BallotID;

		SQL = 'SELECT COUNT(*) FROM results WHERE Vote LIKE "Approve" AND BallotID=${ballotID} AS Y,' +
			'SELECT COUNT(*) FROM results WHERE Vote LIKE "Disapprove" AND BallotID=${ballotID} AS N,' +
			'SELECT COUNT(*) FROM results WHERE Vote LIKE "Abstain" AND BallotID=${ballotID} AS A;';
		db.query(SQL)
			.then(result => {
				res.status(200).send({
					status: 'OK',
					data: result
				});
			})
			.catch(err => {
				res.status(200).send({
					status: 'Error',
					message: typeof err === 'string'? err: JSON.stringify(err)
				});
			});
	}

	return module;
}