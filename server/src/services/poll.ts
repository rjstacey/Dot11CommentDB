import db from "../utils/database.js";
import {
	Event,
	EventsQuery,
	EventAdd,
	EventUpdate,
	Poll,
	PollsQuery,
	PollCreate,
	PollChange,
	PollUpdate,
	PollResult,
	PollChoice,
	PollVotersType,
} from "@schemas/poll.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Member } from "@schemas/members.js";

export async function init() {
	let sql =
		'select 1 from information_schema.COLUMNS where table_schema = DATABASE() and TABLE_NAME="polls" and column_name = "recordType";';
	let rows = await db.query<(RowDataPacket & { "1": number })[]>(sql);
	if (rows.length === 0)
		db.query(
			"ALTER TABLE polls ADD COLUMN recordType TINYINT default 0 after type;"
		);
	sql =
		'select 1 from information_schema.COLUMNS where table_schema = DATABASE() and TABLE_NAME="polls" and column_name = "votersType";';
	rows = await db.query<(RowDataPacket & { "1": number })[]>(sql);
	if (rows.length === 0)
		db.query(
			"ALTER TABLE polls ADD COLUMN votersType TINYINT default 0 after recordType;"
		);
	sql =
		'select 1 from information_schema.COLUMNS where table_schema = DATABASE() and TABLE_NAME="polls" and column_name = "isComplete";';
	rows = await db.query<(RowDataPacket & { "1": number })[]>(sql);
	if (rows.length === 0)
		db.query(
			"ALTER TABLE polls ADD COLUMN isComplete TINYINT(1) default 0;"
		);
}

export async function getPollEvents(query: EventsQuery): Promise<Event[]> {
	// prettier-ignore
	let sql =
		"SELECT " +	
			"id, " +
			"name, " +
			"BIN_TO_UUID(groupId) as groupId, " +
			"timeZone, " +
			'DATE_FORMAT(datetime, "%Y-%m-%dT%TZ") as datetime, ' +
			"isPublished, " +
			"autoNumber " +
		"FROM pollEvents";

	const wheres = Object.entries(query).map(([key, value]) => {
		let sql: string;
		if (key === "groupId")
			sql = db.format("BIN_TO_UUID(??) IN (?)", [key, value]);
		else if (key === "isPublished")
			sql = db.format("?? = ?", [key, value ? 1 : 0]);
		else sql = db.format("?? IN (?)", [key, value]);
		return sql;
	});
	if (wheres.length > 0) sql += " WHERE " + wheres.join(" AND ");

	const events = await db.query<(RowDataPacket & Event)[]>(sql);
	return events;
}

export async function addPollEvent(event: EventAdd) {
	const { groupId, ...rest } = event;
	const sql = db.format(
		"INSERT INTO pollEvents SET groupId=UUID_TO_BIN(?), ?",
		[groupId, rest]
	);
	const { insertId: id } = await db.query<ResultSetHeader>(sql);
	const [eventOut] = await getPollEvents({ id });
	return eventOut;
}

export async function updatePollEvent({ id, changes }: EventUpdate) {
	const sql = db.format("UPDATE pollEvents SET ? WHERE id=?", [changes, id]);
	await db.query(sql);
	const [eventOut] = await getPollEvents({ id });
	return eventOut;
}

export async function deletePollEvent(id: number) {
	const sql = db.format("DELETE FROM pollEvents WHERE id=?", [id]);
	const { affectedRows } = await db.query<ResultSetHeader>(sql);
	return affectedRows;
}

function pollQuerySql(query: PollsQuery) {
	let sql = "";
	const wheres = Object.entries(query).map(([key, value]) => {
		let sql: string;
		if (key === "groupId")
			sql = db.format("BIN_TO_UUID(??) IN (?)", [key, value]);
		else sql = db.format("p.?? IN (?)", [key, value]);
		return sql;
	});
	if (wheres.length > 0) sql += " WHERE " + wheres.join(" AND ");
	return sql;
}

export async function getPolls(query: PollsQuery = {}): Promise<Poll[]> {
	// prettier-ignore
	let sql =
		"SELECT " +
			"p.id, " +
			"p.eventId, " +
			"BIN_TO_UUID(e.groupId) as groupId, " +
			"p.index, " +
			"p.state, " +
			"p.type, " +
			"p.recordType, " +
			"p.votersType, " +
			"p.title, " +
			"p.body, " +
			"p.options, " +
			"p.choice, " +
			"p.movedSAPIN, " + 
			"p.secondedSAPIN, " +
			"p.resultsSummary " +
		"FROM polls p LEFT JOIN pollEvents e ON p.eventId=e.id";

	sql += pollQuerySql(query) + " ORDER BY `index`";

	const polls = await db.query<(RowDataPacket & Poll)[]>(sql);
	return polls;
}

function pollSetSql(poll: Partial<Poll>) {
	const s: string[] = [];
	for (const key of Object.keys(poll)) {
		if (key === "options")
			s.push(db.format("options=?", [JSON.stringify(poll.options)]));
		else if (key === "resultsSummary")
			s.push(
				db.format("resultsSummary=?", [
					JSON.stringify(poll.resultsSummary),
				])
			);
		else s.push(db.format("??=?", [key, poll[key]]));
	}
	return s.join(", ");
}

export async function addPoll(poll: PollCreate) {
	const sql = "INSERT INTO polls SET " + pollSetSql(poll);
	const { insertId: id } = await db.query<ResultSetHeader>(sql);
	const [pollOut] = await getPolls({ id });
	return pollOut;
}

export async function updatePoll({ id, changes }: PollUpdate) {
	const sets = pollSetSql(changes);
	if (sets) {
		const sql = "UPDATE polls SET " + sets + " WHERE id=" + db.escape(id);
		await db.query(sql);
	}
	const [pollOut] = await getPolls({ id });
	return pollOut;
}

export async function updatePollQuery(query: PollsQuery, changes: PollChange) {
	const sets = pollSetSql(changes);
	if (sets) {
		const sql = "UPDATE polls SET " + sets + pollQuerySql(query);
		const result = await db.query<ResultSetHeader>(sql);
		return result.affectedRows;
	}
	return 0;
}

export async function deletePoll(id: number) {
	const sql = db.format("DELETE FROM polls WHERE id=?", [id]);
	const { affectedRows } = await db.query<ResultSetHeader>(sql);
	return affectedRows;
}

/** Record a users vote
 * @param user - The user for which the vote is recorded.
 * @param poll - The poll being voted on.
 * @param votes - An array of option indices.
 * For PollChoice.SINGLE, the array has one entry, which is the index of the option selected.
 * For PollChoice.MULTIPLE, then arrays has one or more entries, each being the index of an option selected.
 */
export async function pollVote(member: Member, poll: Poll, votes: number[]) {
	if (poll.state !== "opened") throw new TypeError("Poll not open");
	// Strip out duplicates
	votes = [...new Set(votes)];

	if (poll.choice === PollChoice.SINGLE && votes.length !== 1)
		throw new TypeError("Bad vote: choose a single option");
	if (!votes.every((i) => i >= 0 && i < poll.options.length))
		throw new TypeError("Bad vote: invalid option selected");
	if (
		poll.votersType === PollVotersType.VOTER &&
		["Voter", "ExOfficio"].includes(member.Status) === false
	) {
		throw new TypeError("Member not authorized to vote");
	}
	if (
		poll.votersType === PollVotersType.VOTER_POTENTIAL_VOTER &&
		["Voter", "Potential Voter", "ExOfficio"].includes(member.Status) ===
			false
	) {
		throw new TypeError("Member not authorized to vote");
	}

	const sql = db.format(
		"REPLACE INTO pollVotes (pollId, SAPIN, votes) VALUES (?, ?, ?)",
		[poll.id, member.SAPIN, JSON.stringify(votes)]
	);
	await db.query(sql);
}

export async function pollClearVotes(poll: Poll) {
	const sql = db.format("DELETE FROM pollVotes WHERE pollId=?", [poll.id]);
	const { affectedRows } = await db.query<ResultSetHeader>(sql);
	return affectedRows;
}

export async function pollVoteCount(poll: Poll) {
	const sql = db.format(
		"SELECT COUNT(*) as count FROM pollVotes WHERE pollId=?",
		[poll.id]
	);
	const [row] = await db.query<(RowDataPacket & { count: number })[]>(sql);
	return row.count;
}

export async function pollResults(poll: Poll) {
	if (poll.state !== "opened" && poll.state !== "closed")
		throw new TypeError("Poll in bad state");

	const sql = db.format(
		"SELECT pollId, SAPIN, votes FROM pollVotes WHERE pollId=?",
		[poll.id]
	);
	const results = await db.query<(RowDataPacket & PollResult)[]>(sql);
	const resultsSummary: number[] = new Array(poll.options.length).fill(0);
	for (const r of results) {
		for (const i of r.votes) {
			if (i >= 0 && i <= poll.options.length) resultsSummary[i]++;
		}
	}
	return { results, resultsSummary };
}
