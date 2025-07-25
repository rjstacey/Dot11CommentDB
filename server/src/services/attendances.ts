import db from "../utils/database.js";
import { NotFoundError } from "../utils/index.js";
import type { Response } from "express";

import { getSessions } from "./sessions.js";
import type { Session } from "@schemas/sessions.js";
import { getGroupHierarchy } from "./groups.js";
import type { Group } from "@schemas/groups.js";
import {
	getImatMeetingAttendanceSummaryForSession,
	getImatMeetingDailyAttendance,
} from "./imat.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { User } from "./users.js";
import type { Member } from "@schemas/members.js";
import { getMembers, getMembersSnapshot } from "./members.js";
import { genAttendanceSpreadsheet } from "./attendancesSpreadsheet.js";
import type {
	SessionAttendanceSummary,
	RecentSessionAttendances,
	SessionAttendanceSummaryCreate,
	SessionAttendanceSummaryUpdate,
	SessionAttendanceSummaryChanges,
	SessionAttendanceSummaryQuery,
} from "@schemas/attendances.js";
import { parseRegistrationSpreadsheet } from "./registrationSpreadsheet.js";

/*type AttendanceSummaryDB = {
	id: number;
	groupId: string;
	SAPIN: number;
	session_id: number;
	AttendancePercentage: number;
	InPerson: boolean;
	DidAttend: boolean;
	DidNotAttend: boolean;
	Notes: string;
};*/

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
					'"InPerson", IF(a.InPerson = 1, CAST(TRUE as json), CAST(FALSE as json)), ' +
					'"DidAttend", IF(a.DidAttend = 1, CAST(TRUE as json), CAST(FALSE as json)), ' +
					'"DidNotAttend", IF(a.DidNotAttend = 1, CAST(TRUE as json), CAST(FALSE as json)), ' +
					'"Notes", a.Notes, ' +
					'"SAPIN", a.SAPIN, ' +
					'"CurrentSAPIN", COALESCE(m.ReplacedBySAPIN, a.SAPIN) ' +
				")) as sessionAttendanceSummaries " +
			"FROM attendanceSummary a " +
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

function getAttendancesSql(query: SessionAttendanceSummaryQuery = {}) {
	// prettier-ignore
	let sql = 
		"SELECT " +
			"a.id, " +
			"a.session_id, " +
			"a.AttendancePercentage, " +
			"a.InPerson, " +
			"a.IsRegistered, " +
			"a.DidAttend, " +
			"a.DidNotAttend, " +
			"a.Notes, " +
			"a.SAPIN, " +
			"COALESCE(m.ReplacedBySAPIN, a.SAPIN) AS CurrentSAPIN " +
		"FROM attendanceSummary a " +
			'LEFT JOIN members m ON m.SAPIN=a.SAPIN AND m.Status="Obsolete" ';

	const wheres = Object.entries(query).map(([key, value]) =>
		key === "groupId"
			? db.format(
					Array.isArray(value)
						? "BIN_TO_UUID(a.??) IN (?)"
						: "a.??=UUID_TO_BIN(?)",
					[key, value]
			  )
			: db.format(Array.isArray(value) ? "a.?? IN (?)" : "a.??=?", [
					key,
					value,
			  ])
	);
	if (wheres.length > 0) sql += " WHERE " + wheres.join(" AND ");

	return sql;
}

/**
 * Get attendances for session
 */
export async function getAttendances(
	query?: SessionAttendanceSummaryQuery
): Promise<SessionAttendanceSummary[]> {
	const sql = getAttendancesSql(query);
	const attendances = await db.query<
		(RowDataPacket & SessionAttendanceSummary)[]
	>(sql);
	return attendances;
}

/**
 * Get recent session attendances
 */
export async function getRecentAttendances(user: User, groupId: string) {
	const groups = await getGroupHierarchy(user, groupId);
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
	const plenaries = allSessions.filter((s) => s.type === "p").slice(-4);

	if (plenaries.length > 0) {
		/* Get attendance summary for recent sessions. Will include four most recent plenaries with attendance and
		 * any interim sessions between the first of the four plenaries and the current date. */
		const fromTimestamp = Date.parse(plenaries[0].startDate);

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
	const [session] = await getSessions({ id: session_id });
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

	await db.query("DELETE FROM attendanceSummary WHERE session_id=?; ", [
		session_id,
	]);
	if (attendances.length) {
		const sql =
			db.format(
				"INSERT INTO attendanceSummary (session_id, groupId, ??) VALUES ",
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

	attendances = await getAttendances({ groupId: group.id, session_id });

	return attendances;
}

export async function uploadRegistration(
	user: User,
	group: Group,
	session_id: number,
	file: { originalname: string; buffer: Buffer }
) {
	const [session] = await getSessions({ id: session_id });
	if (!session)
		throw new NotFoundError(`Session id=${session_id} does not exist`);

	const registrations = await parseRegistrationSpreadsheet(file);

	const queries: string[] = [];
	const e = { InPerson: false, IsRegistered: false };
	const sql = db.format(
		"UPDATE attendanceSummary SET ? WHERE groupId=UUID_TO_BIN(?) AND session_id=?",
		[e, group.id, session_id]
	);
	queries.push(sql);
	for (const r of registrations) {
		if (!r.SAPIN) continue;
		const e = { InPerson: true, IsRegistered: true };
		if (/virtual|remote/i.test(r.RegType)) e.InPerson = false;
		const sql = db.format(
			"UPDATE attendanceSummary SET ? WHERE groupId=UUID_TO_BIN(?) AND session_id=? AND SAPIN=?",
			[e, group.id, session_id, r.SAPIN]
		);
		queries.push(sql);
	}
	await Promise.all(queries.map((sql) => db.query(sql)));

	const attendances = await getAttendances({ groupId: group.id, session_id });

	return { registrations, attendances };
}

export type MemberAttendance = SessionAttendanceSummary & {
	Name: string;
	Affiliation: string;
	Status: string;
};

/**
 * Export attendances for meeting minutes
 */
export async function exportAttendancesForMinutes(
	user: User,
	group: Group,
	session_id: number,
	res: Response
) {
	const [session] = await getSessions({ id: session_id });
	if (!session)
		throw new NotFoundError(`Session id=${session_id} does not exist`);
	const attendances = await getAttendances({ groupId: group.id, session_id });
	if (attendances.length === 0)
		throw new NotFoundError("There is no attendance for this session");

	const memberEntities: Record<number, Member> = {};
	let members = await getMembers({ groupId: group.id });
	members.forEach((m) => (memberEntities[m.SAPIN] = m));
	members = await getMembersSnapshot(group.id, session.startDate);
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
 * Filter the changes object so that it contains only valid fields
 */
function attendanceSummaryChanges(a: SessionAttendanceSummaryChanges) {
	const changes = {
		session_id: a.session_id,
		SAPIN: a.SAPIN,
		AttendancePercentage: a.AttendancePercentage,
		InPerson: a.InPerson,
		IsRegistered: a.IsRegistered,
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
	if (Object.keys(changes).length > 0) {
		const sql = db.format("UPDATE attendanceSummary SET ? WHERE id=?", [
			changes,
			id,
		]);
		await db.query(sql);
	}
	const [attendance] = await getAttendances({ id });
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
	attendanceIn: SessionAttendanceSummaryCreate
) {
	const changes = attendanceSummaryChanges(attendanceIn);

	const { insertId } = await db.query<ResultSetHeader>(
		"INSERT attendanceSummary SET groupId=UUID_TO_BIN(?), ?",
		[groupId, changes]
	);

	const [attendance] = await getAttendances({ id: insertId });
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
	const sql = db.format("DELETE FROM attendanceSummary WHERE ID IN (?)", [
		ids,
	]);
	const { affectedRows } = await db.query<ResultSetHeader>(sql);
	return affectedRows;
}
