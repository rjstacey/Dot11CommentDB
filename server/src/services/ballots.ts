import db from '../utils/database';
import { type OkPacket } from 'mysql2';
import { DateTime } from 'luxon';
import { isPlainObject, NotFoundError } from '../utils';

import { getResultsCoalesced, ResultsSummary } from './results';
import { CommentsSummary } from './comments';

import { type User } from './users';
import { type Group } from './groups';
import { AccessLevel } from '../auth/access';

export type Ballot = {
    id: number;
	groupId: string | null;
	workingGroupId: string;
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
	Voters: number;
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
const getBallotsSQL = `
	SELECT
		b.id, b.BallotID, b.Project, b.Type, b.IsRecirc, b.IsComplete,
		DATE_FORMAT(b.Start, "%Y-%m-%dT%TZ") AS Start,
		DATE_FORMAT(b.End, "%Y-%m-%dT%TZ") AS End,
		b.Document, b.Topic, b.VotingPoolID, b.prev_id, b.EpollNum,
		BIN_TO_UUID(b.groupId) as groupId,
		BIN_TO_UUID(b.workingGroupId) as workingGroupId,
		b.ResultsSummary AS Results,
		JSON_OBJECT(
			"Count", (SELECT COUNT(*) FROM comments c WHERE b.id=c.ballot_id),
			"CommentIDMin", (SELECT MIN(CommentID) FROM comments c WHERE b.id=c.ballot_id),
			"CommentIDMax", (SELECT MAX(CommentID) FROM comments c WHERE b.id=c.ballot_id)
		) AS Comments,
		(SELECT COUNT(*) FROM wgVoters v WHERE b.id=v.ballot_id) as Voters
	FROM ballots b`;

/*
 * Get comments summary for ballot
 */

/**
 * Get all ballots.
 * 
 * @returns An array of ballot objects.
 */
export async function getBallots(workingGroup: Group) {
	const sql = db.format(getBallotsSQL + ' WHERE b.workingGroupId=UUID_TO_BIN(?) ORDER BY b.Project, b.Start', [workingGroup.id]);
	const ballots = await db.query({sql, dateStrings: true}) as Ballot[];
	return ballots;
}

/**
 * Get a ballot.
 * 
 * @param id Ballot identifier
 * @returns A ballot object that represents the identified ballot
 */
export async function getBallot(id: number) {
	const sql = getBallotsSQL + db.format(' WHERE b.id=?', [id]);
	const [ballot] = await db.query({sql, dateStrings: true}) as Ballot[];
	if (!ballot)
		throw new NotFoundError(`No such ballot: ${id}`);
	return ballot;
}

export async function getBallotWithNewResultsSummary(user: User, ballot_id: number) {
	let ballot = await getBallot(ballot_id);
	ballot  = (await getResultsCoalesced(user, AccessLevel.ro, ballot)).ballot;
	return ballot;
}

/** Get ballot series
 * Walk back through the previous ballots until the initial ballot
 * @param id last ballot in series
 * @returns an array of ballot identifiers starting with the initial ballot that is the ballot series
 */
export async function getBallotSeries(id: number) {

	/*async function recursiveBallotSeriesGet(ballotSeries: Ballot[], id: number): Promise<Ballot[]> {
		const ballot = await getBallot(id);
        if (!ballot)
            return ballotSeries;
		ballotSeries.unshift(ballot);
        if (!ballot.prev_id || ballotSeries.length === 30)
            return ballotSeries;
        
		return recursiveBallotSeriesGet(ballotSeries, ballot.prev_id);
	}

	let ballots = await recursiveBallotSeriesGet([], id);*/

	const sql = db.format(`
		WITH RECURSIVE cte AS (
			${getBallotsSQL} WHERE b.id = ?
			UNION ALL
			${getBallotsSQL}
			INNER JOIN cte ON b.id = cte.prev_id
		)
		SELECT * FROM cte ORDER BY Start;
	`, [id]);

	const ballots = await db.query({sql, dateStrings: true}) as Ballot[];
	return ballots;
}

export async function getRecentWgBallots(n = 3) {
	const sql = getBallotsSQL + ' WHERE ' +
		`Type=${BallotType.WG} AND ` +	// WG ballots
		'IsComplete<>0 ' + 				// series is complete
		'ORDER BY End DESC ' +			// newest to oldest
		db.format('LIMIT ?;', [n]);		// last n

	const ballots = await db.query({sql, dateStrings: true}) as Ballot[];
	return ballots;
}

type BallotDB = {
	id?: number;
	groupId?: string | null;
	BallotID?: string;
	Project?: string;
	Type?: number;
	IsRecirc?: boolean;
	IsComplete?: boolean;
	Document?: string;
	Topic?: string;
	Start?: string | null;
	End?: string | null;
	EpollNum?: number | null;
	VotingPoolID?: string | null;
	prev_id?: number | null;
}

function ballotEntry(ballot: Partial<Ballot>) {
	var entry: BallotDB = {
		groupId: ballot.groupId,
		BallotID: ballot.BallotID,
		Project: ballot.Project,
		Type: ballot.Type,
		IsRecirc: ballot.IsRecirc,
		IsComplete: ballot.IsComplete,
		Document: ballot.Document,
		Topic: ballot.Topic,
		EpollNum: ballot.EpollNum,
	}

	if (typeof ballot.Start !== 'undefined') {
		if (ballot.Start) {
			const start = DateTime.fromISO(ballot.Start);
			if (!start.isValid)
				throw new TypeError('Invlid parameter start: ' + ballot.Start);
			entry.Start = start.toUTC().toFormat('yyyy-MM-dd HH:mm:ss');
		}
		else {
			entry.Start = null;
		}
	}

	if (typeof ballot.End !== 'undefined') {
		if (ballot.End) {
			const end = DateTime.fromISO(ballot.End);
			if (!end.isValid)
				throw new TypeError('Invlid parameter start: ' + ballot.End);
			entry.End = end.toUTC().toFormat('yyyy-MM-dd HH:mm:ss');
		}
		else {
			entry.End = null;
		}
	}

	if (ballot.prev_id) {
		entry.VotingPoolID = '';
		entry.prev_id = ballot.prev_id;
	}

	for (let key of Object.keys(entry)) {
		if (entry[key] === undefined)
			delete entry[key]
	}

	return entry;
}

function ballotSetSql(ballot: Partial<BallotDB>) {
	const sets: string[] = [];
	for (const [key, value] of Object.entries(ballot)) {
		let sql: string;
		if (key === 'groupId')
			sql = db.format('??=UUID_TO_BIN(?)', [key, value]);
		else
			sql = db.format('??=?', [key, value]);
		sets.push(sql);
	}
	return sets.join(', ');
}


/**
 * Add a ballot
 * 
 * @param user The user executing the add
 * @param ballot The ballot to be added
 * @returns The ballot as added
 */
async function addBallot(user: User, workingGroup: Group, ballot: Ballot) {

	const entry = ballotEntry(ballot);

	// If the group is not set, set to working group
	if (!entry.groupId)
		entry.groupId = workingGroup.id;

	let id: number;
	try {
		const sql = 'INSERT INTO ballots SET ' + 
			db.format('workingGroupId=UUID_TO_BIN(?), ', [workingGroup.id]) +
			ballotSetSql(entry);
		const results = await db.query({sql, dateStrings: true}) as OkPacket;
		id = results.insertId;
	}
	catch(err: any) {
		throw err.code == 'ER_DUP_ENTRY'? new TypeError("An entry already exists with BallotID=" + ballot.BallotID): err
	}

	return getBallotWithNewResultsSummary(user, id);
}

function validBallot(ballot: any): ballot is Ballot {
	return isPlainObject(ballot) &&
		ballot.BallotID && typeof ballot.BallotID === 'string' &&
		ballot.Project && typeof ballot.Project === 'string';
}

export function validBallots(ballots: any): ballots is Ballot[] {
	return Array.isArray(ballots) && ballots.every(validBallot);
}

/**
 * Add ballots
 * 
 * @param user The user executing the add
 * @param ballots An array of ballots to be added
 * @returns An array of ballots as added
 */
export async function addBallots(user: User, workingGroup: Group, ballots: Ballot[]) {
	if (!validBallots(ballots))
		throw new TypeError("Bad or missing array of ballot objects");

	return Promise.all(ballots.map(b => addBallot(user, workingGroup, b)));
}

/**
 * Update ballot
 * 
 * @param user The user executing the update.
 * @param update An object with shape {id, changes}
 * @param update.id Identifies the ballot.
 * @param update.changes A partial ballot object that contains parameters to change.
 * @returns The ballot as updated
 */
async function updateBallot(user: User, workingGroup: Group, update: BallotUpdate) {
	const {id, changes} = update;
	const entry = ballotEntry(changes);
	if (Object.keys(entry).length > 0) {
		const sql = 'UPDATE ballots SET ' +
			ballotSetSql(entry) +
			db.format(' WHERE id=? AND workingGroupId=UUID_TO_BIN(?)', [id, workingGroup.id]);
		const result = await db.query({sql, dateStrings: true}) as OkPacket;
		if (result.affectedRows !== 1)
			throw new Error(`Unexpected: no update for ballot with id=${id}`);
	}

	return getBallotWithNewResultsSummary(user, id);
}

function validUpdate(update: any): update is BallotUpdate {
	return isPlainObject(update) &&
		typeof update.id === 'number' &&
		isPlainObject(update.changes);
}

export function validBallotUpdates(updates: any): updates is BallotUpdate[] {
	return Array.isArray(updates) && updates.every(validUpdate);
}

/**
 * Update ballots
 * 
 * @param user The user executing the update.
 * @param updates An array of objects with shape {id, changes}
 * @returns An array of ballots as updated
 */
export function updateBallots(user: User, workingGroup: Group, updates: BallotUpdate[]) {
	return Promise.all(updates.map(u => updateBallot(user, workingGroup, u)));
}

export function validBallotIds(ids: any): ids is number[] {
	return Array.isArray(ids) && ids.every(id => typeof id === 'number');
}

/**
 * Delete ballots along with associated comments, resolutions and results
 * 
 * @param user - The user executing the delete.
 * @param workingGroup - The working group from path
 * @param ids - An array of ballot identifiers that identify the ballots to delete
 */
export async function deleteBallots(user: User, workingGroup: Group, ids: number[]) {
	// Make sure the ids are owned by the working group
	const ballots = await db.query('SELECT id WHERE id IN (?) AND workingGroupId=UUID_TO_BIN(?)', [ids, workingGroup.id]) as {id: number}[];
	if (ballots.length > 0) {
		ids = ballots.map(b => b.id);
		await db.query(
			'START TRANSACTION;' +
			db.format('DELETE r FROM comments c JOIN resolutions r ON c.id=r.comment_id WHERE c.ballot_id IN (?);', [ids]) +
			db.format('DELETE FROM comments WHERE ballot_id IN (?);', [ids]) +
			db.format('DELETE FROM results WHERE ballot_id IN (?);', [ids]) +
			db.format('DELETE FROM ballots WHERE id IN (?);', [ids]) +
			'COMMIT;'
		);
	}
	return null;
}
