import db from '../utils/database';
import type { OkPacket } from 'mysql2';
import { isPlainObject } from '../utils';

import { getResultsCoalesced, ResultsSummary } from './results';
import { getCommentsSummary, CommentsSummary } from './comments';

import type { User } from './users';

export type Ballot = {
    id: number;
    BallotID: string;
    Project: string;
    Type: number;
    IsRecirc: boolean;
    IsComplete: boolean;
    Start: string | null;
    End: string | null;
    Document: string;
    Topic: string;
    VotingPoolID: string | null;
    prev_id: number | null;
    EpollNum: number | null;
    Results: ResultsSummary | null;
    Comments: CommentsSummary;
}

type BallotUpdate = {
	id: Ballot["id"];
	changes: Partial<Ballot>;
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

export async function getBallotWithNewResultsSummary(user: User, ballot_id: number) {
	const {ballot} = await getResultsCoalesced(user, ballot_id);
	return ballot;
}

export async function getBallotSeries(id: number) {

	async function recursiveBallotSeriesGet(ballotSeries: Ballot[], id: number): Promise<Ballot[]> {
		const ballot = await getBallot(id);
        if (!ballot)
            return ballotSeries;
		ballotSeries.unshift(ballot);
        if (!ballot.prev_id || ballotSeries.length === 30)
            return ballotSeries;
        
		return recursiveBallotSeriesGet(ballotSeries, ballot.prev_id);
	}

	return recursiveBallotSeriesGet([], id);
}

export async function getRecentWgBallots(n = 3) {
	const ballots = await db.query(
		getBallotsSQL + ' WHERE ' +
			`Type=${BallotType.WG} AND ` +	// WG ballots
			'IsComplete<>0 ' + 				// series is complete
			'ORDER BY End DESC ' +			// newest to oldest
			'LIMIT ?;',						// last n
		[n]
	) as Ballot[];
	return ballots;
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
	EpollNum?: number | null;
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

	if (!entry || !entry.hasOwnProperty('BallotID') || !entry.hasOwnProperty('Project'))
		throw new TypeError('Ballot must have BallotID and Project');

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
		throw err.code == 'ER_DUP_ENTRY'? new TypeError("An entry already exists with BallotID=" + ballot.BallotID): err
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

/**
 * Update ballot
 * 
 * @param user The user executing the update.
 * @param update An object with shape {id, changes}
 * @param update.id Identifies the ballot.
 * @param update.changes A partial ballot object that contains parameters to change.
 */
async function updateBallot(user: User, update: object | BallotUpdate) {
	if (!('id' in update) || typeof update.id !== 'number' ||
	    !('changes' in update) || !isPlainObject(update.changes)) {
		throw new TypeError("Bad update object: expect shape: {id: number; changes: object}");
	}
	const {id, changes} = update;

	const entry = ballotEntry(changes);

	if (entry) {
		const result = await db.query('UPDATE ballots SET ? WHERE id=?',  [entry, id]) as OkPacket;
		if (result.affectedRows !== 1)
			throw new Error(`Unexpected: no update for ballot with id=${id}`);
	}

	return getBallotWithNewResultsSummary(user, id);
}

export function updateBallots(user: User, updates: (object | BallotUpdate)[]) {
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

