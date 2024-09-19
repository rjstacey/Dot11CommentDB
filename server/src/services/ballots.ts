import db from "../utils/database";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { DateTime } from "luxon";
import { NotFoundError } from "../utils";

import { getResults } from "./results";
import { getWorkingGroup } from "./groups";
import type { User } from "./users";
import type { Group } from "../schemas/groups";
import type {
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

/* ballotsSeries view
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
 * Each unique series_id will comprise a complete list of current and previous ballots in that series, where series_id is the
 * id of the last ballot in the series.
 */
const createViewBallotsSeries = `
	DROP VIEW IF EXISTS ballotSeries;
	DROP VIEW IF EXISTS ballotsSeries;
	CREATE VIEW ballotsSeries AS
		WITH RECURSIVE cte AS (
			SELECT b.id as series_id, b.* FROM ballots b
			UNION ALL
			SELECT c.series_id, b.* FROM cte c JOIN ballots b ON c.prev_id=b.id
		)
		SELECT
			c1.*,
			(SELECT c2.id FROM cte c2 WHERE c2.series_id=c1.series_id AND c2.prev_id IS NULL) AS initial_id,
			(SELECT c2.Start FROM cte c2 WHERE c2.series_id=c1.series_id AND c2.prev_id IS NULL) AS series_start,
			(SELECT JSON_ARRAYAGG(c2.id) FROM cte c2 WHERE c2.series_id=c1.series_id GROUP BY c2.series_id ORDER BY c2.Start) AS ballotIds
		FROM cte c1
`;

/* ballotsStage view
 *
 * A table with the same rows and columns as the ballots table but where each
 * row has ballot series information (initial_id, initialStart, ballotIds) for that ballot and its previous ballots
 * as well as a column, stage, that is 0 for an initial ballot. 1, 2, 3, etc. for a recirc, where the value is the recirc number.
 */
const createViewBallotsStage = `
	DROP VIEW IF EXISTS ballotsStage;
	CREATE VIEW ballotsStage AS
		SELECT
			b.*,
			(SELECT COUNT(*) FROM ballotsSeries s WHERE s.series_id=b.series_id GROUP BY s.series_id) - 1 AS stage
		FROM ballotsSeries b WHERE b.series_id = b.id;
`;

export async function init() {
	await db.query(createViewBallotsSeries);
	await db.query(createViewBallotsStage);
}

/* Get ballot fields */
const ballotsStageFieldsSQL = `
	b.id,
	BIN_TO_UUID(b.groupId) as groupId,
	b.Type,
	b.number,
	CONCAT(IF(b.Type=0, "CC", IF(b.Type=1, "LB", IF(b.Type=2, "SA", IF(b.Type=5, "M", "??")))), b.number) as BallotID,
	b.stage,
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
	(SELECT COUNT(*) FROM wgVoters v WHERE b.initial_id=v.ballot_id) as Voters
`;

/**
 * Get all ballots.
 *
 * @param query Query constraints
 * @returns An array of ballot objects.
 */
export async function getBallots(query?: BallotQuery): Promise<Ballot[]> {
	let sql = "SELECT " + ballotsStageFieldsSQL + "FROM ballotsStage b";

	if (query) {
		const wheres: string[] = [];
		Object.entries(query).forEach(([key, value]) => {
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
	const [ballot] = await getBallots({ id });
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
	await getResults(ballot);
	return await getBallot(ballot_id);
}

/**
 * Get ballot series
 * Walk back through the previous ballots until the initial ballot
 * @param id last ballot in series
 * @returns an array of ballots (starting with the initial ballot) that is the ballot series
 */
export function getBallotSeries(id: number): Promise<Ballot[]> {
	// prettier-ignore
	const sql =
		"SELECT " +
			ballotsStageFieldsSQL +
		"FROM ballotsSeries s " +
		"JOIN ballotsStage b ON s.id=b.id " +
		"WHERE s.series_id=" + db.escape(id);

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

function ballotEntry(changes: Partial<Ballot>) {
	var entry: BallotDB = {
		groupId: changes.groupId,
		number: changes.number,
		BallotID: changes.BallotID,
		Project: changes.Project,
		Type: changes.Type,
		IsRecirc: changes.IsRecirc,
		IsComplete: changes.IsComplete,
		Document: changes.Document,
		Topic: changes.Topic,
		EpollNum: changes.EpollNum,
		prev_id: changes.prev_id,
	};

	if (typeof changes.Start !== "undefined") {
		if (changes.Start) {
			const start = DateTime.fromISO(changes.Start);
			if (!start.isValid)
				throw new TypeError("Invlid parameter start: " + changes.Start);
			entry.Start = start.toUTC().toFormat("yyyy-MM-dd HH:mm:ss");
		} else {
			entry.Start = null;
		}
	}

	if (typeof changes.End !== "undefined") {
		if (changes.End) {
			const end = DateTime.fromISO(changes.End);
			if (!end.isValid)
				throw new TypeError("Invlid parameter start: " + changes.End);
			entry.End = end.toUTC().toFormat("yyyy-MM-dd HH:mm:ss");
		} else {
			entry.End = null;
		}
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
	console.log(changes, entry);
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
