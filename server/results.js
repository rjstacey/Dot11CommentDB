var cheerio = require('cheerio');
const csvParse = require('csv-parse/lib/sync');
var ExcelJS = require('exceljs');

function parsePollResultsCsv(pollResultsCsv) {

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

function parsePollResultsHtml(body) {
	var $ = cheerio.load(body);
	// If we get the "ePoll Status" page then parse the data table
	// (use cheerio, which provides jQuery parsing)
	if ($('div.title').length && $('div.title').html() == "ePoll Status") {
		var results = [];
		$('table.paged_list').eq(0).find('tr.b_data_row').each(function(index, el) {
			var tds = $(this).find('td');
			var result = {
				Vote: tds.eq(1).text(),
				Name: tds.eq(2).text(),
				Email: unescape($(tds.eq(2)).children().eq(0).attr('href').replace('mailto:', '')),
				Affiliation: tds.eq(3).text()
			};
			console.log(result)
			results.push(result)
		})
		return results
	}
	else if ($('div.title').length && $('div.title').html() == "Sign In") {
		// If we get the "Sign In" page then the user is not logged in
		throw 'Not logged in'
	}
	else {
		throw 'Unexpected page returned by mentor.ieee.org'
	}
}

function appendStr(toStr, str) {
	if (typeof toStr === 'string') {
		return toStr + (toStr? ', ': '') + str
	}
	else {
		return str
	}
}

function colateResults(ballotSeries, voters=[]) {
	var results = [];

	if (!ballotSeries.length) {
		throw 'ballot series list is empty'
	}

	if (voters.length) {
		// This ballot has a voter pool
		results = voters.slice();

		// Collect each voters last vote
		results.forEach(v => {
			v.Vote = ''
			v.Notes = ''
			v.Name = v.FirstName + ' ' + v.LastName
			r = ballotSeries[ballotSeries.length-1].results.find(r => r.SAPIN === v.SAPIN)
			if (r) {
				// If the voter voted in this round, record the vote
				v.Vote = r.Vote
				v.CommentCount = r.CommentCount
				v.Affiliation = r.Affiliation
			}
			else {
				// Otherwise, see if they voted under a different SA PIN
				r = ballotSeries[ballotSeries.length - 1].results.find(r => {
					// We detect this as a vote with different SA PIN, but same email address
					return r.SAPIN !== v.SAPIN &&
						   r.Email.toLowerCase() === v.Email.toLowerCase()
				})
				if (r) {
					v.Notes = 'Voted with SAPIN=' + r.SAPIN
					v.Vote = r.Vote
					v.Affiliation = r.Affiliation
					v.CommentCount = r.CommentCount
					r.Notes = 'In pool as SAPIN=' + v.SAPIN
				}
				else {
					// Otherwise, find their last vote and record that
					for (let i = ballotSeries.length - 2; i >= 0; i--) {
						r = ballotSeries[i].results.find(r => r.SAPIN === v.SAPIN)
						if (r && r.Vote) {
							v.Vote = r.Vote
							v.CommentCount = r.CommentCount
							v.Affiliation = r.Affiliation
							v.Notes = 'From ' + ballotSeries[i].BallotID
							break
						}
					}
				}
			}
			
			// If this is an ExOfficio voter, then note that
			if (v.Vote && /^ExOfficio/.test(v.Status)) {
				v.Notes = appendStr(v.Notes, v.Status)
			}
		})

		// Add results for those that voted but are not in the pool)
		ballotSeries[ballotSeries.length - 1].results.forEach(r => {
			if (results.findIndex(v => v.SAPIN === r.SAPIN) < 0) {
				if (!r.Notes) {	// might be "In pool as..."
					r.Notes = 'Not in pool';
				}
				results.push(r)
			}
		})

		// Remove ExOfficio if they did not vote
		results = results.filter(v => (!/^ExOfficio/.test(v.Status) || v.Vote))
	}
	else {
		// No voters pool, so only the votes from ballot count
		results = ballotSeries[ballotSeries.length - 1].results.slice()
		results.forEach(v => {
			v.Notes = ''
			if (/Abstain/.test(v.Vote) && !/^Abstain.*expertise/.test(v.Vote)) {
				v.Notes = 'Abstain reason';
			}
			if (/^Disapprove/.test(v.Vote) && v.CommentCount === 0) {
				v.Notes = 'Without comment';
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
		ReturnsPoolSize: 0,
		TotalReturns: 0
	};

	results.forEach(r => {
		if (/[Ii]n pool/.test(r.Notes)) {
			if (/Not in pool/.test(r.Notes)) {
				summary.InvalidVote++;
			}
		}
		else {
			if (/^Approve/.test(r.Vote)) {
					summary.Approve++;
			}
			else if (/^Disapprove/.test(r.Vote)) {
				if (r.CommentCount) {
					summary.Disapprove++;
				}
				else {
					summary.InvalidDisapprove++;
				}
			}
			else if (/^Abstain.*expertise/.test(r.Vote)) {
				summary.Abstain++;
			}
			else if (/^Abstain/.test(r.Vote)) {
				summary.InvalidAbstain++;
			}

			// All 802.11 members (Status='Voter') count toward the returns pool
			// Only ExOfficio that cast a valid vote count torward the returns pool
			if (/^Voter/.test(r.Status)) {
				summary.ReturnsPoolSize++
			}
			else if (/^Approve/.test(r.Vote) ||
				(/^Disapprove/.test(r.Vote) && r.CommentCount) ||
				/^Abstain.*expertise/.test(r.Vote)) {
				summary.ReturnsPoolSize++
			}
		}
	})
	summary.TotalReturns = summary.Approve + summary.Disapprove + summary.Abstain;
	return summary;
}

function populateResultsWorksheet(ws, results) {
	const b = results.ballot, r = results.summary
	const votingPoolSize = results.VotingPoolSize

	const dStart = new Date(b.Start);
	const opened = dStart.toLocaleString('en-US', {year: 'numeric', month: 'numeric', day: 'numeric' , timeZone: 'America/New_York'});
	const dEnd = new Date(b.End);
	const closed = dEnd.toLocaleString('en-US', {year: 'numeric', month: 'numeric', day: 'numeric' , timeZone: 'America/New_York'})
	const _MS_PER_DAY = 1000 * 60 * 60 * 24;
	const dur = Math.floor((dEnd - dStart) / _MS_PER_DAY);
	const duration = isNaN(dur)? '': `${dur} days`

	const approvalRate = r.Approve/(r.Approve+r.Disapprove);

	const returns = r.TotalReturns;
	const returnsPct = returns/r.ReturnsPoolSize;
	const returnsReqStr = (returnsPct > 0.5? 'Meets': 'Does not meet') + ' return requirement (>50%)'
	const abstainsPct = r.Abstain/votingPoolSize;
	const abstainsReqStr = (abstainsPct < 0.3? 'Meets': 'Does not meet') + ' abstain requirement (<30%)'

	/* Create a table with the results */
	const columns = [
		{dataKey: 'SAPIN',		label: 'SA PIN',		width: 10},
		{dataKey: 'Name',		label: 'Name', 			width: 30},
		{dataKey: 'Affiliation',label: 'Affiliation', 	width: 40},
		{dataKey: 'Email',		label: 'Email',			width: 30},
		{dataKey: 'Vote',		label: 'Vote',			width: 15},
		{dataKey: 'CommentCount', label: 'Comments',	width: 15},
		{dataKey: 'Notes',		label: 'Notes',			width: 30}
	];

	ws.addTable({
		name: `${b.BallotID}ResultsTable`,
		ref: 'A1',
		headerRow: true,
		totalsRow: false,
		style: {
			theme: 'TableStyleLight16',
			showRowStripes: true,
		},
		columns: columns.map(col => {
				return {name: col.label, filterButton: true}
			}),
		rows: results.results.map(row => columns.map(col => row[col.dataKey]))
	});
	columns.forEach((col, i) => {ws.getColumn(i+1).width = col.width})

	/* Create a summary column off to the side */
	const colNum = columns.length + 2
	ws.getColumn(colNum).width = 25
	var labelCol = [
		'Ballot', 'Opened:', 'Closed:', 'Duration:', 'Voting pool:',,
		'Result', 'Approval rate:',	'Approve:', 'Disapprove:', 'Abstain:'
	];
	if (votingPoolSize) {
		labelCol = labelCol.concat([,
			'Invalid Votes', 'Not in pool:', 'Disapprove without comment:', 'Abstain reason:',,
			'Other Criteria', 'Total returns:', 'Returns as % of pool:', returnsReqStr, 'Abstains as % of pool:', abstainsReqStr
		]);
	}
	ws.getColumn(colNum).values = labelCol;

	ws.getColumn(colNum+1).width = 15;
	dataCol = [
		'', opened, closed, duration, votingPoolSize,,
		'', approvalRate, r.Approve, r.Disapprove, r.Abstain]
	if (votingPoolSize) {
		dataCol = dataCol.concat([,
			'', r.InvalidVote, r.InvalidDisapprove, r.InvalidAbstain,,
			'', returns, returnsPct,, abstainsPct
		]);
	}
	ws.getColumn(colNum+1).values = dataCol

	var sectNameRows = [1, 7]
	if (votingPoolSize) {sectNameRows = sectNameRows.concat([13, 18])}
	sectNameRows.forEach(rowNum => {
		ws.getCell(rowNum, colNum).font = {bold: true}
		ws.getCell(rowNum, colNum).alignment = {vertical: 'middle', horizontal: 'left'}
		ws.mergeCells(rowNum, colNum, rowNum, colNum+1);
	});

	[2, 3, 4].forEach(rowNum => {
		ws.getCell(rowNum, colNum+1).alignment = {vertical: 'middle', horizontal: 'right'}
	});

	var pctRows = [8];
	if (votingPoolSize) {pctRows = pctRows.concat([20, 22])}
	pctRows.forEach(rowNum => ws.getCell(rowNum, colNum+1).numFmt = '0.0%')

	if (votingPoolSize) {
		[21, 23].forEach(rowNum => {
			ws.mergeCells(rowNum, colNum, rowNum, colNum+1);
		});
	}
}

module.exports = function(db, rp) {
	var module = {};

	module.getResultsLocal = function(ballotId) {

		if (ballotId === undefined) {
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
					return db.query('SELECT SAPIN, LastName, FirstName, MI, Email, Status FROM voters WHERE VotingPoolID=?', [votingPoolId])
						.then(voters => {
							// voting pool size excludes ExOfficio; they are allowed to vote, but don't affect returns
							votingPoolSize = voters.filter(v => !/^ExOfficio/.test(v.Status)).length;
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
				//console.log(ieeeRes.headers);

				if (ieeeRes.headers['content-type'] !== 'text/csv') {
					return Promise.reject('Not logged in')
				}

				pollResults = parsePollResultsCsv(ieeeRes.body);

				options.url = `https://mentor.ieee.org/802.11/poll-status?p=${epollNum}`
				return rp.get(options)
			})
			.then(ieeeRes => {
				/* Get Name and Affiliation from HTML (not present in .csv) */
				var pollResults2 = parsePollResultsHtml(ieeeRes.body)

				pollResults.forEach(r => {
					h = pollResults2.find(h => h.Email === r.Email)
					r.Name = h? h.Name: ''
					r.Affiliation = h? h.Affiliation: ''
				})

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

	module.exportResults = (req, res, next) => {
		var p
		if (req.query.hasOwnProperty('BallotID')) {
			const ballotId = req.query.BallotID
			p = module.getResultsLocal(ballotId)
				.then(result => [result])	// turn parameter into an array
		}
		else if (req.query.hasOwnProperty('BallotIDs')) {
			const ballotIds = req.query.BallotIDs
			p = Promise.all(ballotIds.map(ballotId => module.getResultsLocal(ballotId)))
		}
		else if (req.query.hasOwnProperty('Project')) {
			const project = req.query.Project
			p = db.query('SELECT BallotID FROM ballots WHERE Project=?', [project])
				.then(results => {
					return Promise.all(results.map(r => module.getResultsLocal(r.BallotID)))
				})
		}
		else {
			p = Promise.reject('Missing parameter BallotID, BallotIDs or Project.')
		}
		return p
			.then(summaries => {
				var wb = new ExcelJS.Workbook()
				wb.creator = '802.11';
				summaries.forEach(s => {
					var ws = wb.addWorksheet(s.BallotID)
					populateResultsWorksheet(ws, s)
				})
				return wb.xlsx.writeBuffer()
			})
			.then(buffer => {
				res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
				res.status(200).send(buffer)
			})
	}

	return module;
}