var cheerio = require('cheerio');
var moment = require('moment-timezone');
const results = require('./results');

// Convert date string to UTC
function parseDateTime(dateStr) {
	// Date is in format: "11-Dec-2018 23:59:59 ET" and is always eastern time
	return moment.tz(dateStr, 'DD-MMM-YYYY HH:mm:ss', 'America/New_York')
}

function parseClosedEpollsPage(body) {
	var epolls = [];
	var $ = cheerio.load(body);
          
	// If we get the "ePolls" page then parse the data table
	// (use cheerio, which provides jQuery parsing)
	if ($('div.title').length && $('div.title').html() == "ePolls") {
		console.log('GOT ePolls page');
		$('.b_data_row').each(function (index) {  // each table data row
			var tds = $(this).find('td');
			var epoll = {};
			epoll.Start = parseDateTime($(tds.eq(0)).children().eq(0).text()); // <div class="date_time">
			epoll.BallotID = tds.eq(1).text();
			epoll.Topic = $(tds.eq(2)).children().eq(0).text(); // <p class="prose">
			epoll.Document = $(tds.eq(3)).children().eq(0).text();
			epoll.End = parseDateTime($(tds.eq(4)).children().eq(0).text());   // <div class="date_time">
			epoll.Votes = tds.eq(5).text();
			var p = tds.eq(7).html().match(/poll-status\?p=(\d+)/);
			epoll.EpollNum = p? p[1]: '';
			epolls.push(epoll);
		});
    	return epolls
	}
	else if ($('div.title').length && $('div.title').html() == "Sign In") {
		// If we get the "Sign In" page then the user is not logged in
		throw 'Not logged in'
	}
	else {
		throw 'Unexpected page returned by mentor.ieee.org'
	}
}

function parsePollResults(csvArray) {
	// Row 0 is the header:
	// 'SA PIN', 'Date', 'Vote', 'Email'
	csvArray.shift();
	return csvArray.map(c => {
		return {
			SAPIN: c[0],
			Date: c[1],
			Vote: c[2],
			Email: c[3]
		}
	});
}

/*
 * Get ballots SQL query.
 * The union of two queries:
 *  - one with voting pool (VotingPoolID is not null), results are validated against pool
 *  - one without voting pool (VotingPoolID is null), raw results 
 */
const GET_BALLOTS_SQL =
	'SELECT ' +
		'ballots.*, ' +
		'SUM(CASE WHEN voters.SAPIN IS NOT NULL AND Vote LIKE "Approve" THEN 1 ELSE 0 END) AS Approve, ' +
		'SUM(CASE WHEN voters.SAPIN IS NOT NULL AND Vote LIKE "Disapprove" THEN 1 ELSE 0 END) AS Disapprove, ' +
		'SUM(CASE WHEN voters.SAPIN IS NOT NULL AND Vote LIKE "Abstain%expertise" THEN 1 ELSE 0 END) AS Abstain, ' +
		'SUM(CASE WHEN voters.SAPIN IS NOT NULL AND Vote LIKE "Abstain%" AND Vote NOT LIKE "Abstain%expertise" THEN 1 ELSE 0 END) AS InvalidAbstain, ' +
		'SUM(CASE WHEN voters.SAPIN IS NULL AND Vote IS NOT NULL THEN 1 ELSE 0 END) AS InvalidVote, ' +
		'SUM(CASE WHEN Vote IS NOT NULL THEN 1 ELSE 0 END) AS Total, ' +
		'(SELECT COUNT(*) FROM comments WHERE comments.BallotID = ballots.BallotID) AS CommentCount, ' +
		'(SELECT MIN(CommentID) FROM comments WHERE comments.BallotID = ballots.BallotID) AS CommentIDMin, ' +
		'(SELECT MAX(CommentID) FROM comments WHERE comments.BallotID = ballots.BallotID) AS CommentIDMax ' +
	'FROM ballots ' +
		'LEFT JOIN results ON ballots.BallotID = results.BallotID ' +
		'LEFT JOIN voters ON ballots.VotingPoolID > 0 AND ballots.VotingPoolID = voters.VotingPoolID AND voters.SAPIN = results.SAPIN ' +
		'WHERE ballots.VotingPoolID > 0 GROUP BY ballots.BallotID ' +
	'UNION ' +
	'SELECT ' +
		'ballots.*, ' +
		'SUM(CASE WHEN Vote LIKE "Approve" THEN 1 ELSE 0 END) AS Approve, ' +
		'SUM(CASE WHEN Vote LIKE "Disapprove" THEN 1 ELSE 0 END) AS Disapprove, ' +
		'SUM(CASE WHEN Vote LIKE "Abstain%" THEN 1 ELSE 0 END) AS Abstain, ' +
		'NULL AS InvalidAbstain, ' +
		'NULL AS InvalidVote, ' +
		'SUM(CASE WHEN Vote IS NOT NULL THEN 1 ELSE 0 END) AS Total, ' +
		'(SELECT COUNT(*) FROM comments WHERE comments.BallotID = ballots.BallotID) AS CommentCount, ' +
		'(SELECT MIN(CommentID) FROM comments WHERE comments.BallotID = ballots.BallotID) AS CommentIDMin, ' +
		'(SELECT MAX(CommentID) FROM comments WHERE comments.BallotID = ballots.BallotID) AS CommentIDMax ' +
	'FROM ballots ' +
		'LEFT JOIN results ON ballots.BallotID = results.BallotID ' +
		'WHERE ballots.VotingPoolID = 0 GROUP BY ballots.BallotID';

/*
 * Get results summary for a ballot with a voting pool
 */
const GET_RESULTS_FOR_BALLOT_WITH_POOL =
	'SELECT ' +
		'SUM(CASE WHEN voters.SAPIN IS NOT NULL AND Vote LIKE "Approve" THEN 1 ELSE 0 END) AS Approve, ' +
		'SUM(CASE WHEN voters.SAPIN IS NOT NULL AND Vote LIKE "Disapprove" THEN 1 ELSE 0 END) AS Disapprove, ' +
		'SUM(CASE WHEN voters.SAPIN IS NOT NULL AND Vote LIKE "Abstain%expertise" THEN 1 ELSE 0 END) AS Abstain, ' +
		'SUM(CASE WHEN voters.SAPIN IS NOT NULL AND Vote LIKE "Abstain%" AND Vote NOT LIKE "Abstain%expertise" THEN 1 ELSE 0 END) AS InvalidAbstain, ' +
		'SUM(CASE WHEN voters.SAPIN IS NULL THEN 1 ELSE 0 END) AS InvalidVote, ' +
		'COUNT(*) AS Total ' +
	'FROM results LEFT JOIN voters ON voters.VotingPoolID = ? AND voters.SAPIN = results.SAPIN WHERE results.BallotID = ?';

/*
 * Get results summary for a ballot without a voting pool
 */
const GET_RESULTS_FOR_BALLOT_WITHOUT_POOL =
	'SELECT ' +
		'SUM(CASE WHEN Vote LIKE "Approve" THEN 1 ELSE 0 END) AS Approve, ' +
		'SUM(CASE WHEN Vote LIKE "Disapprove" THEN 1 ELSE 0 END) AS Disapprove, ' +
		'SUM(CASE WHEN Vote LIKE "Abstain%" THEN 1 ELSE 0 END) AS Abstain, ' +
		'NULL AS InvalidAbstain, ' +
		'NULL AS InvalidVote, ' +
		'COUNT(*) AS Total ' +
	'FROM results WHERE BallotID = ? ';

/*
 * Get comments summary for ballot
 */
const GET_COMMENTS_FOR_BALLOT =
	'SELECT COUNT(*) AS Count, MIN(CommentID) AS CommentIDMin, MAX(CommentID) AS CommentIDMax ' +
	'FROM comments WHERE BallotID=? ';

module.exports = function(db, rp) {
	var module = {};

	const resultsModule = require('./results')(db, rp);

	module.getBallots = (req, res, next) => {
		var ballots;

		return db.query2(GET_BALLOTS_SQL)
			.then(results => {
				console.log(results)
				ballots = results;

				var p = results.map(r => resultsModule.getResultsLocal(r.BallotID))
				return Promise.all(p)
			})
			.then(results => {
				if (results.length !== ballots.length) {
					throw 'Unexpected mapping'
				}
				return ballots.map((b, i) => {
					b.Comments = {
						Count: b.CommentCount,
						CommentIDMin: b.CommentIDMin,
						CommentIDMax: b.CommentIDMax
					}
					delete b.CommentCount
					delete b.CommentIDMin
					delete b.CommentIDMax
					b.Results = results[i].summary
					return b;
				})
			})
			/*
				results.forEach(r => {
					r.Results = {
						Approve: r.Approve,
						Disapprove: r.Disapprove,
						Abstain: r.Abstain,
						InvalidAbstain: r.InvalidAbstain,
						InvalidVote: r.InvalidVote,
						Total: r.Total
					}
					delete r.Approve
					delete r.Disapprove
					delete r.Abstain
					delete r.InvalidAbstain
					delete r.InvalidVote
					delete r.Total
					r.Comments = {
						Count: r.CommentCount,
						CommentIDMin: r.CommentIDMin,
						CommentIDMax: r.CommentIDMax
					}
					delete r.CommentCount
					delete r.CommentIDMin
					delete r.CommentIDMax
				})
				return results;
			})*/
	}

	module.addBallot = (req, res, next) => {
		console.log(req.body);

		var entry = {
			BallotID: req.body.BallotID,
			VotingPoolID: req.body.VotingPoolID,
			PrevBallotID: req.body.PrevBallotID,
			Project: req.body.Project,
			Document: req.body.Document,
			Topic: req.body.Topic,
			Start: req.body.Start,
			End: req.body.End,
			EpollNum: req.body.EpollNum
		}
		Object.keys(entry).forEach(key => {
			if (entry[key] === undefined) {
				delete entry[key]
			}
		});

		var SQL = `INSERT INTO ballots (${Object.keys(entry)}) VALUES (${db.escape(Object.values(entry))}); SELECT * FROM ballots WHERE BallotID=${db.escape(entry.BallotID)}`;
		return db.query2(SQL)
			.then(results => {
				if (results.length !== 2 || results[1].length != 1) {
					throw "Unexpected result"
				}
				return results[1][0];
			})
			.catch(err => {
				throw err.code == 'ER_DUP_ENTRY'? "An entry already exists with this ID": JSON.stringify(err)
			});
	}

	module.updateBallot = (req, res, next) => {
		console.log(req.body);

		if (!req.body.hasOwnProperty('BallotID')) {
			return Promise.reject('Missing parameter BallotID')
		}
		var id = req.body.BallotID;

		var entry = {
			PrevBallotID: req.body.PrevBallotID,
			VotingPoolID: req.body.VotingPoolID,
			Project: req.body.Project,
			Document: req.body.Document,
			Topic: req.body.Topic,
			Start: req.body.Start,
			End: req.body.End,
			EpollNum: req.body.EpollNum,
		}
		Object.keys(entry).forEach(key => {
			if (entry[key] === undefined) {
				delete entry[key]
			}
		});
		if (Object.keys(entry).length === 0) {
			return Promise.resolve()
		}

		var ballot;
		return db.query2('UPDATE ballots SET ? WHERE BallotID=?; SELECT * FROM ballots WHERE BallotID=?',  [entry, id, id])
			.then(results => {
				if (results.length !== 2 || results[1].length != 1) {
					throw "Unexpected SQL query result"
				}
				ballot = results[1][0];
				if (ballot.VotingPoolID > 0) {
					return db.query2(GET_RESULTS_FOR_BALLOT_WITH_POOL + ';' + GET_COMMENTS_FOR_BALLOT, [ballot.VotingPoolID, ballot.BallotID, ballot.BallotID])
				} else {
					return db.query2(GET_RESULTS_FOR_BALLOT_WITHOUT_POOL + ';' + GET_COMMENTS_FOR_BALLOT, [ballot.BallotID, ballot.BallotID])
				}
			})
			.then(results => {
				if (results.length !== 2) {
					throw "Unexpected SQL query result"
				}
				ballot.Results = results[0][0];
				ballot.Comments = results[1][0];
				return ballot
			})
	}

	module.deleteBallots = (req, res, next) => {
		console.log('Delete for '+ req.url);
		console.log(req.body);

		var ballotids = db.escape(req.body);

		var SQL =
			'START TRANSACTION;' +
			`DELETE FROM ballots WHERE BallotID IN (${ballotids});` +
			`DELETE FROM comments WHERE BallotID IN (${ballotids});` +
			`DELETE FROM resolutions WHERE BallotID IN (${ballotids});` +
			`DELETE FROM results WHERE BallotID IN (${ballotids});` +
			'COMMIT;'
		return db.query2(SQL)
	}

	/*
	 * getEpolls
	 *
	 * Parameters: n = number of entries to get
	 */
	module.getEpolls = (req, res, next) => {
		const sess = req.session;
		console.log(sess);

		var n = req.query.hasOwnProperty('n')? parseInt(req.query.n): 0;

        function recursivePageGet(epolls, n, page) {
			console.log('get epolls n=', n)

			var options = {
				url: `https://mentor.ieee.org/802.11/polls/closed?n=${page}`,
				jar: sess.ieeeCookieJar
			}
			console.log(options.url);

			return rp.get(options)
				.then(body => {
					//console.log(body)
					var epollsPage = parseClosedEpollsPage(body);
					var end = n - epolls.length;
					if (end > epollsPage.length) {
						end = epollsPage.length;
					}
					epolls = epolls.concat(epollsPage.slice(0, end));

					if (epolls.length === n || epollsPage.length === 0) {
						console.log('send ', epolls.length);
						return epolls;
					}

					return recursivePageGet(epolls, n, page+1);
				})
		}

        return recursivePageGet([], n, 1)
	}

	return module;
}