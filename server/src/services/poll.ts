import db from "../utils/database";
import {
	Event,
	EventsQuery,
	EventAdd,
	EventUpdate,
	Poll,
	PollsQuery,
	PollCreate,
	PollUpdate,
} from "@schemas/poll";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export async function getPollEvents(query: EventsQuery): Promise<Event[]> {
	// prettier-ignore
	let sql =
		"SELECT " +	
			"id, " +
			"name, " +
			"BIN_TO_UUID(groupId) as groupId, " +
			"timeZone, " +
			'DATE_FORMAT(datetime, "%Y-%m-%dT%TZ") as datetime, ' +
			"isPublished " +
		"FROM pollEvents";

	const wheres = Object.entries(query).map(([key, value]) => {
		let sql: string;
		if (key === "groupId")
			sql = db.format("BIN_TO_UUID(??) IN (?)", [key, value]);
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

export async function getPolls(query: PollsQuery = {}) {
	// prettier-ignore
	let sql =
		"SELECT " +
			"p.id, " +
			"p.eventId, " +
			"BIN_TO_UUID(e.groupId) as groupId, " +
			"p.index, " +
			"p.state, " +
			"p.title, " +
			"p.body, " +
			"p.type, " +
			"p.autoNumber " +
		"FROM polls p LEFT JOIN pollEvents e ON p.eventId=e.id";

	const wheres = Object.entries(query).map(([key, value]) => {
		let sql: string;
		if (key === "groupId")
			sql = db.format("BIN_TO_UUID(??) IN (?)", [key, value]);
		else sql = db.format("p.?? IN (?)", [key, value]);
		return sql;
	});
	if (wheres.length > 0) sql += " WHERE " + wheres.join(" AND ");

	sql += " ORDER BY `index`";

	const polls = await db.query<(RowDataPacket & Poll)[]>(sql);
	return polls;
}

export async function addPoll(poll: PollCreate) {
	const sql = db.format("INSERT INTO polls SET ?", [poll]);
	const { insertId: id } = await db.query<ResultSetHeader>(sql);
	const [pollOut] = await getPolls({ id });
	return pollOut;
}

export async function updatePoll({ id, changes }: PollUpdate) {
	const sql = db.format("UPDATE polls SET ? WHERE id=?", [changes, id]);
	await db.query(sql);
	const [pollOut] = await getPolls({ id });
	return pollOut;
}

export async function deletePoll(id: number) {
	const sql = db.format("DELETE FROM polls WHERE id=?", [id]);
	const { affectedRows } = await db.query<ResultSetHeader>(sql);
	return affectedRows;
}
