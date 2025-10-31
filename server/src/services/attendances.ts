import db from "../utils/database.js";
import { NotFoundError } from "../utils/index.js";
import type { Response } from "express";

import { getSessions } from "./sessions.js";
import type { Group } from "@schemas/groups.js";
import {
	getImatMeetingAttendanceSummaryForSession,
	getImatMeetingDailyAttendance,
} from "./imat.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { UserContext } from "./users.js";
import type { Member } from "@schemas/members.js";
import { getMembers, getMembersSnapshot } from "./members.js";
import { genAttendanceSpreadsheet } from "./attendancesSpreadsheet.js";
import type {
	SessionAttendanceSummary,
	SessionAttendanceSummaryCreate,
	SessionAttendanceSummaryUpdate,
	SessionAttendanceSummaryChanges,
	SessionAttendanceSummaryQuery,
} from "@schemas/attendances.js";
import { parseRegistrationSpreadsheet } from "./registrationSpreadsheet.js";
import { ImatAttendanceSummary } from "@schemas/imat.js";

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
 * Get attendances
 */
export async function getAttendances(
	query?: SessionAttendanceSummaryQuery
): Promise<SessionAttendanceSummary[]> {
	const sql = getAttendancesSql(query);
	const attendances =
		await db.query<(RowDataPacket & SessionAttendanceSummary)[]>(sql);
	return attendances;
}

/**
 * Import (from IMAT) the attendances for a session
 */
export async function importAttendances(
	user: UserContext,
	group: Group,
	session_id: number,
	useDaily: boolean
) {
	const [session] = await getSessions({ id: session_id });
	if (!session)
		throw new NotFoundError(`Session id=${session_id} does not exist`);

	let attendances: { SAPIN: number; AttendancePercentage: number | null }[];
	let imatAttendances: ImatAttendanceSummary[];
	if (useDaily) {
		const imatMeetingId = session.imatMeetingId;
		if (!imatMeetingId)
			throw new TypeError(
				"IMAT meeting number not specified for session " + session.name
			);
		imatAttendances = await getImatMeetingDailyAttendance(
			user,
			group,
			imatMeetingId
		);
	} else {
		imatAttendances = await getImatMeetingAttendanceSummaryForSession(
			user,
			group,
			session
		);
	}
	attendances = imatAttendances.map((a) => ({
		SAPIN: a.SAPIN,
		AttendancePercentage: a.AttendancePercentage,
	}));

	// Clear AttendancePercentage for current entries
	let sql = db.format(
		"UPDATE attendanceSummary SET AttendancePercentage=0 WHERE groupId=UUID_TO_BIN(?) AND session_id=?",
		[group.id, session.id]
	);
	await db.query(sql);

	if (attendances.length) {
		sql =
			db.format(
				"INSERT INTO attendanceSummary (groupId, session_id, SAPIN, AttendancePercentage) VALUES "
			) +
			attendances
				.map((a) =>
					db.format("(UUID_TO_BIN(?), ?, ?, ?)", [
						group.id,
						session.id,
						a.SAPIN,
						a.AttendancePercentage,
					])
				)
				.join(", ") +
			"ON DUPLICATE KEY UPDATE AttendancePercentage=VALUES(AttendancePercentage)";
		await db.query(sql);
	}

	attendances = await getAttendances({ groupId: group.id, session_id });

	return attendances;
}

export async function uploadRegistration(
	user: UserContext,
	group: Group,
	session_id: number,
	filename: string,
	buffer: Buffer
) {
	const [session] = await getSessions({ id: session_id });
	if (!session)
		throw new NotFoundError(`Session id=${session_id} does not exist`);

	const registrations = await parseRegistrationSpreadsheet(filename, buffer);

	const queries: string[] = [];

	// Clear InPerson and IsRegistered for current entries
	let sql = db.format(
		"UPDATE attendanceSummary SET InPerson=0, IsRegistered=0 WHERE groupId=UUID_TO_BIN(?) AND session_id=?",
		[group.id, session_id]
	);
	queries.push(sql);

	if (registrations.length > 0) {
		sql =
			db.format(
				"INSERT INTO attendanceSummary (groupId, session_id, SAPIN, InPerson, IsRegistered) VALUES "
			) +
			registrations
				.filter((r) => Boolean(r.SAPIN))
				.map((r) =>
					db.format("(UUID_TO_BIN(?), ?, ?, ?, ?)", [
						group.id,
						session_id,
						r.SAPIN,
						/virtual|remote/i.test(r.RegType) ? 0 : 1,
						1,
					])
				)
				.join(", ") +
			"ON DUPLICATE KEY UPDATE InPerson=VALUES(InPerson), IsRegistered=VALUES(IsRegistered)";
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
	user: UserContext,
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

async function updateAttendance(
	groupId: string,
	{ id, changes }: SessionAttendanceSummaryUpdate
) {
	changes = attendanceSummaryChanges(changes);
	if (Object.keys(changes).length > 0) {
		const sql = db.format(
			"UPDATE attendanceSummary SET ? WHERE id=? AND groupId=UUID_TO_BIN(?)",
			[changes, id, groupId]
		);
		await db.query(sql);
	}
	const [attendance] = await getAttendances({ id });
	return attendance;
}

export async function updateAttendances(
	groupId: string,
	updates: SessionAttendanceSummaryUpdate[]
) {
	const attendances = await Promise.all(
		updates.map((update) => updateAttendance(groupId, update))
	);
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

export async function deleteAttendances(groupId: string, ids: number[]) {
	const sql = db.format(
		"DELETE FROM attendanceSummary WHERE groupId=UUID_TO_BIN(?) AND ID IN (?)",
		[groupId, ids]
	);
	const { affectedRows } = await db.query<ResultSetHeader>(sql);
	return affectedRows;
}

export async function deleteAllSessionAttendances(
	groupId: string,
	sessionId: number
) {
	const sql = db.format(
		"DELETE FROM attendanceSummary WHERE groupId=UUID_TO_BIN(?) AND session_id=?",
		[groupId, sessionId]
	);
	const { affectedRows } = await db.query<ResultSetHeader>(sql);
	return affectedRows;
}
