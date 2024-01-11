import db from "../utils/database";
import { NotFoundError } from "../utils";

import { getSessions, Session } from "./sessions";
import type { Group } from "./groups";
import {
	getImatMeetingAttendanceSummaryForSession,
	getImatMeetingDailyAttendance,
} from "./imat";
import { isPlainObject } from "../utils";
import type { ResultSetHeader } from "mysql2";
import type { User } from "./users";

type SessionAttendanceSummary = {
	id: number;
	/** Session identifier */
	session_id: number;
	/** Percentage of meeting slots attended */
	AttendancePercentage: number;
	/** Declare attendance criteria met */
	DidAttend: boolean;
	/** Declare attendance criteria not met */
	DidNotAttend: boolean;
	/** SA PIN under which attendance was logged */
	SAPIN: number;
	Notes: string;
};

type RecentSessionAttendances = {
	SAPIN: number;
	sessionAttendanceSummaries: SessionAttendanceSummary[];
};

const getSessionAttendancesSQL = (session_ids: number[]) =>
	db.format(
		"SELECT " +
			"COALESCE(m.ReplacedBySAPIN, a.SAPIN) as SAPIN, " +
			"JSON_ARRAYAGG(JSON_OBJECT(" +
                '"id", a.id, ' +
                '"session_id", a.session_id, ' +
                '"AttendancePercentage", a.AttendancePercentage, ' +
                '"DidAttend", a.DidAttend, ' +
                '"DidNotAttend", a.DidNotAttend, ' +
                '"Notes", a.Notes, ' +
				'"SAPIN", a.SAPIN ' +
			")) as sessionAttendanceSummaries " +
		"FROM attendance_summary a " +
			'LEFT JOIN members m ON m.SAPIN=a.SAPIN AND m.Status="Obsolete" ' +
		"WHERE a.session_id IN (?) " +
		"GROUP BY SAPIN ",
		[session_ids]
	);

/**
 * Get recent session attendances
 */
export async function getRecentAttendances() {
	let attendances: RecentSessionAttendances[] = [],
		sessions: Session[] = [];

	const now = Date.now();
	const allSessions = (await getSessions())
		.filter((s) => Date.parse(s.endDate) < now && !s.isCancelled)
		.sort((s1, s2) => Date.parse(s1.startDate) - Date.parse(s2.startDate)); // Oldest to newest

	// Plenary sessions only, newest 4 with attendance
	let plenaries = allSessions.filter((s) => s.type === "p").slice(-4);

	if (plenaries.length > 0) {
		/* Get attendance summary for recent sessions. Will include four most recent plenaries with attendance and
		 * any interim sessions between the first of the four plenaries and the current date. */
		let fromTimestamp = Date.parse(plenaries[0].startDate);

		sessions = allSessions.filter(
			(s) =>
				(s.type === "i" || s.type === "p") &&
				Date.parse(s.startDate) >= fromTimestamp
		);

		const sql = getSessionAttendancesSQL(sessions.map((s) => s.id));
		//console.log(sql)
		attendances = (await db.query(sql)) as RecentSessionAttendances[];
	}

	return {
		sessions,
		attendances,
	};
}

/**
 * Import (from IMAT) the attendances for a session
 */
export async function importAttendances(
	user: User,
	group: Group,
	session_id: number,
	useDailyAttendance: boolean
) {
	let [session] = await getSessions({ id: session_id });
	if (!session)
		throw new NotFoundError(`Session id=${session_id} does not exist`);

	let attendances: { SAPIN: number; AttendancePercentage: number }[];
	if (useDailyAttendance) {
		if (!session.imatMeetingId)
			throw new TypeError(
				"IMAT meeting number not specified for session " + session.name
			);
		const imatDailyAttendance = await getImatMeetingDailyAttendance(
			user,
			group,
			session.imatMeetingId
		);
		attendances = imatDailyAttendance.map((a) => ({
			SAPIN: a.SAPIN,
			AttendancePercentage: a.AttendancePercentage,
		}));
	} else {
		const imatAttendanceSummary =
			await getImatMeetingAttendanceSummaryForSession(user, session);
		attendances = imatAttendanceSummary.map((a) => ({
			SAPIN: a.SAPIN,
			AttendancePercentage: a.AttendancePercentage,
		}));
	}

	await db.query("DELETE FROM attendance_summary WHERE session_id=?; ", [
		session_id,
	]);
	if (attendances.length) {
		let sql =
			db.format(
				"INSERT INTO attendance_summary (session_id, ??) VALUES ",
				[Object.keys(attendances[0])]
			) +
			attendances
				.map((a) => db.format("(?, ?)", [session.id, Object.values(a)]))
				.join(", ");
		await db.query(sql);
	}

	return getRecentAttendances();
}


/**
 * Get attendances for session
 * @param session_id Session identifier
 * @returns An object with the session and attendances
 */
export async function getAttendances(session_id: number) {
	let [session] = await getSessions({ id: session_id });
	if (!session)
		throw new NotFoundError(`Session id=${session_id} does not exist`);

	const sql = db.format(
		"SELECT " +
			"id, " +
			"SAPIN, " +
			"session_id, " +
			"AttendancePercentage, " +
			"DidAttend, " +
			"DidNotAttend, " +
			"Notes " +
		"FROM attendance_summary " +
		"WHERE session_id=? ",
		[session_id]
	);

	const attendances = (await db.query(sql)) as SessionAttendanceSummary[];

	return {
		session,
		attendances,
	};
}

/**
 * Filter the changes object so that it contains only valid fields
 */
function attendanceSummaryChanges(a: Partial<SessionAttendanceSummary>) {
	const changes = {
		session_id: a.session_id,
		SAPIN: a.SAPIN,
		AttendancePercentage: a.AttendancePercentage,
		DidAttend: a.DidAttend,
		DidNotAttend: a.DidNotAttend,
		Notes: a.Notes,
	};

	for (const key of Object.keys(changes)) {
		if (changes[key] === undefined) delete changes[key];
	}

	return changes;
}

type Update<T> = {
	id: number;
	changes: Partial<T>;
};

function validAttendanceUpdate(
	update: any
): update is Update<SessionAttendanceSummary> {
	if (!isPlainObject(update)) return false;
	const { id, changes } = update;
	if (typeof id !== "number" || !isPlainObject(changes)) return false;
	if (
		typeof changes.session_id !== "undefined" &&
		typeof changes.session_id !== "number"
	)
		return false;
	if (
		typeof changes.SAPIN !== "undefined" &&
		typeof changes.SAPIN !== "number"
	)
		return false;
	if (
		typeof changes.Notes !== "undefined" &&
		typeof changes.Notes !== "string"
	)
		return false;
	if (
		typeof changes.DidAttend !== "undefined" &&
		typeof changes.DidAttend !== "boolean"
	)
		return false;
	if (
		typeof changes.DidNotAttend !== "undefined" &&
		typeof changes.DidNotAttend !== "boolean"
	)
		return false;
	if (
		typeof changes.AttendancePercentage !== "undefined" &&
		typeof changes.AttendancePercentage !== "boolean"
	)
		return false;
	return true;
}

async function updateAttendance({
	id,
	changes,
}: Update<SessionAttendanceSummary>) {
	changes = attendanceSummaryChanges(changes);
	await db.query("UPDATE attendance_summary SET ? WHERE id=?", [changes, id]);
	const [attendance] = (await db.query(
		"SELECT * FROM attendance_summary WHERE id=?",
		[id]
	)) as SessionAttendanceSummary[];
	return attendance;
}

export function validAttendanceUpdates(
	updates: any
): updates is Update<SessionAttendanceSummary>[] {
	return Array.isArray(updates) && updates.every(validAttendanceUpdate);
}

export async function updateAttendances(
	updates: Update<SessionAttendanceSummary>[]
) {
	const attendances = await Promise.all(updates.map(updateAttendance));
	return attendances;
}

function validAttendance(
	attendance: any
): attendance is SessionAttendanceSummary {
	if (!isPlainObject(attendance)) return false;
	if (typeof attendance.session_id !== "number") return false;
	if (typeof attendance.SAPIN !== "number") return false;
	if (
		typeof attendance.Notes !== "undefined" ||
		typeof attendance.Notes !== "string"
	)
		return false;
	if (
		typeof attendance.DidAttend !== "undefined" ||
		typeof attendance.DidAttend !== "boolean"
	)
		return false;
	if (
		typeof attendance.DidNotAttend !== "undefined" ||
		typeof attendance.DidNotAttend !== "boolean"
	)
		return false;
	if (
		typeof attendance.AttendancePercentage !== "undefined" ||
		typeof attendance.AttendancePercentage !== "number"
	)
		return false;
	return true;
}

async function addAttendance(attendance: SessionAttendanceSummary) {
	const changes = attendanceSummaryChanges(attendance);

	const { insertId } = (await db.query("INSERT attendance_summary SET ?", [
		changes,
	])) as ResultSetHeader;
	[attendance] = (await db.query(
		"SELECT * FROM attendance_summary WHERE id=?",
		[insertId]
	)) as SessionAttendanceSummary[];
	return attendance;
}

export function validAttendances(
	attendances: any
): attendances is SessionAttendanceSummary[] {
	return Array.isArray(attendances) && attendances.every(validAttendance);
}

export async function addAttendances(attendances: SessionAttendanceSummary[]) {
	attendances = await Promise.all(attendances.map(addAttendance));
	return attendances;
}

export function validAttendanceIds(ids: any): ids is number[] {
	return Array.isArray(ids) && ids.every((id) => typeof id === "number");
}

export async function deleteAttendances(ids: number[]) {
	const { affectedRows } = (await db.query(
		"DELETE FROM attendance_summary WHERE ID IN (?)",
		[ids]
	)) as ResultSetHeader;
	return affectedRows;
}
