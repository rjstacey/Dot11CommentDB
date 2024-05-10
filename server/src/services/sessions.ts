/*
 * Manage sessions and session attendance
 */
import { DateTime } from "luxon";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

import db from "../utils/database";

function getSessionsSQL(groupId?: string | string[]) {
	let attendanceSql = "SELECT COUNT(DISTINCT(SAPIN)) FROM attendance_summary WHERE ";
	if (groupId) {
		attendanceSql += Array.isArray(groupId)?
			`BIN_TO_UUID(groupId) IN (${db.escape(groupId)})`:
			`groupId = ${db.escape(groupId)}`;
		attendanceSql += " AND ";
	}
	attendanceSql += "session_id=s.id";

	return `
		SELECT 
			id,
			number,
			name,
			type,
			BIN_TO_UUID(groupId) AS groupId,
			startDate,
			endDate,
			timezone,
			isCancelled,
			imatMeetingId,
			OrganizerID,
			timeslots,
			defaultCredits,
			COALESCE(r.rooms, JSON_ARRAY()) AS rooms,
			(${attendanceSql}) AS attendees
		FROM sessions s
		LEFT JOIN (
				SELECT
					sessionId,
					JSON_ARRAYAGG(JSON_OBJECT("id", id, "name", name, "description", description)) AS rooms
				FROM rooms GROUP BY sessionId
			) AS r ON s.id=r.sessionId
	`;
}

export type Room = {
	id: number;
	name: string;
	description: string;
};

export type Timeslot = {
	id: number;
	name: string;
	startTime: string;
	endTime: string;
};

export type SessionType = "p" | "i" | "o" | "g";

export interface Session {
	id: number;
	number: number | null;
	name: string;
	type: SessionType;
	groupId: string | null;
	isCancelled: boolean;
	imatMeetingId: number | null;
	OrganizerID: string;
	timezone: string;
	startDate: string;
	endDate: string;
	rooms: Room[];
	timeslots: Timeslot[];
	defaultCredits: string[][];
	attendees: number;
}

type SessionDB = Partial<
	Omit<Session, "rooms" | "timeslots" | "defaultCredits" | "attendees">
> & {
	timeslots?: string;
	defaultCredits?: string;
};

interface SessionsQueryConstraints {
	id?: number | number[];
	number?: number | number[];
	name?: string | string[];
	type?: string | string[];
	timezone?: string | string[];
	groupId?: string | string[];
	isCancelled?: boolean | boolean[];
}

export type AttendanceSummary = {
	id: number | null;
	session_id: number;
	SAPIN: number;
	AttendancePercentage: number;
	DidAttend: boolean;
	DidNotAttend: boolean;
	Notes: string;
};

export type Credit = "Normal" | "Extra" | "Zero" | "Other";

export function getCredit(creditStr: string): {credit: Credit, creditOverrideNumerator: number, creditOverrideDenominator: number} {
	let m = /(Normal|Zero|Extra|Other)/.exec(creditStr);
	if (!m)
		throw Error("Invalid credit string " + creditStr);

	let credit = m[1] as Credit,
		creditOverrideNumerator = 0,
		creditOverrideDenominator = 0;

	if (credit === "Other") {
		m = /Other\s*(\d+)\s*\/\s*(\d+)/.exec(creditStr);
		if (!m)
			throw new Error(`Unexpected format for "Other" credit: ${creditStr}`);
		creditOverrideNumerator = Number(m[1]);
		creditOverrideDenominator = Number(m[2]);
	}

	return {
		credit,
		creditOverrideNumerator,
		creditOverrideDenominator
	}
}

/**
 * Get a list of sessions.
 *
 * @param constraints (Optional) An object with constraints for the database query
 *
 * @returns an array of session objects
 */
export function getSessions(constraints?: SessionsQueryConstraints): Promise<Session[]> {
	let sql = getSessionsSQL(constraints?.groupId);

	if (constraints) {
		const wheres: string[] = [];
		Object.entries(constraints).forEach(([key, value]) => {
			wheres.push(
				(key === 'groupId')?
					db.format(Array.isArray(value)? 'BIN_TO_UUID(??) IN (?)': 'BIN_TO_UUID(??)=?', [key, value]):
					db.format(Array.isArray(value)? '?? IN (?)': '??=?', [key, value])
			);
		});
		if (wheres.length > 0)
			sql += ' WHERE ' + wheres.join(' AND ');
	}

	sql += " ORDER BY startDate DESC";

	//console.log(sql)
	return db.query<(RowDataPacket & Session)[]>(sql);
}

/**
 * Get a session
 *
 * @param id Session identifier
 *
 * @returns a session object or undefined
 */
export async function getSession(id: number): Promise<Session | undefined> {
	const sessions = await getSessions({ id });
	return sessions[0];
}

function sessionEntrySetSql(s: Partial<Session>) {
	const entry: SessionDB = {
		name: s.name,
		number: s.number,
		type: s.type,
		groupId: s.groupId,
		imatMeetingId: s.imatMeetingId,
		OrganizerID: s.OrganizerID,
	};

	if (typeof s.timezone !== "undefined") {
		if (!DateTime.local().setZone(s.timezone).isValid)
			throw new TypeError("Invalid parameter timezone: " + s.timezone);
		entry.timezone = s.timezone;
	}

	if (typeof s.startDate !== "undefined") {
		if (!DateTime.fromISO(s.startDate).isValid)
			throw new TypeError("Invlid parameter startDate: " + s.startDate);
		entry.startDate = s.startDate;
	}

	if (typeof s.endDate !== "undefined") {
		if (!DateTime.fromISO(s.endDate).isValid)
			throw new TypeError("Invlid parameter endDate: " + s.endDate);
		entry.endDate = s.endDate;
	}

	if (typeof s.timeslots !== "undefined") {
		if (!Array.isArray(s.timeslots))
			throw new TypeError("Invlid parameter timeslots: " + s.timeslots);
		entry.timeslots = JSON.stringify(s.timeslots);
	}

	if (typeof s.defaultCredits !== "undefined") {
		if (!Array.isArray(s.defaultCredits))
			throw new TypeError(
				"Invlid parameter defaultCredits: " + s.defaultCredits
			);
		entry.defaultCredits = JSON.stringify(s.defaultCredits);
	}

	if (typeof s.rooms !== "undefined") {
		if (!Array.isArray(s.rooms))
			throw new TypeError("Invlid parameter rooms: " + s.rooms);
	}

	for (const key of Object.keys(entry)) {
		if (entry[key] === undefined) delete entry[key];
	}

	const sets: string[] = [];
	for (const [key, value] of Object.entries(entry)) {
		const sql =
			(key === "groupId")?
				db.format("??=UUID_TO_BIN(?)", [key, value]):
				db.format("??=?", [key, value]);
		sets.push(sql);
	}

	return sets.join(", ");
}

function replaceSessionRooms(sessionId: number, rooms: Room[]) {
	let sql = db.format("DELETE FROM rooms WHERE sessionId=?;", [sessionId]);
	if (rooms.length > 0)
		sql += rooms
			.map((room) =>
				db.format("INSERT INTO rooms SET ?;", [{ sessionId, ...room }])
			)
			.join("");
	//console.log(sql)
	return db.query(sql);
}

export async function addSession(session: Session) {
	const sql = "INSERT INTO sessions SET " + sessionEntrySetSql(session);
	const { insertId } = await db.query<ResultSetHeader>(sql);
	if (session.rooms) await replaceSessionRooms(insertId, session.rooms);
	const [insertedSession] = await getSessions({ id: insertId });
	return insertedSession;
}

export async function updateSession(id: number, changes: Partial<Session>) {
	const setSql = sessionEntrySetSql(changes);
	if (setSql) {
		const sql =
			"UPDATE sessions SET " + setSql +
			" WHERE id=" + db.escape(id);
		await db.query(sql);
	}

	if (changes.rooms) await replaceSessionRooms(id, changes.rooms);

	const sessions = await getSessions({ id });
	return sessions[0];
}

export async function deleteSessions(ids: number[]) {
	const sql =
		db.format("DELETE FROM sessions WHERE id IN (?);", [ids]) +
		db.format("DELETE FROM rooms WHERE sessionId IN (?);", [ids]) +
		db.format("DELETE FROM attendance_summary WHERE session_id IN (?);", [ids]);
	const results = await db.query<ResultSetHeader[]>(sql);
	return results[0].affectedRows;
}
