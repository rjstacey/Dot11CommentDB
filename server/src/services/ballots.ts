import db from '../utils/database';
import type { OkPacket } from 'mysql2';

import { getResults, getResultsCoalesced, Result } from './results';
import { getVoters } from './voters';
import { getCommentsSummary } from './comments';

import type { User } from './users';

export type Ballot = {
    id: number;
    BallotID: string;
    Project: string;
    Type: number;
    IsRecirc: boolean;
    IsComplete: boolean;
    Start: string;
    End: string;
    Document: string;
    Topic: string;
    VotingPoolID: string;
    prev_id: number;
    EpollNum: number;
    Results: Result[];
	ResultsSummary?: string;
    Comments: {Count: number, CommentIDMin: number, CommentIDMax: number};
}

export const BallotType = {
	CC: 0,			// comment collection
	WG: 1,			// WG ballot
	SA: 2,			// SA ballot
	Motion: 5		// motion
};

/*
 * Get ballots SQL query.
 */
export const getBallotsSQL =
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

/**
 * Get all ballots.
 * 
 * @returns An array of ballot objects.
 */
export async function getBallots() {
	const ballots = await db.query(getBallotsSQL + ' ORDER BY Project, Start') as Ballot[];
	return ballots;
}

/**
 * Get a ballot.
 * 
 * @param id Ballot identifier
 * @returns A ballot object that represents the identified ballot
 */
export async function getBallot(id: number) {
	const [ballot] = await db.query(getBallotsSQL + ' WHERE id=?', [id]) as Ballot[];
	if (!ballot)
		throw new Error(`No such ballot: ${id}`);
	return ballot;
}

async function getBallotWithNewResultsSummary(user: User, ballot_id: number) {
	const {ballot, summary: resultsSummary} = await getResultsCoalesced(user, ballot_id);
	const commentsSummary = await getCommentsSummary(ballot_id);
	return {
		...ballot,
		Comments: commentsSummary,
		Results: resultsSummary
	};
}

export async function getBallotSeriesWithResults(id: number) {

	async function recursiveBallotSeriesGet(ballotSeries, id: number) {
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
	) as Ballot[];
	const ballotsSeries = await Promise.all(ballots.map(b => getBallotSeriesWithResults(b.id)));
	return ballotsSeries;
}

type BallotDB = {
	id?: number;
	BallotID?: string;
	Project?: string;
	Type?: number;
	IsRecirc?: boolean;
	IsComplete?: boolean;
	Document?: string;
	Topic?: string;
	Start?: Date;
	End?: Date;
	EpollNum?: number;
	VotingPoolID?: string | null;
	prev_id?: number | null;
}

function ballotEntry(ballot: Partial<Ballot>) {
	var entry: BallotDB = {
		BallotID: ballot.BallotID,
		Project: ballot.Project,
		Type: ballot.Type,
		IsRecirc: ballot.IsRecirc,
		IsComplete: ballot.IsComplete,
		Document: ballot.Document,
		Topic: ballot.Topic,
		Start: ballot.Start? new Date(ballot.Start): undefined,
		End: ballot.End? new Date(ballot.End): undefined,
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

/**
 * Add a ballot
 * 
 * @param user The user executing the add
 * @param ballot The ballot to be added
 * @returns The ballot as added
 */
async function addBallot(user: User, ballot: Ballot) {

	const entry = ballotEntry(ballot);

	if (!entry || !entry.hasOwnProperty('BallotID'))
		throw 'Ballot must have BallotID';

	let id: number;
	try {
		const results = await db.query(
			'INSERT INTO ballots (??) VALUES (?);',
			[Object.keys(entry), Object.values(entry)]
		) as OkPacket;
		//console.log(results)
		id = results.insertId;
	}
	catch(err: any) {
		throw err.code == 'ER_DUP_ENTRY'? "An entry already exists with this ID": err
	}

	return getBallotWithNewResultsSummary(user, id);
}

/**
 * Add ballots.
 * 
 * @param user The user executing the add
 * @param ballots An array of ballots to be added
 * @returns An array of ballots as added
 */
export async function addBallots(user: User, ballots: Ballot[]) {
	return Promise.all(ballots.map(b => addBallot(user, b)));
}

type BallotUpdate = {
	id: number;
	changes: Partial<Ballot>;
}

/**
 * Update ballot
 * 
 * @param user The user executing the update.
 * @param update An object with shape {id, changes}
 * @param update.id Identifies the ballot.
 * @param update.changes A partial ballot object that contains parameters to be changed.
 */
async function updateBallot(user: User, update: BallotUpdate) {
	const {id, changes} = update;
	if (!id)
		throw new TypeError('Missing id');
	if (!changes || typeof changes !== 'object')
		throw new TypeError('Missing or bad changes');

	const entry = ballotEntry(changes);

	if (entry) {
		const result = await db.query('UPDATE ballots SET ? WHERE id=?',  [entry, id]) as OkPacket;
		if (result.affectedRows !== 1)
			throw new Error(`Unexpected: no update for ballot with id=${id}`);
	}

	return getBallotWithNewResultsSummary(user, id);
}

export function updateBallots(user: User, updates: BallotUpdate[]) {
	return Promise.all(updates.map(u => updateBallot(user, u)));
}

/**
 * Delete ballots.
 *  
 * @param ids An array of ballot identifiers that identify the ballots to delete
 */
export async function deleteBallots(ids: number[]) {
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

