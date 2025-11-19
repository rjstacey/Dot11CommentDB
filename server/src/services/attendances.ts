import db from "../utils/database.js";
import type { Response } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { NotFoundError, csvStringify } from "../utils/index.js";

import { getSessions } from "./sessions.js";
import type { Group } from "@schemas/groups.js";
import {
	getImatMeetingAttendanceSummaryForSession,
	getImatMeetingDailyAttendance,
} from "./imat.js";
import type { UserContext } from "./users.js";
import type { Member, MemberStatus } from "@schemas/members.js";
import { getMembers, getMembersSnapshot, getUsers } from "./members.js";
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
import { SessionRegistration } from "@schemas/registration.js";

const createViewMemberAttendanceSummary = `
	DROP VIEW IF EXISTS memberAttendanceSummary;
	CREATE VIEW memberAttendanceSummary AS
	WITH membersCurrent AS (
		SELECT
			SAPIN, SAPIN as CurrentSAPIN, Name, LastName, FirstName, MI, Email, Affiliation, Status, groupId
		FROM members WHERE Status<>'Obsolete'
		UNION ALL
		SELECT
			m1.SAPIN, m1.ReplacedBySAPIN as CurrentSAPIN, m2.Name, m2.LastName, m2.FirstName, m2.MI, m2.Email, m2.Affiliation, m2.Status, m2.groupId
		FROM members m1
			LEFT JOIN members m2 ON m1.groupId=m2.groupId AND m2.SAPIN=m1.ReplacedBySAPIN
		WHERE m1.Status='Obsolete'
	)
	SELECT
		a.id,
		a.groupId,
		a.session_id,
		a.AttendancePercentage,
		a.IsRegistered,
		a.InPerson,
		a.DidAttend,
		a.DidNotAttend,
		a.Notes,
		a.SAPIN,
		COALESCE(m.CurrentSAPIN, a.SAPIN) AS CurrentSAPIN,
		m.Name,
		m.LastName,
		m.FirstName,
		m.MI,
		m.Email,
		m.Affiliation,
		COALESCE(m.Status, 'Non-Voter') AS Status
	FROM attendanceSummary a 
		LEFT JOIN membersCurrent m ON a.SAPIN=m.SAPIN AND a.groupId=m.groupId
`;

export function init() {
	return db.query(createViewMemberAttendanceSummary);
}

function getAttendancesSql(query: SessionAttendanceSummaryQuery = {}) {
	// prettier-ignore
	let sql = 
		"SELECT " +
			"id, " +
			"BIN_TO_UUID(groupId) as groupId, " +
			"session_id, " +
			"SAPIN, " +
			"CurrentSAPIN, " +
			"AttendancePercentage, " +
			"IsRegistered, " +
			"InPerson, " +
			"DidAttend, " +
			"DidNotAttend, " +
			"Notes " +
		"FROM memberAttendanceSummary";

	const wheres = Object.entries(query).map(([key, value]) => {
		if (key === "groupId") {
			return db.format(
				Array.isArray(value)
					? "BIN_TO_UUID(??) IN (?)"
					: "??=UUID_TO_BIN(?)",
				[key, value]
			);
		}
		if (key === "withAttendance") {
			return db.format("AttendancePercentage > 0");
		}
		return db.format(Array.isArray(value) ? "?? IN (?)" : "??=?", [
			key,
			value,
		]);
	});
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

	let sql: string;

	// Clear AttendancePercentage for current entries
	sql = db.format(
		"UPDATE attendanceSummary SET AttendancePercentage=NULL WHERE groupId=UUID_TO_BIN(?) AND session_id=?",
		[group.id, session.id]
	);
	await db.query(sql);

	const queries: Promise<ResultSetHeader>[] = [];
	for (const a of imatAttendances) {
		sql =
			db.format(
				"INSERT INTO attendanceSummary (groupId, session_id, SAPIN, AttendancePercentage) VALUES "
			) +
			db.format("(UUID_TO_BIN(?), ?, ?, ?)", [
				group.id,
				session.id,
				a.SAPIN,
				a.AttendancePercentage,
			]) +
			" ON DUPLICATE KEY UPDATE AttendancePercentage=VALUES(AttendancePercentage)";
		queries.push(db.query(sql));
	}
	await Promise.all(queries);

	const attendances = await getAttendances({ groupId: group.id, session_id });
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

	const ssRegistrations = await parseRegistrationSpreadsheet(
		filename,
		buffer
	);
	const users = await getUsers();
	const registrations = ssRegistrations.map((r) => {
		const email = r.Email.toLowerCase();
		const sapin = r.SAPIN;
		let Matched: null | "SAPIN" | "EMAIL" = null;
		let user = users.find((u) => u.SAPIN === sapin);
		if (user) {
			Matched = "SAPIN";
		} else {
			user = users.find((u) => u.Email.toLowerCase() === email);
			if (user) Matched = "EMAIL";
		}
		const entity: SessionRegistration = {
			...r,
			Matched,
			CurrentSAPIN: user ? user.SAPIN : null,
			CurrentName: user ? user.Name : null,
			CurrentEmail: user ? user.Email : null,
		};
		return entity;
	});

	let sql: string;

	// Clear InPerson and IsRegistered for current entries
	sql = db.format(
		"UPDATE attendanceSummary SET InPerson=NULL, IsRegistered=NULL WHERE groupId=UUID_TO_BIN(?) AND session_id=?",
		[group.id, session_id]
	);
	await db.query(sql);

	const queries: Promise<ResultSetHeader>[] = [];
	for (const r of registrations) {
		if (r.CurrentSAPIN === null) continue; // Not (yet) present in users table
		const InPerson = /virtual|remote/i.test(r.RegType) ? 0 : 1;
		const IsRegistered = 1;
		let DidNotAttend = 0;
		let Notes: string | null = null;
		if (/student/i.test(r.RegType)) {
			DidNotAttend = 1;
			Notes = "Student registration";
		}
		sql =
			db.format(
				"INSERT INTO attendanceSummary (groupId, session_id, SAPIN, InPerson, IsRegistered, DidNotAttend, Notes) VALUES "
			) +
			db.format("(UUID_TO_BIN(?), ?, ?, ?, ?, ?, ?)", [
				group.id,
				session_id,
				r.CurrentSAPIN,
				InPerson,
				IsRegistered,
				DidNotAttend,
				Notes,
			]) +
			" ON DUPLICATE KEY UPDATE InPerson=VALUES(InPerson), IsRegistered=VALUES(IsRegistered), DidNotAttend=VALUES(DidNotAttend), Notes=VALUES(Notes)";
		queries.push(db.query(sql));
	}
	await Promise.all(queries);

	const attendances = await getAttendances({ groupId: group.id, session_id });
	return { registrations, attendances };
}

export type MemberAttendance = SessionAttendanceSummary & {
	Name: string;
	Affiliation: string;
	Status: string;
};

/**
 * Export session attendance for meeting minutes
 */
export async function exportAttendeesForMinutes(
	user: UserContext,
	group: Group,
	session_id: number,
	res: Response
) {
	const [session] = await getSessions({ id: session_id });
	if (!session)
		throw new NotFoundError(`Session id=${session_id} does not exist`);
	const attendances = await getAttendances({
		groupId: group.id,
		session_id,
		withAttendance: true,
	});
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

type AttendingMember = {
	FirstName: string;
	LastName: string;
	Email: string;
};

function registeredVotersSQL(session_id: number, status: MemberStatus[]) {
	// prettier-ignore
	return db.format(
		"SELECT " +
			"FirstName, " +
			"LastName, " +
			"Email " +
		"FROM memberAttendanceSummary " +
		"WHERE session_id=? AND Status IN (?) AND IsRegistered=1",
		[session_id, status]
	);
}

export async function exportAttendeesForDVL(
	user: UserContext,
	group: Group,
	session_id: number,
	res: Response
) {
	const [session] = await getSessions({ id: session_id });
	if (!session)
		throw new NotFoundError(`Session id=${session_id} does not exist`);

	const Status: MemberStatus[] =
		session.type === "p"
			? ["Voter", "ExOfficio", "Potential Voter"]
			: ["Voter", "ExOfficio"];

	const sql = registeredVotersSQL(session_id, Status);
	const registeredVoters =
		await db.query<(RowDataPacket & AttendingMember)[]>(sql);

	const ssData = registeredVoters.map((m) => ({
		"First Name": m.FirstName,
		"Last Name": m.LastName,
		Email: m.Email,
		MobilePhone: "",
		City: "",
		State: "",
		Zipcode: "",
		Country: "",
		AllocatedVotes: "",
	}));

	const filename = `${group.name}-voting-members-dvl.csv`;
	const csv = await csvStringify(ssData, { header: true });

	res.attachment(filename);
	res.status(200).send(csv);
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
	if (ids.length === 0) return 0;
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
