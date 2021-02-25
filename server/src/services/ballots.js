'user strict'

const db = require('../util/database')
const rp = require('request-promise-native')

import {parseClosedEpollsPage} from './ePollHTML'
import {getResults} from './results'

/*
 * Get ballots SQL query.
 */
const GET_BALLOTS_SQL =
	'SELECT ' +
		'b.*, ' +
		'(SELECT COUNT(*) FROM comments c WHERE b.id=c.ballot_id) AS CommentCount, ' +
		'(SELECT MIN(CommentID) FROM comments c WHERE b.id=c.ballot_id) AS CommentIDMin, ' +
		'(SELECT MAX(CommentID) FROM comments c WHERE b.id=c.ballot_id) AS CommentIDMax ' +
	'FROM ballots b';

/*
 * Get comments summary for ballot
 */
const GetCommentsSummarySQL = (ballotId) =>
	db.format(
		'SELECT ' +
			'COUNT(*) AS Count, ' +
			'MIN(CommentID) AS CommentIDMin, ' + 
			'MAX(CommentID) AS CommentIDMax ' +
		'FROM ballots b JOIN comments c ON b.id=c.ballot_id WHERE b.BallotID=?;',
		[ballotId]
	);

function reformatBallot(b) {
	b.Comments = {
		Count: b.CommentCount,
		CommentIDMin: b.CommentIDMin,
		CommentIDMax: b.CommentIDMax
	}
	delete b.CommentCount
	delete b.CommentIDMin
	delete b.CommentIDMax
	//b.Results = JSON.parse(b.ResultsSummary)
	b.Results = b.ResultsSummary
	delete b.ResultsSummary
	return b
}

async function getBallots() {
	const ballots = await db.query(GET_BALLOTS_SQL + ' ORDER BY Project, Start')
	return ballots.map(b => reformatBallot(b))
}

async function getBallot(ballotId) {
	const ballot = await db.query(GET_BALLOTS_SQL + ' WHERE BallotID=?', [ballotId])
	return reformatBallot(ballot)
}

async function getBallotWithNewResultsSummary(user, ballotId) {
	const {ballot, summary} = await getResults(user, ballotId);
	const commentsSummaries = await db.query(GetCommentsSummarySQL(ballotId));
	console.log(ballot, summary, commentsSummaries)
	return {
		...ballot,
		Comments: commentsSummaries[0],
		Results: summary
	};
}

function ballotEntry(ballot) {
	var entry = {
		BallotID: ballot.BallotID,
		Project: ballot.Project,
		Type: ballot.Type,
		Document: ballot.Document,
		Topic: ballot.Topic,
		Start: ballot.Start && new Date(ballot.Start),
		End: ballot.End && new Date(ballot.End),
		EpollNum: ballot.EpollNum,
		VotingPoolID: ballot.VotingPoolID,
		PrevBallotID: ballot.PrevBallotID
	}

	for (let key of Object.keys(entry)) {
		if (entry[key] === undefined)
			delete entry[key]
	}

	return Object.keys(entry).length? entry: null;
}

async function addBallot(user, ballot) {

	const entry = ballotEntry(ballot);
	console.log(entry)
	if (!entry || !entry.hasOwnProperty('BallotID'))
		throw 'Ballot must have BallotID';

	try {
		console.log(db.format('INSERT INTO ballots (??) VALUES (?);',
			[Object.keys(entry), Object.values(entry)]))
		const results = await db.query(
			'INSERT INTO ballots (??) VALUES (?);',
			[Object.keys(entry), Object.values(entry)]
		);
		const id = results.insertedId;
	}
	catch(err) {
		console.log(err)
		throw err.code == 'ER_DUP_ENTRY'? "An entry already exists with this ID": err
	}

	return getBallotWithNewResultsSummary(user, entry.BallotID);
}

async function addBallots(user, ballots) {
	return Promise.all(ballots.map(b => addBallot(user, b)));
}

async function updateBallot(user, ballot) {
	//console.log(req.body);

	if (!ballot || !ballot.id)
		throw 'Ballot to be updated must have id';

	const entry = ballotEntry(ballot);
	console.log(entry)
	if (entry) {
		try {
			const result = await db.query('UPDATE ballots SET ? WHERE id=?',  [entry, ballot.id]);
			if (result.affectedRows !== 1)
				throw new Error(`Unexpected: no update for ballot with id=${ballot_id}`);
		}
		catch(err) {
			if (err.code === 'ER_DUP_ENTRY')
				throw `Cannot change Ballot ID to ${entry.BallotID}; a ballot with that ID already exists`
			throw err
		}
	}

	const results = await db.query('SELECT BallotID FROM ballots WHERE id=?', [ballot.id]);
	return getBallotWithNewResultsSummary(user, results[0].BallotID);
}

function updateBallots(user, ballots) {
	return Promise.all(ballots.map(b => updateBallot(user, b)));
}

function deleteBallots(user, ballots) {
	if (ballots.find(b => !b.id))
		throw 'Ballots to be deleted must have id';
	const IDs = db.escape(ballots.map(b => b.id));
	return db.query(
		'START TRANSACTION;' +
		`DELETE c, r FROM ballots b JOIN comments c ON b.id=c.ballot_id JOIN resolutions r ON c.id=r.comment_id WHERE b.id IN (${IDs});` +
		`DELETE r FROM ballots b JOIN results r ON r.ballot_id=b.id WHERE b.id IN (${IDs});` +
		`DELETE FROM ballots WHERE id IN (${IDs});` +
		'COMMIT;'
	);
}

/*
* getEpolls
*
* Parameters: n = number of entries to get
*/
async function getEpolls(user, n) {
	console.log(user)

	async function recursivePageGet(epolls, n, page) {
		//console.log('get epolls n=', n)

		var options = {
			url: `https://mentor.ieee.org/802.11/polls/closed?n=${page}`,
			jar: user.ieeeCookieJar
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
			//console.log('send ', epolls.length);
			return epolls;
		}

		return recursivePageGet(epolls, n, page+1);
	}

	const [epollsList, ballots] = await Promise.all([
		recursivePageGet([], n, 1),
		db.query('SELECT BallotId, EpollNum FROM ballots')
	]);
	return epollsList.map(epoll => ({...epoll, InDatabase: !!ballots.find(b => b.EpollNum === epoll.EpollNum)}));
}

export {
	getBallot,
	getBallots,
	addBallots,
	updateBallots,
	deleteBallots,
	getEpolls
}
