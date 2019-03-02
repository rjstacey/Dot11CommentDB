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

/*
 * Get results for ballot with a voting pool
 */
const GET_RESULTS_FOR_BALLOT_WITH_POOL =
	'SET @BallotID=?, @VotingPoolID=?;' +
	'SELECT ' +
		'results.BallotID, results.SAPIN, results.Name, results.Email, results.Vote, ' +
		'CASE ' +
			'WHEN voters.SAPIN IS NOT NULL AND Vote Like "Abstain%" AND Vote NOT LIKE "Abstain%expertise" THEN "Invalid Abstain" ' +
			'WHEN voters.SAPIN IS NULL THEN "Invalid Vote" ' +
			'ELSE NULL ' +
		'END AS Status ' +
	'FROM results LEFT JOIN voters ON voters.VotingPoolID=@VotingPoolID AND voters.SAPIN = results.SAPIN WHERE results.BallotID=@BallotID ' +
	'UNION ' +
	'SELECT ' +
		'@BallotID AS BallotID, voters.SAPIN, voters.Name, voters.Email, NULL AS Vote, ' +
		'CASE ' +
			'WHEN results.SAPIN IS NULL THEN "Did Not Vote" ' +
			'ELSE NULL ' +
		'END AS Status ' +
	'FROM results RIGHT JOIN voters ON results.BallotID=@BallotID AND voters.VotingPoolID=@VotingPoolID AND voters.SAPIN = results.SAPIN WHERE results.SAPIN IS NULL ' +
	'ORDER BY BallotID, SAPIN';

const GET_RESULTS_FOR_BALLOT_WITHOUT_POOL =
	'SET @BallotID=?; ' +
	'SELECT * FROM results WHERE BallotID=@BallotID';

/*
 * Get results summary for a ballot with a voting pool
 */
const GET_RESULTS_SUMMARY_FOR_BALLOT_WITH_POOL =
	'SELECT ' +
		'SUM(CASE WHEN voters.SAPIN IS NOT NULL AND Vote LIKE "Approve" THEN 1 ELSE 0 END) AS Approve, ' +
		'SUM(CASE WHEN voters.SAPIN IS NOT NULL AND Vote LIKE "Disapprove" THEN 1 ELSE 0 END) AS Disapprove, ' +
		'SUM(CASE WHEN voters.SAPIN IS NOT NULL AND Vote LIKE "Abstain%expertise" THEN 1 ELSE 0 END) AS Abstain, ' +
		'SUM(CASE WHEN voters.SAPIN IS NOT NULL AND Vote LIKE "Abstain%" AND Vote NOT LIKE "Abstain%expertise" THEN 1 ELSE 0 END) AS InvalidAbstain, ' +
		'SUM(CASE WHEN voters.SAPIN IS NULL THEN 1 ELSE 0 END) AS InvalidVote, ' +
		'COUNT(*) AS Total ' +
	'FROM results LEFT JOIN voters ON voters.VotingPoolID=? AND voters.SAPIN = results.SAPIN WHERE results.BallotID=?';

/*
 * Get results summary for a ballot without a voting pool
 */
const GET_RESULTS_SUMMARY_FOR_BALLOT_WITHOUT_POOL =
	'SELECT ' +
		'SUM(CASE WHEN Vote LIKE "Approve" THEN 1 ELSE 0 END) AS Approve, ' +
		'SUM(CASE WHEN Vote LIKE "Disapprove" THEN 1 ELSE 0 END) AS Disapprove, ' +
		'SUM(CASE WHEN Vote LIKE "Abstain%" THEN 1 ELSE 0 END) AS Abstain, ' +
		'NULL AS InvalidAbstain, ' +
		'NULL AS InvalidVote, ' +
		'COUNT(*) AS Total ' +
	'FROM results WHERE BallotID=?';

function colateResults(ballotList, voters) {
	var results = [];

	if (!ballotList.length) {
		throw 'ballotList is empty'
	}

	if (voters.length) {
		// This ballot has a voter pool
		results = voters.slice();

		// Collect each voters last vote and mark invalid abstains
		results.forEach(v => {
			v.Vote = ''
			v.Status = ''
			ballotList.forEach(b => {
				let i = b.results.findIndex(r => r.SAPIN === v.SAPIN)
				if (i >= 0) {
					v.Vote = b.results[i].Vote;
				}
			})
			if (/^Abstain/.test(v.Vote) && !/^Abstain.*expertise/.test(v.Vote)) {
				v.Status = 'Invalid Abstain';
			}
		})
		// Add invalid votes (somebody that voted but is not in the pool)
		ballotList[ballotList.length - 1].results.forEach(r => {
			if (results.findIndex(v => v.SAPIN === r.SAPIN) < 0) {
				results.push(Object.assign({}, r, {Status: 'Invalid Vote'}))
			}
		})
	}
	else {
		// No voters pool, so only the votes from ballot count
		results = ballotList[ballotList.length - 1].results.slice()
		results.forEach(v => {
			v.Status = ''
			if (/Abstain/.test(v.Vote) && !/^Abstain.*expertise/.test(v.Vote)) {
				v.Status = 'Invalid Abstain';
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
		InvalidAbstain: 0,
		InvalidVote: 0,
		Total: 0,
	};

	results.forEach(r => {
		if (!r.Status) {
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
		else if (r.Status === 'Invalid Abstain') {
			summary.InvalidAbstain++;
		}
		else if (r.Status === 'Invalid Vote') {
			summary.InvalidVote++;
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

		function recursiveBallotResultsGet(ballotList, ballotId) {
			return db.query2('SELECT BallotID, VotingPoolID, PrevBallotID FROM ballots WHERE BallotID=?; SELECT * FROM results WHERE BallotID=?', [ballotId, ballotId])
				.then(results => {
					if (results[0].length === 0) {
						return ballotList;
					}
					var b = Object.assign({}, results[0][0], {results: results[1]})
					ballotList.unshift(b);
					if (b.PrevBallotID) {
						return recursiveBallotResultsGet(ballotList, b.PrevBallotID);
					}
					else {
						return ballotList;
					}
				})
		}
		var votingPoolId;
		return recursiveBallotResultsGet([], ballotId)
			.then(ballotList => {
				if (ballotList.length === 0) {
					return Promise.reject('No such ballot')
				}
				votingPoolId  = ballotList[0].VotingPoolID;
				if (votingPoolId) {
					return db.query2('SELECT SAPIN, Name, Email FROM voters WHERE VotingPoolID=?', [votingPoolId])
						.then(results => {
							return colateResults(ballotList, results)
						})
				}
				else {
					return colateResults(ballotList, [])
				}
			})
			.then(results => {
				//console.log(results)
				return {
					BallotID: ballotId,
					VotingPoolID: votingPoolId,
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

		return db.query2('DELETE FROM results WHERE BallotID=?', [ballotId])
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

		return rp.get(options)
			.then(ieeeRes => {
				console.log(ieeeRes.headers);

				if (ieeeRes.headers['content-type'] !== 'text/csv') {
					return Promise.reject('Not logged in')
				}

				var results = parsePollResults(ieeeRes.body);
				console.log(results);

				if (results.length === 0) {
					return {Count: 0};
				}

				var SQL = `INSERT INTO results (BallotID, ${Object.keys(results[0])}) VALUES`;
				results.forEach((c, i) => {
					SQL += (i > 0? ',': '') + `(${db.escape(ballotId)}, ${db.escape(Object.values(c))})`;
				});
				SQL += ";";

				return db.query2(SQL + `SELECT COUNT(*) as Count FROM results WHERE BallodID=${db.escape(ballotId)}`)
					.then(results => {
						if (results.length != 2 || results[1].length != 1) {
							return Promise.reject('Unexpected SQL result')
						}
						return {Count: results[1][0].Count};
					})
					.catch(err => {
						return Promise.reject(err.code === ER_DUP_ENTRY? "Entry already exists with this ID": err)
					});
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

		return db.query2(INSERT_RESULTS_SQL + ';' + GET_RESULTS_SQL + ';')
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
		db.query2(SQL)
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