import db from "../utils/database";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { DateTime } from "luxon";
import { isPlainObject, NotFoundError } from "../utils";

import { getResultsCoalesced, ResultsSummary } from "./results";
import { CommentsSummary } from "./comments";

import { type User } from "./users";
import { type Group } from "./groups";
import { AccessLevel } from "../auth/access";

export type Ballot = {
	id: number;
	groupId: string | null;
	Type: number;
	number: number;
	workingGroupId: string;
	BallotID: string;
	Project: string;
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
};

type BallotUpdate = {
	id: Ballot["id"];
	changes: Partial<Ballot>;
};

export const BallotType = {
	CC: 0, // comment collection
	WG: 1, // WG ballot
	SA: 2, // SA ballot
	Motion: 5, // motion
};

/*
 * Get ballots SQL query.
 */
const getBallotsSQL = `
	SELECT
		b.id,
		BIN_TO_UUID(b.groupId) as groupId,
		b.Type,
		b.number,
		b.BallotID, b.Project, b.IsRecirc, b.IsComplete,
		DATE_FORMAT(b.Start, "%Y-%m-%dT%TZ") AS Start,
		DATE_FORMAT(b.End, "%Y-%m-%dT%TZ") AS End,
		b.Document, b.Topic, b.VotingPoolID, b.prev_id, b.EpollNum,
		BIN_TO_UUID(b.workingGroupId) as workingGroupId,
		b.ResultsSummary AS Results,
		JSON_OBJECT(
			"Count", (SELECT COUNT(*) FROM comments c WHERE b.id=c.ballot_id),
			"CommentIDMin", (SELECT MIN(CommentID) FROM comments c WHERE b.id=c.ballot_id),
			"CommentIDMax", (SELECT MAX(CommentID) FROM comments c WHERE b.id=c.ballot_id)
		) AS Comments,
		(SELECT COUNT(*) FROM wgVoters v WHERE b.id=v.ballot_id) as Voters
	FROM ballots b`;

interface BallotsQueryConstraints {
	id?: number | number[];
	workingGroupId?: string | string[];
	groupId?: string | string[];
	BallotID?: string | string[];
	Type?: number | number[];
};

/**
 * Get all ballots.
 *
 * @param constraints Constraints on the query
 * @returns An array of ballot objects.
 */
export async function getBallots(constraints?: BallotsQueryConstraints) {

	let sql = getBallotsSQL;

	if (constraints) {
		const wheres: string[] = [];
		Object.entries(constraints).forEach(([key, value]) => {
			wheres.push(
				(key === 'groupId' || key === 'workingGroupId')?
					db.format(Array.isArray(value)? 'BIN_TO_UUID(??) IN (?)': 'BIN_TO_UUID(??)=?', [key, value]):
					db.format(Array.isArray(value)? '?? IN (?)': '??=?', [key, value])
			);
		});
		if (wheres.length > 0)
			sql += ' WHERE ' + wheres.join(' AND ');
	}

	sql += " ORDER BY b.Project, b.Start";

	const ballots = (await db.query({ sql, dateStrings: true })) as Ballot[];
	return ballots;
}

/**
 * Get a ballot.
 *
 * @param id Ballot identifier
 * @returns A ballot object that represents the identified ballot
 */
export async function getBallot(id: number) {
	const sql = getBallotsSQL + db.format(" WHERE b.id=?", [id]);
	const [ballot] = (await db.query({ sql, dateStrings: true })) as Ballot[];
	if (!ballot) throw new NotFoundError(`No such ballot: ${id}`);
	return ballot;
}

export async function getBallotWithNewResultsSummary(
	user: User,
	ballot_id: number
) {
	let ballot = await getBallot(ballot_id);
	ballot = (await getResultsCoalesced(user, AccessLevel.ro, ballot)).ballot;
	return ballot;
}

/** 
 * Get ballot series
 * Walk back through the previous ballots until the initial ballot
 * @param id last ballot in series
 * @returns an array of ballots (starting with the initial ballot) that is the ballot series
 */
export function getBallotSeries(id: number): Promise<Ballot[]> {
	const sql = `
		WITH RECURSIVE cte AS (
			${getBallotsSQL} WHERE b.id = ${db.escape(id)}
			UNION ALL
			${getBallotsSQL}
			INNER JOIN cte ON b.id = cte.prev_id
		)
		SELECT * FROM cte ORDER BY Start;
	`;

	return db.query<(RowDataPacket & Ballot)[]>({ sql, dateStrings: true });
}

type BallotSeriesRange = {
	id: number;
	Start: string;
	End: string;
};

/**
 * Get recent ballot series
 * @returns An array of ballot arrays that are the recent ballot series
 */
export async function getRecentBallotSeries(groupId: string) {
	const sql = `
		WITH RECURSIVE cte AS (
			SELECT id, prev_id, 1 level, Start, End FROM ballots WHERE groupId=UUID_TO_BIN(${db.escape(groupId)}) AND IsComplete<>0 AND type=1 
			UNION ALL 
			SELECT c.id, t.prev_id, level + 1, t.Start, NULL End FROM cte c 
			INNER JOIN ballots t on t.id=c.prev_id
		)
		SELECT
			id,
			DATE_FORMAT(MIN(Start), "%Y-%m-%dT%TZ") AS Start,
			DATE_FORMAT(MAX(End), "%Y-%m-%dT%TZ") AS End
		FROM cte
		GROUP BY id
		ORDER BY End;
	`;
	const allBallotSeries = (await db.query({
		sql,
		dateStrings: true,
	})) as BallotSeriesRange[];

	// Find the earliest start of the last three ballot series
	let minStart = DateTime.now();
	allBallotSeries.slice(-3).forEach((ballotSeries) => {
		const start = DateTime.fromISO(ballotSeries.Start);
		if (minStart > start) minStart = start;
	});

	// Get an array of ballot arrays that are the recent ballot series
	const ballotsArr = await Promise.all(
		allBallotSeries
			.filter(
				(ballotSeries) =>
					DateTime.fromISO(ballotSeries.Start) >= minStart
			)
			.map((ballotSeries) => getBallotSeries(ballotSeries.id))
	);

	return ballotsArr;
}

type BallotDB = {
	id?: number;
	groupId?: string | null;
	BallotID?: string;
	Project?: string;
	Type?: number;
	number?: number,
	IsRecirc?: boolean;
	IsComplete?: boolean;
	Document?: string;
	Topic?: string;
	Start?: string | null;
	End?: string | null;
	EpollNum?: number | null;
	VotingPoolID?: string | null;
	prev_id?: number | null;
};

function ballotEntry(ballot: Partial<Ballot>) {
	var entry: BallotDB = {
		groupId: ballot.groupId,
		number: ballot.number,
		BallotID: ballot.BallotID,
		Project: ballot.Project,
		Type: ballot.Type,
		IsRecirc: ballot.IsRecirc,
		IsComplete: ballot.IsComplete,
		Document: ballot.Document,
		Topic: ballot.Topic,
		EpollNum: ballot.EpollNum,
	};

	if (typeof ballot.Start !== "undefined") {
		if (ballot.Start) {
			const start = DateTime.fromISO(ballot.Start);
			if (!start.isValid)
				throw new TypeError("Invlid parameter start: " + ballot.Start);
			entry.Start = start.toUTC().toFormat("yyyy-MM-dd HH:mm:ss");
		} else {
			entry.Start = null;
		}
	}

	if (typeof ballot.End !== "undefined") {
		if (ballot.End) {
			const end = DateTime.fromISO(ballot.End);
			if (!end.isValid)
				throw new TypeError("Invlid parameter start: " + ballot.End);
			entry.End = end.toUTC().toFormat("yyyy-MM-dd HH:mm:ss");
		} else {
			entry.End = null;
		}
	}

	if (ballot.prev_id) {
		entry.VotingPoolID = "";
		entry.prev_id = ballot.prev_id;
	}

	for (let key of Object.keys(entry)) {
		if (entry[key] === undefined) delete entry[key];
	}

	return entry;
}

function ballotSetSql(ballot: Partial<BallotDB>) {
	const sets: string[] = [];
	for (const [key, value] of Object.entries(ballot)) {
		let sql: string;
		if (key === "groupId")
			sql = db.format("??=UUID_TO_BIN(?)", [key, value]);
		else sql = db.format("??=?", [key, value]);
		sets.push(sql);
	}
	return sets.join(", ");
}

/**
 * Add a ballot
 *
 * @param user The user executing the add
 * @param workingGroup The working group from path
 * @param ballot The ballot to be added
 * @returns The ballot as added
 */
async function addBallot(user: User, workingGroup: Group, ballot: Ballot) {
	const entry = ballotEntry(ballot);
	if (!entry.BallotID)
		entry.BallotID = "__BallotID__"

	// If the group is not set, set to working group
	if (!entry.groupId) entry.groupId = workingGroup.id;

	let id: number;
	try {
		const sql =
			"INSERT INTO ballots SET " +
			db.format("workingGroupId=UUID_TO_BIN(?), ", [workingGroup.id]) +
			ballotSetSql(entry);
		const results = (await db.query({
			sql,
			dateStrings: true,
		})) as ResultSetHeader;
		id = results.insertId;
	} catch (err: any) {
		throw err.code == "ER_DUP_ENTRY"
			? new TypeError(
					"An entry already exists with BallotID=" + ballot.BallotID
			  )
			: err;
	}

	return getBallotWithNewResultsSummary(user, id);
}

function validBallot(ballot: any): ballot is Ballot {
	return (
		isPlainObject(ballot) &&
		ballot.Project &&
		typeof ballot.Project === "string"
	);
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
export async function addBallots(
	user: User,
	workingGroup: Group,
	ballots: Ballot[]
) {
	if (!validBallots(ballots))
		throw new TypeError("Bad or missing array of ballot objects");

	return Promise.all(ballots.map((b) => addBallot(user, workingGroup, b)));
}

/**
 * Update ballot
 *
 * @param user The user executing the update.
 * @param workingGroup The working group from path
 * @param update An object with shape {id, changes}
 * @param update.id Identifies the ballot.
 * @param update.changes A partial ballot object that contains parameters to change.
 * @returns The ballot as updated
 */
async function updateBallot(
	user: User,
	workingGroup: Group,
	update: BallotUpdate
) {
	const { id, changes } = update;
	const entry = ballotEntry(changes);
	if (Object.keys(entry).length > 0) {
		const sql =
			"UPDATE ballots SET " +
			ballotSetSql(entry) +
			db.format(" WHERE id=? AND workingGroupId=UUID_TO_BIN(?)", [
				id,
				workingGroup.id,
			]);
		const result = (await db.query({
			sql,
			dateStrings: true,
		})) as ResultSetHeader;
		if (result.affectedRows !== 1)
			throw new Error(`Unexpected: no update for ballot with id=${id}`);
	}

	return getBallotWithNewResultsSummary(user, id);
}

function validUpdate(update: any): update is BallotUpdate {
	return (
		isPlainObject(update) &&
		typeof update.id === "number" &&
		isPlainObject(update.changes)
	);
}

export function validBallotUpdates(updates: any): updates is BallotUpdate[] {
	return Array.isArray(updates) && updates.every(validUpdate);
}

/**
 * Update ballots
 *
 * @param user The user executing the update.
 * @param workingGroup The working group from path
 * @param updates An array of objects with shape {id, changes}
 * @returns An array of ballots as updated
 */
export function updateBallots(
	user: User,
	workingGroup: Group,
	updates: BallotUpdate[]
) {
	return Promise.all(updates.map((u) => updateBallot(user, workingGroup, u)));
}

export function validBallotIds(ids: any): ids is number[] {
	return Array.isArray(ids) && ids.every((id) => typeof id === "number");
}

/**
 * Delete ballots along with associated comments, resolutions and results
 *
 * @param user The user executing the delete.
 * @param workingGroup The working group from path
 * @param ids An array of ballot identifiers that identify the ballots to delete
 */
export async function deleteBallots(
	user: User,
	workingGroup: Group,
	ids: number[]
) {
	// Make sure the ids are owned by the working group
	ids = (
		(await db.query(
			"SELECT id FROM ballots WHERE id IN (?) AND workingGroupId=UUID_TO_BIN(?)",
			[ids, workingGroup.id]
		)) as { id: number }[]
	).map((b) => b.id);

	if (ids.length === 0) return 0;

	const e_ids = db.escape(ids);
	const sql =
		"START TRANSACTION;" +
		`DELETE r FROM comments c JOIN resolutions r ON c.id=r.comment_id WHERE c.ballot_id IN (${e_ids});` +
		`DELETE FROM comments WHERE ballot_id IN (${e_ids});` +
		`DELETE FROM results WHERE ballot_id IN (${e_ids});` +
		`DELETE FROM ballots WHERE id IN (${e_ids});` +
		"COMMIT;";

	await db.query(sql);
	return ids.length;
}
