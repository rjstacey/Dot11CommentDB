import db from "../utils/database.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { DateTime } from "luxon";
import { isPlainObject, NotFoundError } from "../utils/index.js";

import { getResults } from "./results.js";
import { getWorkingGroup } from "./groups.js";
import type { UserContext } from "./users.js";
import type { Group } from "@schemas/groups.js";
import type {
	Ballot,
	BallotQuery,
	BallotCreate,
	BallotUpdate,
} from "@schemas/ballots.js";
import { BallotType } from "@schemas/ballots.js";

export { BallotType };

/* ballotsSeries view
 *
 * Suppose you have a ballot series with id in [40, 39, 38].
 * Each ballot points to the prev in the series, with the initial ballot pointing to null.
 * This view will create a table:
 * +-----------+------------+----+---------+
 * | series_id | initial_id | id | prev_id |
 * |        40 |         38 | 40 |      39 | -\
 * |        40 |         38 | 39 |      38 |  | series ending with 40
 * |        40 |         38 | 38 |    NULL | -/
 * |        39 |         38 | 39 |      38 | -\
 * |        39 |         38 | 38 |    NULL | -/ series ending with 39
 * |        38 |         38 | 38 |    NULL | series ending with 38
 * +-----------+------------+----+---------+
 * Each unique series_id will comprise a complete list of current and previous ballots in that series, where series_id is the
 * id of the last ballot in the series.
 */
const createViewBallotsSeries = `
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
		FROM cte c1 ORDER BY c1.End;
`;

/* ballotsStage view
 *
 * A table with the same rows and columns as the ballots table but where each
 * row has ballot series information (initial_id, initialStart, ballotIds) for that ballot and its previous ballots,
 * a column, stage, that is 0 for an initial ballot. 1, 2, 3, etc. for a recirc, where the value is the recirc number,
 * and a column BallotID that is a user readable ballot identifier.
 */
/*const createViewBallotsStage2 = `
	DROP VIEW IF EXISTS ballotsStage;
	CREATE VIEW ballotsStage AS
		WITH ballotsSeriesPlusStage AS (
			SELECT
				b.*,
				(SELECT COUNT(*) FROM ballotsSeries s WHERE s.series_id=b.series_id GROUP BY s.series_id) - 1 AS stage
			FROM ballotsSeries b WHERE b.series_id = b.id
		)
		SELECT
			b.*,
			IF(b.Type=0,
				CONCAT("CC", b.number),
				IF(b.Type=1,
					CONCAT("LB", b.number), 
					IF(b.Type=2,
						CONCAT(b.Project, "-", IF(b.stage=0, "I", CONCAT("R", b.stage))),
						b.id
					)
				)
			) as BallotID
		FROM ballotsSeriesPlusStage b;
`;*/

const createViewBallotsStage = `
	DROP VIEW IF EXISTS ballotsStage;
	CREATE VIEW ballotsStage AS
		SELECT
			b.*,
			(SELECT COUNT(*) FROM ballotsSeries s WHERE s.series_id=b.series_id GROUP BY s.series_id) - 1 AS stage
		FROM ballotsSeries b WHERE b.series_id=b.id;
`;

export async function init() {
	let sql =
		'select 1 from information_schema.COLUMNS where table_schema = DATABASE() and TABLE_NAME="ballots" and column_name = "BallotID_";';
	let rows = await db.query<(RowDataPacket & { "1": number })[]>(sql);
	if (rows.length === 1)
		db.query("ALTER table ballots DROP COLUMN BallotID_");
	sql =
		'select 1 from information_schema.COLUMNS where table_schema = DATABASE() and TABLE_NAME="ballots" and column_name = "VotingPoolID";';
	rows = await db.query<(RowDataPacket & { "1": number })[]>(sql);
	if (rows.length === 1)
		db.query("ALTER table ballots DROP COLUMN VotingPoolID");

	await db.query(createViewBallotsSeries);
	await db.query(createViewBallotsStage);
}

/* Get ballot fields */
const ballotsStageFieldsSQL = `
	b.id,
	BIN_TO_UUID(b.groupId) as groupId,
	b.Type,
	b.number,
	b.stage,
	b.prev_id,
	b.Project,
	IF(b.IsComplete = 1, CAST(TRUE as json), CAST(FALSE as json)) as IsComplete,
	DATE_FORMAT(b.Start, "%Y-%m-%dT%TZ") AS Start,
	DATE_FORMAT(b.End, "%Y-%m-%dT%TZ") AS End,
	b.Document, b.Topic, b.EpollNum,
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

/** Derive BallotID from other fields */
export function getBallotId(ballot: Ballot) {
	if (ballot.Type === BallotType.CC) {
		return "CC" + (ballot.number || "(Blank)");
	} else if (ballot.Type === BallotType.WG) {
		return "LB" + (ballot.number || "(Blank)");
	} else if (ballot.Type === BallotType.SA) {
		return (
			ballot.Project +
			"-" +
			(ballot.stage === 0 ? "I" : "R" + ballot.stage)
		);
	}

	return ballot.id.toString();
}

export async function getBallotWithNewResultsSummary(
	user: UserContext,
	workingGroupId: string | null,
	ballot_id: number
): Promise<Ballot> {
	const ballot = await getBallot(ballot_id);
	if (!workingGroupId) {
		const workingGroup = await getWorkingGroup(user, ballot.groupId!);
		if (!workingGroup)
			throw new NotFoundError(
				`Can't find working group for ballot id=${ballot_id}`
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
	Type?: number;
	number?: number;
	IsComplete?: boolean;
	Project?: string;
	Document?: string;
	Topic?: string;
	Start?: string | null;
	End?: string | null;
	EpollNum?: number | null;
	prev_id?: number | null;
};

function ballotEntry(changes: Partial<Ballot>) {
	const entry: BallotDB = {
		groupId: changes.groupId,
		Type: changes.Type,
		number: changes.number,
		IsComplete: changes.IsComplete,
		Project: changes.Project,
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

	for (const key of Object.keys(entry)) {
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
	user: UserContext,
	workingGroup: Group,
	ballot: BallotCreate
) {
	const entry = ballotEntry(ballot);

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
	} catch (error) {
		throw isPlainObject(error) && error.code == "ER_DUP_ENTRY"
			? new TypeError("An entry already exists")
			: error;
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
	user: UserContext,
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
	user: UserContext,
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
	user: UserContext,
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
	user: UserContext,
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
