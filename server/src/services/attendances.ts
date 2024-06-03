import db from "../utils/database";
import { NotFoundError } from "../utils";
import type { Response } from "express";

import { getSessions } from "./sessions";
import type { Session } from "../schemas/sessions";
import { getGroupHierarchy } from "./groups";
import type { Group } from "../schemas/groups";
import {
	getImatMeetingAttendanceSummaryForSession,
	getImatMeetingDailyAttendance,
} from "./imat";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { User } from "./users";
import type { Member } from "../schemas/members";
import { getMembers, getMembersSnapshot } from "./members";
import { AccessLevel } from "../auth/access";
import { genAttendanceSpreadsheet } from "./attendancesSpreadsheet";
import type {
	SessionAttendanceSummary,
	RecentSessionAttendances,
	SessionAttendanceSummaryCreate,
	SessionAttendanceSummaryUpdate,
	SessionAttendanceSummaryChanges,
} from "../schemas/attendances";

function getSessionAttendancesSQL(groupId: string, session_ids: number[]) {
	// prettier-ignore
	const sql =
		"WITH cte AS (" +
			"SELECT " +
				"COALESCE(m.ReplacedBySAPIN, a.SAPIN) as SAPIN, " +
				"JSON_ARRAYAGG(JSON_OBJECT(" +
					'"id", a.id, ' +
					'"session_id", a.session_id, ' +
					'"AttendancePercentage", a.AttendancePercentage, ' +
					'"DidAttend", IF(a.DidAttend = 1, CAST(TRUE as json), CAST(FALSE as json)), ' +
					'"DidNotAttend", IF(a.DidNotAttend = 1, CAST(TRUE as json), CAST(FALSE as json)), ' +
					'"Notes", a.Notes, ' +
					'"SAPIN", a.SAPIN, ' +
					'"CurrentSAPIN", COALESCE(m.ReplacedBySAPIN, a.SAPIN) ' +
				")) as sessionAttendanceSummaries " +
			"FROM attendance_summary a " +
				'LEFT JOIN members m ON m.SAPIN=a.SAPIN AND m.Status="Obsolete" ' +
			db.format("WHERE a.groupId=UUID_TO_BIN(?) AND a.session_id IN (?) ", [groupId, session_ids]) +
			"GROUP BY SAPIN " +
		") " +
		"SELECT m.SAPIN, COALESCE(c.sessionAttendanceSummaries, JSON_ARRAY()) as sessionAttendanceSummaries " +
		"FROM members m " +
		db.format("LEFT JOIN cte c ON m.groupId=UUID_TO_BIN(?) AND c.SAPIN=m.SAPIN ", [groupId]) +
		"WHERE m.Status IN ('Non-Voter', 'Aspirant', 'Potential Voter', 'Voter', 'ExOfficio')";

	return sql;
}

function getAttendancesSql(
	constraints: Partial<{
		id: number;
		groupId: string;
		session_id: number;
	}>
) {
	// prettier-ignore
	let sql = 
		"SELECT " +
			"a.id, " +
			"a.session_id, " +
			"a.AttendancePercentage, " +
			"a.DidAttend, " +
			"a.DidNotAttend, " +
			"a.Notes, " +
			"a.SAPIN, " +
			"COALESCE(m.ReplacedBySAPIN, a.SAPIN) AS CurrentSAPIN " +
		"FROM attendance_summary a " +
			'LEFT JOIN members m ON m.SAPIN=a.SAPIN AND m.Status="Obsolete" ';

	if (constraints) {
		const wheres = Object.entries(constraints).map(([key, value]) =>
			db.format(key === "groupId" ? "a.??=UUID_TO_BIN(?)" : "a.??=?", [
				key,
				value,
			])
		);
		if (wheres.length > 0) sql += " WHERE " + wheres.join(" AND ");
	}

	return sql;
}

/**
 * Get recent session attendances
 */
export async function getRecentAttendances(user: User, groupId: string) {
	let groups = await getGroupHierarchy(user, groupId);
	if (groups.length === 0)
		throw new NotFoundError(
			`getGroupHierarchy() failed for groupId=${groupId}`
		);
	const groupIds = groups.map((group) => group.id);

	let attendances: RecentSessionAttendances[] = [],
		sessions: Session[] = [];

	const now = Date.now();
	const allSessions = (await getSessions({ groupId: groupIds }))
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

		const sql = getSessionAttendancesSQL(
			groupId,
			sessions.map((s) => s.id)
		);
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
			await getImatMeetingAttendanceSummaryForSession(
				user,
				group,
				session
			);
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
				"INSERT INTO attendance_summary (session_id, groupId, ??) VALUES ",
				[Object.keys(attendances[0])]
			) +
			attendances
				.map((a) =>
					db.format("(?, UUID_TO_BIN(?), ?)", [
						session.id,
						group.id,
						Object.values(a),
					])
				)
				.join(", ");
		await db.query(sql);
	}

	return getRecentAttendances(user, group.id);
}

export type MemberAttendance = SessionAttendanceSummary & {
	Name: string;
	Affiliation: string;
	Status: string;
};

/*
 * Export attendances for meeting minutes
 */
export async function exportAttendancesForMinutes(
	user: User,
	group: Group,
	session_id: number,
	res: Response
) {
	const { session, attendances } = await getAttendances(group.id, session_id);

	const memberEntities: Record<number, Member> = {};
	let members = await getMembers(AccessLevel.admin, { groupId: group.id });
	members.forEach((m) => (memberEntities[m.SAPIN] = m));
	members = await getMembersSnapshot(
		AccessLevel.admin,
		group.id,
		session.startDate
	);
	members.forEach((m) => (memberEntities[m.SAPIN] = m));
	const memberAttendances: MemberAttendance[] = attendances.map((a) => {
		const m = memberEntities[a.CurrentSAPIN];
		const entry: MemberAttendance = {
			...a,
			Name: m ? `${m.LastName}, ${m.FirstName}` : `SAPIN=${a.SAPIN}`,
			Affiliation: m?.Affiliation || "",
			Status: m?.Status || "Non-Voter",
		};
		return entry;
	});

	return genAttendanceSpreadsheet(
		user,
		group,
		session,
		memberAttendances,
		res
	);
}

/**
 * Get attendances for session
 * @param session_id Session identifier
 * @returns An object with the session and attendances
 */
export async function getAttendances(
	groupId: string,
	session_id: number
): Promise<{ session: Session; attendances: SessionAttendanceSummary[] }> {
	let [session] = await getSessions({ id: session_id });
	if (!session)
		throw new NotFoundError(`Session id=${session_id} does not exist`);

	const sql = getAttendancesSql({ groupId, session_id });
	const attendances = await db.query<
		(RowDataPacket & SessionAttendanceSummary)[]
	>(sql);

	return {
		session,
		attendances,
	};
}

/**
 * Filter the changes object so that it contains only valid fields
 */
function attendanceSummaryChanges(a: SessionAttendanceSummaryChanges) {
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

async function updateAttendance({
	id,
	changes,
}: SessionAttendanceSummaryUpdate) {
	changes = attendanceSummaryChanges(changes);
	await db.query("UPDATE attendance_summary SET ? WHERE id=?", [changes, id]);
	const [attendance] = (await db.query(
		"SELECT * FROM attendance_summary WHERE id=?",
		[id]
	)) as SessionAttendanceSummary[];
	return attendance;
}

export async function updateAttendances(
	updates: SessionAttendanceSummaryUpdate[]
) {
	const attendances = await Promise.all(updates.map(updateAttendance));
	return attendances;
}

async function addAttendance(
	groupId: string,
	attendance: SessionAttendanceSummaryCreate
) {
	const changes = attendanceSummaryChanges(attendance);

	const { insertId } = await db.query<ResultSetHeader>(
		"INSERT attendance_summary SET group=UUID_TO_BIN(?), ?",
		[groupId, changes]
	);

	[attendance] = (await db.query(
		getAttendancesSql({ id: insertId })
	)) as SessionAttendanceSummary[];
	return attendance;
}

export async function addAttendances(
	groupId: string,
	attendances: SessionAttendanceSummaryCreate[]
) {
	attendances = await Promise.all(
		attendances.map((a) => addAttendance(groupId, a))
	);
	return attendances;
}

export async function deleteAttendances(ids: number[]) {
	const { affectedRows } = await db.query<ResultSetHeader>(
		"DELETE FROM attendance_summary WHERE ID IN (?)",
		[ids]
	);
	return affectedRows;
}
