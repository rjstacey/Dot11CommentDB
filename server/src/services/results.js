const cheerio = require('cheerio')
const csvParse = require('csv-parse/lib/sync')
const ExcelJS = require('exceljs')
const db = require('../util/database')
const rp = require('request-promise-native')

function parseEpollResultsCsv(buffer) {

	const p = csvParse(buffer, {columns: false});
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

function parseEpollResultsHtml(body) {
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
			//console.log(result)
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

const myProjectResultsHeader = [
	'Name', 'EMAIL', 'Affiliation(s)', 'Voter Classification', 'Current Vote', 'Comments'
]

async function parseMyProjectResults(buffer, isExcel) {
	var p = [] 	// an array of arrays
	if (isExcel) {
		var workbook = new ExcelJS.Workbook()
		await workbook.xlsx.load(buffer)

		workbook.getWorksheet(1).eachRow(row => {
			p.push(row.values.slice(1, 7))
		})
	}
	else {
		throw "Can't handle .csv file"
	}

	if (p.length < 2) {
		throw 'File has less than 2 rows'
	}

	p.shift()	// PAR #
	if (myProjectResultsHeader.reduce((r, v, i) => r || typeof p[0][i] !== 'string' || p[0][i].search(new RegExp(v, 'i')) === -1, false)) {
		throw `Unexpected column headings ${p[0].join()}. Expected ${myProjectResultsHeader.join()}.`
	}
	p.shift()	// remove heading row

	const results = p.map(c => {
		return {
			Name: c[0],
			Email: c[1],
			Affiliation: c[2],
			Vote: c[4]
		}
	})

	/* The SA results records all voters. We don't want to record votes for voters the pool that do not vote */
	return results.filter(v => v.Vote !== 'None')
}

function appendStr(toStr, str) {
	if (typeof toStr === 'string') {
		return toStr + (toStr? ', ': '') + str
	}
	else {
		return str
	}
}

function colateWGResults(ballotSeries, voters) {
	// Collect each voters last vote
	let results = []
	for (let voter of voters) {
		let v = {}
		v.SAPIN = voter.SAPIN
		v.Email = voter.Email
		v.Status = voter.Status
		v.Vote = ''
		v.Notes = ''
		v.Name = voter.FirstName + ' ' + voter.LastName
		let r = ballotSeries[ballotSeries.length-1].results.find(r => r.SAPIN === voter.SAPIN)
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
				return r.SAPIN !== voter.SAPIN &&
					   r.Email.toLowerCase() === voter.Email.toLowerCase()
			})
			if (r) {
				v.Notes = 'Voted with SAPIN=' + r.SAPIN
				v.Vote = r.Vote
				v.Affiliation = r.Affiliation
				v.CommentCount = r.CommentCount
				r.Notes = 'In pool as SAPIN=' + voter.SAPIN
			}
			else {
				// Otherwise, find their last vote and record that
				for (let i = ballotSeries.length - 2; i >= 0; i--) {
					r = ballotSeries[i].results.find(r => r.SAPIN === voter.SAPIN)
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
		if (v.Vote && /^ExOfficio/.test(voter.Status)) {
			v.Notes = appendStr(v.Notes, voter.Status)
		}

		results.push(v)
	}

	// Add results for those that voted but are not in the pool)
	for (let r of ballotSeries[ballotSeries.length - 1].results) {
		if (results.findIndex(v => v.SAPIN === r.SAPIN) < 0) {
			if (!r.Notes) {	// might be "In pool as..."
				r.Notes = 'Not in pool'
			}
			results.push(r)
		}
	}

	// Remove ExOfficio if they did not vote
	results = results.filter(v => (!/^ExOfficio/.test(v.Status) || v.Vote))
	return results
}

function summarizeWGResults(results) {

	let summary = {
		Approve: 0,
		Disapprove: 0,
		Abstain: 0,
		InvalidVote: 0,
		InvalidAbstain: 0,
		InvalidDisapprove: 0,
		ReturnsPoolSize: 0,
		TotalReturns: 0,
		BallotReturns: 0
	}

	for (let r of results) {
		if (/[Ii]n pool/.test(r.Notes)) {
			if (/Not in pool/.test(r.Notes)) {
				summary.InvalidVote++
			}
		}
		else {
			if (/^Approve/.test(r.Vote)) {
					summary.Approve++
			}
			else if (/^Disapprove/.test(r.Vote)) {
				if (r.CommentCount) {
					summary.Disapprove++
				}
				else {
					summary.InvalidDisapprove++
				}
			}
			else if (/^Abstain.*expertise/.test(r.Vote)) {
				summary.Abstain++
			}
			else if (/^Abstain/.test(r.Vote)) {
				summary.InvalidAbstain++
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
	}
	summary.TotalReturns = summary.Approve + summary.Disapprove + summary.Abstain;

	return summary
}

function colateSAResults(ballotSeries, voters) {
	// Collect each voters last vote
	let results = []
	for (let voter of voters) {
		let v = {}
		v.Email = voter.Email
		v.Name = voter.Name
		v.Vote = ''
		v.Notes = ''
		r = ballotSeries[ballotSeries.length-1].results.find(r => r.Email === v.Email)
		if (r) {
			// If the voter voted in this round, record the vote
			v.Vote = r.Vote
			v.CommentCount = r.CommentCount
			v.Affiliation = r.Affiliation
		}
		else {
			// Otherwise, find their last vote and record that
			for (let i = ballotSeries.length - 2; i >= 0; i--) {
				r = ballotSeries[i].results.find(r => r.Email === v.Email)
				if (r && r.Vote) {
					v.Vote = r.Vote
					v.CommentCount = r.CommentCount
					v.Affiliation = r.Affiliation
					v.Notes = 'From ' + ballotSeries[i].BallotID
					break
				}
			}
		}

		results.push(v)
	}

	return results
}

function summarizeSAResults(results) {

	let summary = {
		Approve: 0,
		Disapprove: 0,
		Abstain: 0,
		InvalidVote: 0,
		InvalidAbstain: 0,
		InvalidDisapprove: 0,
		ReturnsPoolSize: 0,
		TotalReturns: 0,
		BallotReturns: 0
	}

	for (let r of results) {
		if (/^Approve/.test(r.Vote)) {
				summary.Approve++
		}
		else if (/^Disapprove/.test(r.Vote)) {
			if (r.CommentCount) {
				summary.Disapprove++
			}
			else {
				summary.InvalidDisapprove++
			}
		}
		else if (/^Abstain/.test(r.Vote)) {
			summary.Abstain++
		}
	}
	summary.TotalReturns = summary.Approve + summary.Disapprove + summary.InvalidDisapprove + summary.Abstain

	return summary
}

function colateMotionResults(ballotResults, voters) {
	// Collect each voters last vote
	let results = []
	for (let voter of voters) {
		let v = {}
		v.SAPIN = voter.SAPIN
		v.Email = voter.Email
		v.Status = voter.Status
		v.Vote = ''
		v.Notes = ''
		v.Name = voter.FirstName + ' ' + voter.LastName
		let r = ballotResults.find(r => r.SAPIN === voter.SAPIN)
		if (r) {
			// If the voter voted in this round, record the vote
			v.Vote = r.Vote
			v.CommentCount = r.CommentCount
			v.Affiliation = r.Affiliation
		}
		else {
			// Otherwise, see if they voted under a different SA PIN
			r = ballotResults.find(r => {
				// We detect this as a vote with different SA PIN, but same email address
				return r.SAPIN !== voter.SAPIN &&
					   r.Email.toLowerCase() === voter.Email.toLowerCase()
			})
			if (r) {
				v.Notes = 'Voted with SAPIN=' + r.SAPIN
				v.Vote = r.Vote
				v.Affiliation = r.Affiliation
				v.CommentCount = r.CommentCount
				r.Notes = 'In pool as SAPIN=' + voter.SAPIN
			}
		}

		// If this is an ExOfficio voter, then note that
		if (v.Vote && /^ExOfficio/.test(voter.Status)) {
			v.Notes = appendStr(v.Notes, voter.Status)
		}

		results.push(v)
	}

	// Add results for those that voted but are not in the pool)
	for (let r of ballotResults) {
		if (results.findIndex(v => v.SAPIN === r.SAPIN) < 0) {
			if (!r.Notes) {	// might be "In pool as..."
				r.Notes = 'Not in pool'
			}
			results.push(r)
		}
	}

	return results
}

function summarizeMotionResults(results) {
	let summary = {
		Approve: 0,
		Disapprove: 0,
		Abstain: 0,
		InvalidVote: 0,
		InvalidAbstain: 0,
		InvalidDisapprove: 0,
		ReturnsPoolSize: 0,
		TotalReturns: 0,
		BallotReturns: 0
	}

	for (let r of results) {
		if (/[Ii]n pool/.test(r.Notes)) {
			if (/Not in pool/.test(r.Notes)) {
				summary.InvalidVote++
			}
		}
		else {
			if (/^Approve/.test(r.Vote)) {
				summary.Approve++
			}
			else if (/^Disapprove/.test(r.Vote)) {
				summary.Disapprove++
			}
			else if (/^Abstain/.test(r.Vote)) {
				summary.Abstain++
			}

			// All 802.11 members (Status='Voter') count toward the returns pool
			// Only ExOfficio that cast a vote count torward the returns pool
			if (/^Voter/.test(r.Status)) {
				summary.ReturnsPoolSize++
			}
			else if (/^Approve/.test(r.Vote) ||
				(/^Disapprove/.test(r.Vote) && r.CommentCount) ||
				/^Abstain/.test(r.Vote)) {
				summary.ReturnsPoolSize++
			}
		}
	}
	summary.TotalReturns = summary.Approve + summary.Disapprove + summary.Abstain

	return summary
}

function summarizeBallotResults(results) {
	let summary = {
		Approve: 0,
		Disapprove: 0,
		Abstain: 0,
		InvalidVote: 0,
		InvalidAbstain: 0,
		InvalidDisapprove: 0,
		ReturnsPoolSize: 0,
		TotalReturns: 0,
		BallotReturns: 0
	}

	for (let r of results) {
		if (/^Approve/.test(r.Vote)) {
			summary.Approve++
		}
		else if (/^Disapprove/.test(r.Vote)) {
			if (r.CommentCount) {
				summary.Disapprove++
			}
			else {
				summary.InvalidDisapprove++
			}
		}
		else if (/^Abstain/.test(r.Vote)) {
			summary.Abstain++
		}
	}
	summary.TotalReturns = summary.Approve + summary.Disapprove + summary.Abstain

	return summary
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

async function getResults(ballotId) {

	async function recursiveBallotSeriesGet(ballotSeries, ballotId) {
		const results = await db.query(
			'SELECT BallotID, Type, VotingPoolID, PrevBallotID FROM ballots WHERE BallotID=?; ' +
			'SELECT r.*, (SELECT COUNT(*) FROM comments AS c WHERE BallotID=? AND ((c.CommenterSAPIN IS NOT NULL AND c.CommenterSAPIN = r.SAPIN) OR (c.CommenterEmail IS NOT NULL AND c.CommenterEmail = r.Email))) AS CommentCount FROM results AS r WHERE BallotID=?;',
			[ballotId, ballotId, ballotId])

		if (results[0].length === 0) {
			return ballotSeries
		}

		var b = Object.assign({}, results[0][0], {results: results[1]})
		ballotSeries.unshift(b)
		return b.PrevBallotID? recursiveBallotSeriesGet(ballotSeries, b.PrevBallotID): ballotSeries
	}

	// Get ballot information
	var results = await db.query(
		'SELECT *, (SELECT COUNT(*) FROM results WHERE results.BallotID=?) AS BallotReturns FROM ballots WHERE BallotID=?',
		[ballotId, ballotId]
	)
	var ballot = results[0]

	const ballotSeries = await recursiveBallotSeriesGet([], ballotId)	// then get results from each ballot in series
	if (ballotSeries.length === 0) {
		throw 'No such ballot'
	}

	let votingPoolSize, summary
	const type = ballotSeries[0].Type
	const votingPoolId  = ballotSeries[0].VotingPoolID
	if (type === 1) {	// initial WG ballot
		// if there is a voting pool, get that
		const voters = await db.query(
			'SELECT SAPIN, LastName, FirstName, MI, Email, Status FROM wgVoters WHERE VotingPoolID=?',
			[votingPoolId]
			)
		// voting pool size excludes ExOfficio; they are allowed to vote, but don't affect returns
		votingPoolSize = voters.filter(v => !/^ExOfficio/.test(v.Status)).length
		results = colateWGResults(ballotSeries, voters)	// colate results against voting pool and prior ballots in series
		summary = summarizeWGResults(results)
	}
	else if (type === 3) {	// initial SA ballot
		// if there is a voting pool, get that
		const voters = await db.query(
			'SELECT Email, Name FROM saVoters WHERE VotingPoolID=?',
			[votingPoolId]
			)
		votingPoolSize = voters.length
		results = colateSAResults(ballotSeries, voters)	// colate results against voting pool and prior ballots in series
		summary = summarizeSAResults(results)
		summary.ReturnsPoolSize = votingPoolSize
	}
	else if (type === 5) {	// motion
		// if there is a voting pool, get that
		const voters = await db.query(
			'SELECT SAPIN, LastName, FirstName, MI, Email, Status FROM wgVoters WHERE VotingPoolID=?',
			[votingPoolId]
			)
		votingPoolSize = voters.length
		ballot = ballotSeries[ballotSeries.length - 1]
		results = colateMotionResults(ballot.results, voters)	// colate results for just this ballot
		summary = summarizeMotionResults(results)
	}
	else {
		votingPoolSize = 0
		results = ballotSeries[ballotSeries.length - 1].results	// colate results for just this ballot
		summary = summarizeBallotResults(results)
	}

	//console.log(ballot)
	summary.BallotReturns = ballot.BallotReturns
	delete ballot.BallotReturns

	/* Update results summary in ballots table if different */
	const ResultsSummary = JSON.stringify(summary)
	if (ResultsSummary !== ballot.ResultsSummary) {
		await db.query('UPDATE ballots SET ResultsSummary=? WHERE BallotID=?', [ResultsSummary, ballotId])	
	}

	ballot.Results = JSON.parse(ResultsSummary)
	delete ballot.ResultsSummary

	return {
		BallotID: ballotId,
		VotingPoolID: votingPoolId,
		VotingPoolSize: votingPoolSize,
		ballot,
		results,
		summary
	}
}

function deleteResults(ballotId) {
	return db.query('DELETE FROM results WHERE BallotID=?; UPDATE ballots SET ResultsSummary=NULL WHERE BallotID=?', [ballotId, ballotId])
}

async function importEpollResults(sess, ballotId, epollNum) {

	const p1 = rp.get({
		url: `https://mentor.ieee.org/802.11/poll-results.csv?p=${epollNum}`,
		jar: sess.ieeeCookieJar,
		resolveWithFullResponse: true,
		simple: false
	})

	const p2 = rp.get({
		url: `https://mentor.ieee.org/802.11/poll-status?p=${epollNum}`,
		jar: sess.ieeeCookieJar,
		resolveWithFullResponse: true,
		simple: false
	})

	var ieeeRes = await p1
	if (ieeeRes.headers['content-type'] !== 'text/csv') {
		throw 'Not logged in'
	}
	var pollResults = parseEpollResultsCsv(ieeeRes.body)

	ieeeRes = await p2
	/* Get Name and Affiliation from HTML (not present in .csv) */
	var pollResults2 = parseEpollResultsHtml(ieeeRes.body)

	for (let r of pollResults) {
		h = pollResults2.find(h => h.Email === r.Email)
		r.Name = h? h.Name: ''
		r.Affiliation = h? h.Affiliation: ''
	}

	await db.query('DELETE FROM results WHERE BallotID=?', [ballotId])

	if (pollResults.length) {
		const SQL =
			`INSERT INTO results (BallotID, ${Object.keys(pollResults[0])}) VALUES` +
			pollResults.map(c => `(${db.escape(ballotId)}, ${db.escape(Object.values(c))})`).join(',') +
			';'
		try {
			await db.query(SQL)
		}
		catch(err) {
			throw err.code === 'ER_DUP_ENTRY'? "Entry already exists with this ID": err
		}
	}
	const Results = await getResults(ballotId)
	await db.query('UPDATE ballots SET ResultsSummary=? WHERE BallotID=?', [JSON.stringify(Results.summary), ballotId])
	return Results;
}

async function uploadResults(ballotId, type, file) {
	
	let results
	if (type < 3) {
		results = parseEpollResults(file.buffer)
	}
	else {
		const isExcel = file.originalname.search(/\.xlsx$/i) !== -1
		results = await parseMyProjectResults(file.buffer, isExcel)
	}
	//console.log(results);

	await db.query('DELETE FROM results WHERE BallotID=?', [ballotId])

	if (results.length) {
		const SQL =
			`INSERT INTO results (BallotID, ${Object.keys(results[0])}) VALUES` +
			results.map(c => `(${db.escape(ballotId)}, ${db.escape(Object.values(c))})`).join(',') +
			';'
		try {
			await db.query(SQL)
		}
		catch(err) {
			throw err.code === 'ER_DUP_ENTRY'? "Entry already exists with this ID": err
		}
	}
	console.log(ballotId)
	const Results = await getResults(ballotId)
	await db.query('UPDATE ballots SET ResultsSummary=? WHERE BallotID=?', [JSON.stringify(Results.summary), ballotId])
	return Results
}

async function exportResults(params, res) {
	let results
	let fileNamePrefix = ''
	if (params.hasOwnProperty('BallotID')) {
		const ballotId = params.BallotID
		fileNamePrefix = ballotId
		const result = await getResults(ballotId)
		results = [result]	// turn parameter into an array
	}
	else if (params.hasOwnProperty('BallotIDs')) {
		const ballotIds = params.BallotIDs
		fileNamePrefix = ballotIds.join('_')
		results = await Promise.all(ballotIds.map(ballotId => getResults(ballotId)))
	}
	else if (params.hasOwnProperty('Project')) {
		const project = params.Project
		fileNamePrefix = project
		results = await db.query('SELECT BallotID FROM ballots WHERE Project=?', [project])
		results = await Promise.all(results.map(r => getResults(r.BallotID)))
	}
	else {
		throw 'Missing parameter BallotID, BallotIDs or Project'
	}

	let wb = new ExcelJS.Workbook()
	wb.creator = '802.11'
	for (let r of results) {
		let ws = wb.addWorksheet(r.BallotID)
		populateResultsWorksheet(ws, r)
	}

	res.attachment(fileNamePrefix + '_results.xlsx')
	
	await wb.xlsx.write(res)
	res.end()
}

module.exports = {
	getResults,
	deleteResults,
	importEpollResults,
	uploadResults,
	exportResults
}