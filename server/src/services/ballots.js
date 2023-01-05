import db from '../utils/database';
import {getResults, getResultsCoalesced} from './results';
import {getVoters} from './voters';
import {getCommentsSummary} from './comments';

export const BallotType = {
	CC: 0,			// comment collection
	WG: 1,			// WG ballot
	SA: 2,			// SA ballot
	Motion: 5		// motion
};

/*
 * Get ballots SQL query.
 */
const getBallotsSQL =
	'SELECT ' +
		'id, BallotID, Project, Type, IsRecirc, IsComplete, Start, End, Document, Topic, VotingPoolID, prev_id, EpollNum, ' +
		'ResultsSummary AS Results, ' +
		'JSON_OBJECT( ' +
			'"Count", (SELECT COUNT(*) FROM comments c WHERE b.id=c.ballot_id), ' +
			'"CommentIDMin", (SELECT MIN(CommentID) FROM comments c WHERE b.id=c.ballot_id), ' +
			'"CommentIDMax", (SELECT MAX(CommentID) FROM comments c WHERE b.id=c.ballot_id) ' +
		') AS Comments ' +
	'FROM ballots b';

/*
 * Get comments summary for ballot
 */

export async function getBallots() {
	const ballots = await db.query(getBallotsSQL + ' ORDER BY Project, Start');
	return ballots;
}

export async function getBallot(id) {
	const [ballot] = await db.query(getBallotsSQL + ' WHERE id=?', [id])
	if (!ballot)
		throw new Error(`No such ballot: ${id}`);
	return ballot;
}

async function getBallotWithNewResultsSummary(user, ballot_id) {
	const {ballot, summary: resultsSummary} = await getResultsCoalesced(user, ballot_id);
	const commentsSummary = await getCommentsSummary(ballot_id);
	return {
		...ballot,
		Comments: commentsSummary,
		Results: resultsSummary
	};
}

export async function getBallotSeriesWithResults(id) {

	async function recursiveBallotSeriesGet(ballotSeries, id) {
		const ballot = await getBallot(id);
		ballotSeries.unshift(ballot);
		return (ballot.prev_id && ballotSeries.length < 20)?
			recursiveBallotSeriesGet(ballotSeries, ballot.prev_id):
			ballotSeries;
	}

	const ballotSeries = await recursiveBallotSeriesGet([], id);
	if (ballotSeries.length > 0) {
		ballotSeries[0].Voters = [];
		if (ballotSeries[0].VotingPoolID) {
			const {voters} = await getVoters(ballotSeries[0].VotingPoolID);
			ballotSeries[0].Voters = voters;
		}
		const results = await Promise.all(ballotSeries.map(b => getResults(b.id)));
		ballotSeries.forEach((ballot, i) => ballot.Results = results[i]);
	}
	return ballotSeries;
}

export async function getRecentBallotSeriesWithResults() {
	const ballots = await db.query(
		getBallotsSQL + ' WHERE ' +
			`Type=${BallotType.WG} AND ` +	// WG ballots
			'IsComplete<>0 ' + 				// series is complete
			'ORDER BY End DESC ' +			// newest to oldest
			'LIMIT 3;'						// last 3
	);
	const ballotsSeries = await Promise.all(ballots.map(b => getBallotSeriesWithResults(b.id)));
	return ballotsSeries;
}

function ballotEntry(ballot) {
	var entry = {
		BallotID: ballot.BallotID,
		Project: ballot.Project,
		Type: ballot.Type,
		IsRecirc: ballot.IsRecirc,
		IsComplete: ballot.IsComplete,
		Document: ballot.Document,
		Topic: ballot.Topic,
		Start: ballot.Start && new Date(ballot.Start),
		End: ballot.End && new Date(ballot.End),
		EpollNum: ballot.EpollNum,
	}

	if (ballot.prev_id) {
		entry.VotingPoolID = '';
		entry.prev_id = ballot.prev_id;
	}
	else if (ballot.VotingPoolID) {
		entry.VotingPoolID = ballot.VotingPoolID;
		entry.prev_id = 0;
	}

	for (let key of Object.keys(entry)) {
		if (entry[key] === undefined)
			delete entry[key]
	}

	return Object.keys(entry).length? entry: null;
}

async function addBallot(user, ballot) {

	const entry = ballotEntry(ballot);

	if (!entry || !entry.hasOwnProperty('BallotID'))
		throw 'Ballot must have BallotID';

	let id;
	try {
		const results = await db.query(
			'INSERT INTO ballots (??) VALUES (?);',
			[Object.keys(entry), Object.values(entry)]
		);
		//console.log(results)
		id = results.insertId;
	}
	catch(err) {
		throw err.code == 'ER_DUP_ENTRY'? "An entry already exists with this ID": err
	}

	return getBallotWithNewResultsSummary(user, id);
}

export async function addBallots(user, ballots) {
	return Promise.all(ballots.map(b => addBallot(user, b)));
}

async function updateBallot(user, update) {
	const {id, changes} = update;
	if (!id)
		throw 'Missing id';
	if (!changes || typeof changes !== 'object')
		throw 'Missing or bad changes';

	const entry = ballotEntry(changes);

	if (entry) {
		const result = await db.query('UPDATE ballots SET ? WHERE id=?',  [entry, id]);
		if (result.affectedRows !== 1)
			throw new Error(`Unexpected: no update for ballot with id=${id}`);
	}

	return getBallotWithNewResultsSummary(user, id);
}

export function updateBallots(user, updates) {
	return Promise.all(updates.map(u => updateBallot(user, u)));
}

export async function deleteBallots(ids) {
	await db.query(
		'START TRANSACTION;' +
		db.format('DELETE r FROM comments c JOIN resolutions r ON c.id=r.comment_id WHERE c.ballot_id IN (?);', [ids]) +
		db.format('DELETE FROM comments WHERE ballot_id IN (?);', [ids]) +
		db.format('DELETE FROM results WHERE ballot_id IN (?);', [ids]) +
		db.format('DELETE FROM ballots WHERE id IN (?);', [ids]) +
		'COMMIT;'
	);
	return null;
}

