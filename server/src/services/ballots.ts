import db from "../utils/database";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { DateTime } from "luxon";
import { isPlainObject, NotFoundError } from "../utils";

import { getResults } from "./results";
import { type User } from "./users";
import { getWorkingGroup } from "./groups";
import { Group } from "../schemas/groups";
import {
	Ballot,
	BallotQuery,
	BallotCreate,
	BallotUpdate,
} from "../schemas/ballots";

export const BallotType = {
	CC: 0, // comment collection
	WG: 1, // WG ballot
	SA: 2, // SA ballot
	Motion: 5, // motion
};

/* View ballot series.
 *
 * Suppose you have a ballot series with id in [40, 39, 38].
 * Each ballot points to the prev in the series, with the initial ballot pointing to null.
 * This view will create a table:
 * +-----------+------------+----+---------+--------------+
 * | series_id | initial_id | id | prev_id | other fields |
 * |        40 |         38 | 40 |      39 | ...          |
 * |        40 |         38 | 39 |      38 |
 * |        40 |         38 | 38 |    NULL |
 * |        39 |         38 | 39 |      38 |
 * |        39 |         38 | 38 |    NULL |
 * |        38 |         38 | 38 |    NULL |
 * +-----------+----+---------+------------+---
 * Each unique ballot_id will comprise an exhaustive list of current and previous ballots. */
const createViewBallotSeries = `
	DROP VIEW IF EXISTS ballotSeries;
	CREATE VIEW ballotSeries AS
		WITH RECURSIVE cte AS (
			SELECT b.id as series_id, b.* FROM ballots b
			UNION ALL
			SELECT c.series_id, b.* FROM cte c JOIN ballots b ON c.prev_id=b.id
		)
		SELECT
			c1.*,
			(SELECT c2.id FROM cte c2 WHERE c2.series_id=c1.series_id AND c2.prev_id IS NULL) AS initial_id,
			(SELECT c2.Start FROM cte c2 WHERE c2.series_id=c1.series_id AND c2.prev_id IS NULL) AS initialStart,
			(SELECT JSON_ARRAYAGG(c2.id) FROM cte c2 WHERE c2.series_id=c1.series_id GROUP BY c2.series_id ORDER BY c2.Start) AS ballotIds
		FROM cte c1
`;

export function init() {
	return db.query(createViewBallotSeries);
}

/* Get ballot fields */
const getBallotFieldsSQL = `
	b.id,
	BIN_TO_UUID(b.groupId) as groupId,
	b.Type,
	b.number,
	CONCAT(IF(b.Type=0, "CC", IF(b.Type=1, "LB", IF(b.Type=2, "SA", IF(b.Type=5, "M", "??")))), b.number) as BallotID,  
	b.Project, b.IsRecirc, b.IsComplete,
	DATE_FORMAT(b.Start, "%Y-%m-%dT%TZ") AS Start,
	DATE_FORMAT(b.End, "%Y-%m-%dT%TZ") AS End,
	b.Document, b.Topic, b.prev_id, b.EpollNum,
	BIN_TO_UUID(b.workingGroupId) as workingGroupId,
	b.ResultsSummary AS Results,
	JSON_OBJECT(
		"Count", (SELECT COUNT(*) FROM comments c WHERE b.id=c.ballot_id),
		"CommentIDMin", (SELECT MIN(CommentID) FROM comments c WHERE b.id=c.ballot_id),
		"CommentIDMax", (SELECT MAX(CommentID) FROM comments c WHERE b.id=c.ballot_id)
	) AS Comments,
	(SELECT COUNT(*) FROM wgVoters v WHERE b.id=v.ballot_id) as Voters
`;

/*
 * Get ballots SQL query.
 */
const getBallotsSQL = `
	SELECT
		${getBallotFieldsSQL}
	FROM ballots b`;

/**
 * Get all ballots.
 *
 * @param constraints Constraints on the query
 * @returns An array of ballot objects.
 */
export async function getBallots(constraints?: BallotQuery): Promise<Ballot[]> {
	let sql = getBallotsSQL;

	if (constraints) {
		const wheres: string[] = [];
		Object.entries(constraints).forEach(([key, value]) => {
			wheres.push(
				key === "groupId" || key === "workingGroupId"
					? db.format(
							Array.isArray(value)
								? "BIN_TO_UUID(??) IN (?)"
								: "BIN_TO_UUID(??)=?",
							[key, value]
					  )
					: db.format(Array.isArray(value) ? "?? IN (?)" : "??=?", [
							key,
							value,
					  ])
			);
		});
		if (wheres.length > 0) sql += " WHERE " + wheres.join(" AND ");
	}

	sql += " ORDER BY b.Project, b.Start";

	const ballots = await db.query<(RowDataPacket & Ballot)[]>(sql);
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
	const [ballot] = await db.query<(RowDataPacket & Ballot)[]>(sql);
	if (!ballot) throw new NotFoundError(`No such ballot: ${id}`);
	return ballot;
}

export async function getBallotWithNewResultsSummary(
	user: User,
	workingGroupId: string | null,
	ballot_id: number
) {
	let ballot = await getBallot(ballot_id);
	if (!workingGroupId) {
		const workingGroup = await getWorkingGroup(user, ballot.groupId!);
		if (!workingGroup)
			throw new NotFoundError(
				`Can't find working group for ballot ${ballot.BallotID}`
			);
		workingGroupId = workingGroup.id;
	}
	const { ballots } = await getResults(ballot);
	return ballots[ballots.length - 1];
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
			SELECT b.*
				FROM ballots b WHERE b.id=${db.escape(id)}
			UNION ALL
			SELECT b.*
				FROM ballots b JOIN cte ON b.id=cte.prev_id
		)
		SELECT ${getBallotFieldsSQL} FROM cte b ORDER BY Start;
	`;

	return db.query<(RowDataPacket & Ballot)[]>(sql);
}

type BallotDB = {
	id?: number;
	groupId?: string | null;
	BallotID?: string;
	Project?: string;
	Type?: number;
	number?: number;
	IsRecirc?: boolean;
	IsComplete?: boolean;
	Document?: string;
	Topic?: string;
	Start?: string | null;
	End?: string | null;
	EpollNum?: number | null;
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
async function addBallot(
	user: User,
	workingGroup: Group,
	ballot: BallotCreate
) {
	const entry = ballotEntry(ballot);
	if (!entry.BallotID) {
		if (entry.Type === BallotType.CC) entry.BallotID = "CC";
		else if (entry.Type === BallotType.WG) entry.BallotID = "LB";
		else if (entry.Type === BallotType.SA) entry.BallotID = "SA";
		else entry.BallotID = "M";
		entry.BallotID += entry.number || 0;
	}

	// If the group is not set, set to working group
	if (!entry.groupId) entry.groupId = workingGroup.id;

	let id: number;
	try {
		const sql =
			"INSERT INTO ballots SET " +
			db.format("workingGroupId=UUID_TO_BIN(?), ", [workingGroup.id]) +
			ballotSetSql(entry);
		const results = await db.query<ResultSetHeader>(sql);
		id = results.insertId;
	} catch (err: any) {
		throw err.code == "ER_DUP_ENTRY"
			? new TypeError(
					"An entry already exists with BallotID=" + entry.BallotID
			  )
			: err;
	}

	return getBallotWithNewResultsSummary(user, workingGroup.id, id);
}

/**
 * Add ballots
 *
 * @param user The user executing the add
 * @param ballots An array of ballots to be added
 * @returns An array of ballots as added
 */
export function addBallots(
	user: User,
	workingGroup: Group,
	ballots: BallotCreate[]
) {
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
		const result = await db.query<ResultSetHeader>(sql);
		if (result.affectedRows !== 1)
			throw new Error(`Unexpected: no update for ballot with id=${id}`);
	}

	return getBallotWithNewResultsSummary(user, workingGroup.id, id);
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
		await db.query<(RowDataPacket & { id: number })[]>(
			"SELECT id FROM ballots WHERE id IN (?) AND workingGroupId=UUID_TO_BIN(?)",
			[ids, workingGroup.id]
		)
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
