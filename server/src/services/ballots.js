'user strict'

const db = require('../util/database')
const rp = require('request-promise-native')
const moment = require('moment-timezone')

import {parseClosedEpollsPage} from './epoll'
import {getResults, getResultsCoalesced} from './results'
import {getVoters} from './voters'

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

	b.Start = moment(b.Start);
	b.End = moment(b.End);

	b.Comments = {
		Count: b.CommentCount,
		CommentIDMin: b.CommentIDMin,
		CommentIDMax: b.CommentIDMax
	};
	delete b.CommentCount;
	delete b.CommentIDMin;
	delete b.CommentIDMax;

	b.Results = b.ResultsSummary;
	delete b.ResultsSummary;

	return b;
}

export async function getBallots() {
	const ballots = await db.query(GET_BALLOTS_SQL + ' ORDER BY Project, Start');
	return ballots.map(reformatBallot);
}

export async function getBallot(ballotId) {
	const [ballot] = await db.query(GET_BALLOTS_SQL + ' WHERE BallotID=?', [ballotId])
	if (!ballot)
		throw `No such ballot: ${ballotId}`;
	return reformatBallot(ballot);
}

async function getBallotWithNewResultsSummary(user, ballotId) {
	const {ballot, summary} = await getResultsCoalesced(user, ballotId);
	const commentsSummaries = await db.query(GetCommentsSummarySQL(ballotId));
	console.log(ballot, summary, commentsSummaries)
	return {
		...ballot,
		Comments: commentsSummaries[0],
		Results: summary
	};
}

export async function getBallotSeriesWithResults(ballotId) {

	async function recursiveBallotSeriesGet(ballotSeries, ballotId) {
		const ballot = await getBallot(ballotId);
		ballotSeries.unshift(ballot);
		return ballot.PrevBallotID && ballotSeries.length < 20?
			recursiveBallotSeriesGet(ballotSeries, ballot.PrevBallotID):
			ballotSeries;
	}

	const ballotSeries = await recursiveBallotSeriesGet([], ballotId);
	if (ballotSeries.length > 0) {
		ballotSeries[0].Voters = [];
		if (ballotSeries[0].VotingPoolID) {
			const {voters} = await getVoters(ballotSeries[0].VotingPoolID);
			ballotSeries[0].Voters = voters;
		}
		const results = await Promise.all(ballotSeries.map(b => getResults(b.BallotID)));
		ballotSeries.forEach((ballot, i) => ballot.Results = results[i]);
	}
	return ballotSeries;
}

export async function getRecentBallotSeriesWithResults() {
	const ballots = await db.query(
		GET_BALLOTS_SQL + ' WHERE ' +
			'(Type=2 OR Type=3) AND ' +		// WG ballots
			'IsComplete=1 ' + 				// series is complete
			'ORDER BY End DESC ' +			// newest to oldest
			'LIMIT 3;'						// last 3
	);
	const ballotsSeries = await Promise.all(ballots.map(b => getBallotSeriesWithResults(b.BallotID)));
	return ballotsSeries;
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
		PrevBallotID: ballot.PrevBallotID,
		IsComplete: ballot.IsComplete
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

export async function addBallots(user, ballots) {
	return Promise.all(ballots.map(b => addBallot(user, b)));
}

async function updateBallot(user, ballot) {
	//console.log(req.body);

	if (!ballot || !ballot.id)
		throw 'Ballot to be updated must have id';

	const entry = ballotEntry(ballot);
	console.log(entry)
	if (entry) {
		const result = await db.query('UPDATE ballots SET ? WHERE id=?',  [entry, ballot.id]);
		if (result.affectedRows !== 1)
			throw new Error(`Unexpected: no update for ballot with id=${ballot_id}`);
	}

	const results = await db.query('SELECT BallotID FROM ballots WHERE id=?', [ballot.id]);
	return getBallotWithNewResultsSummary(user, results[0].BallotID);
}

export function updateBallots(user, ballots) {
	return Promise.all(ballots.map(b => updateBallot(user, b)));
}

export async function deleteBallots(ids) {
	await db.query(
		'START TRANSACTION;' +
		db.format('DELETE c, r FROM ballots b JOIN comments c ON b.id=c.ballot_id JOIN resolutions r ON c.id=r.comment_id WHERE b.id IN (?);', [ids]) +
		db.format('DELETE r FROM ballots b JOIN results r ON r.ballot_id=b.id WHERE b.id IN (?);', [ids]) +
		db.format('DELETE FROM ballots WHERE id IN (?);', [ids]) +
		'COMMIT;'
	);
	return null;
}

