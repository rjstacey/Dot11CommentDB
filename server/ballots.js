var cheerio = require('cheerio');
var moment = require('moment-timezone');
const results = require('./results');

// Convert date string to UTC
function parseDateTime(dateStr) {
	// Date is in format: "11-Dec-2018 23:59:59 ET" and is always eastern time
	return moment.tz(dateStr, 'DD-MMM-YYYY HH:mm:ss', 'America/New_York').format();
}

function parseClosedEpollsPage(body) {
	var epolls = [];
	var $ = cheerio.load(body);
          
	// If we get the "ePolls" page then parse the data table
	// (use cheerio, which provides jQuery parsing)
	if ($('div.title').length && $('div.title').html() == "ePolls") {
		//console.log('GOT ePolls page');
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
 */
const GET_BALLOTS_SQL =
	'SELECT ' +
		'ballots.*, ' +
		'(SELECT COUNT(*) FROM comments WHERE comments.BallotID = ballots.BallotID) AS CommentCount, ' +
		'(SELECT MIN(CommentID) FROM comments WHERE comments.BallotID = ballots.BallotID) AS CommentIDMin, ' +
		'(SELECT MAX(CommentID) FROM comments WHERE comments.BallotID = ballots.BallotID) AS CommentIDMax ' +
	'FROM ballots ORDER BY Project, Start';

/*
 * Get comments summary for ballot
 */
const GET_COMMENTS_FOR_BALLOT =
	'SELECT COUNT(*) AS Count, MIN(CommentID) AS CommentIDMin, MAX(CommentID) AS CommentIDMax ' +
	'FROM comments WHERE BallotID=? ';

module.exports = function(db, rp, resultsModule) {
	var module = {};

	module.getBallots = async (req, res, next) => {
		const ballots = await db.query(GET_BALLOTS_SQL)
		return ballots.map(b => {
			b.Comments = {
				Count: b.CommentCount,
				CommentIDMin: b.CommentIDMin,
				CommentIDMax: b.CommentIDMax
			}
			delete b.CommentCount
			delete b.CommentIDMin
			delete b.CommentIDMax
			b.Results = JSON.parse(b.ResultsSummary);
			delete b.ResultsSummary;
			return b;
		})
	}

	async function getBallotWithNewResultsSummary(ballotId) {
		let results;
		results = await resultsModule.getResultsLocal(ballotId)
		var summary = JSON.stringify(results.summary);
			
		results = await db.query(
			'UPDATE ballots SET ResultsSummary=? WHERE BallotID=?;' +
			GET_COMMENTS_FOR_BALLOT + ';' +
			'SELECT * FROM ballots WHERE BallotID=?', [summary, ballotId, ballotId, ballotId]
			);

		if (results.length !== 3 && results[1].length !== 1 && results[2].length !== 1) {
			throw new Error("Unexpected result SQL SELECT")
		}
		ballotData = results[2][0];
		ballotData.Results = JSON.parse(ballotData.ResultsSummary);
		delete ballotData.ResultsSummary;
		ballotData.Comments = results[1][0];
		return ballotData;
	}

	module.addBallot = async (req, res, next) => {
		//console.log(req.body);

		var entry = {
			BallotID: req.body.BallotID,
			Project: req.body.Project,
			Type: req.body.Type,
			Document: req.body.Document,
			Topic: req.body.Topic,
			Start: req.body.Start,
			End: req.body.End,
			EpollNum: req.body.EpollNum,
			VotingPoolID: req.body.VotingPoolID,
			PrevBallotID: req.body.PrevBallotID
		}

		for (let key of Object.keys(entry)) {
			if (entry[key] === undefined) {
				delete entry[key]
			}
		}

		try {
			const results = await db.query(
				'INSERT INTO ballots (??) VALUES (?)',
				[Object.keys(entry), Object.values(entry)]
				);

			if (results.affectedRows !== 1) {
				throw "Unexpected result"
			}
			return getBallotWithNewResultsSummary(entry.BallotID);
		}
		catch(err) {
			throw err.code == 'ER_DUP_ENTRY'? "An entry already exists with this ID": JSON.stringify(err)
		}
	}

	module.updateBallot = async (req, res, next) => {
		console.log(req.body);

		if (!req.params.hasOwnProperty('ballotId')) {
			return Promise.reject('Missing parameter ballotId')
		}
		var id = req.params.ballotId;

		var entry = {
			BallotID: req.body.BallotID,
			Project: req.body.Project,
			Type: req.body.Type,
			Document: req.body.Document,
			Topic: req.body.Topic,
			Start: req.body.Start,
			End: req.body.End,
			EpollNum: req.body.EpollNum,
			PrevBallotID: req.body.PrevBallotID,
			VotingPoolID: req.body.VotingPoolID
		}

		for (let key of Object.keys(entry)) {
			if (entry[key] === undefined) {
				delete entry[key]
			}
		}

		if (Object.keys(entry).length === 0) {
			return Promise.resolve(null)
		}

		try {
			const result = await db.query('UPDATE ballots SET ? WHERE BallotID=?',  [entry, id]);
			if (result.affectedRows !== 1) {
				console.log(result)
				throw new Error("Unexpected result from SQL UPDATE")
			}
		}
		catch(err) {
			if (err.code === 'ER_DUP_ENTRY') {
					throw `Cannot change Ballot ID to ${entry.BallotID}; a ballot with that ID already exists`
				}
			throw err
		}
		
		if (entry.hasOwnProperty('BallotID') && id !== entry.BallotID) {
			// The BallotID is being updated; do so for all tables
			var SQL = db.format(
				'SET @oldId = ?; SET @newId = ?; ' +
				'UPDATE results SET BallotID=@newId WHERE BallotID=@oldId; ' +
				'UPDATE comments SET BallotID=@newId WHERE BallotID=@oldId; ' +
				'UPDATE resolutions SET BallotID=@newId WHERE BallotID=@oldId; ',
				[id, entry.BallotID]);

			id = entry.BallotID;	// Use new BallotID

			await db.query(SQL)
		}

		return getBallotWithNewResultsSummary(id);
	}

	module.deleteBallots = (req, res, next) => {
		console.log(req.body);

		const ballotids = db.escape(req.body);
		const SQL =
			'START TRANSACTION;' +
			`DELETE FROM ballots WHERE BallotID IN (${ballotids});` +
			`DELETE FROM comments WHERE BallotID IN (${ballotids});` +
			`DELETE FROM resolutions WHERE BallotID IN (${ballotids});` +
			`DELETE FROM results WHERE BallotID IN (${ballotids});` +
			'COMMIT;'
		return db.query(SQL)
	}

	/*
	 * getEpolls
	 *
	 * Parameters: n = number of entries to get
	 */
	module.getEpolls = async (req, res, next) => {
		const sess = req.session;
		//console.log(sess);

		var n = req.query.hasOwnProperty('n')? parseInt(req.query.n): 0;

        async function recursivePageGet(epolls, n, page) {
			console.log('get epolls n=', n)

			var options = {
				url: `https://mentor.ieee.org/802.11/polls/closed?n=${page}`,
				jar: sess.ieeeCookieJar
			}
			//console.log(options.url);

			const body = await rp.get(options);

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
		}

		const epollsList = recursivePageGet([], n, 1);
		const ballots = await db.query('SELECT BallotId, EpollNum FROM ballots');
		for (epoll of await epollsList) {
			epoll.InDatabase = !!ballots.find(b => b.EpollNum === epoll.EpollNum)
		}
		return epollsList
	}

	return module;
}