import { DateTime } from "luxon";

import db from "../utils/database";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Response } from "express";

import type { User } from "./users";

import {
	parseMyProjectRosterSpreadsheet,
	genMyProjectRosterSpreadsheet,
} from "./myProjectSpreadsheets";

import {
	parseMembersSpreadsheet,
	parseSAPINsSpreadsheet,
	parseEmailsSpreadsheet,
	parseHistorySpreadsheet,
} from "./membersSpreadsheets";

import { NotFoundError, csvStringify, isPlainObject } from "../utils";
import { AccessLevel } from "../auth/access";

import {
	UserType,
	GroupMember,
	Member,
	MemberQuery,
	MemberCreate,
	StatusChangeEntry,
	ContactEmail,
} from "../schemas/members";

type UserTypeDB = Omit<UserType, "ContactInfo" | "ContactEmails"> & {
	ContactInfo: string; // JSON
	ContactEmails: string; // JSON
};

type GroupMemberDB = Omit<GroupMember, "StatusChangeHistory"> & {
	StatusChangeHistory: string; // JSON
};

export type MemberBasic = Pick<
	Member,
	"SAPIN" | "groupId" | "Name" | "Affiliation" | "Status"
>;

/*type MembersQueryConstraints = {
	SAPIN?: number | number[];
	Status?: string | string[];
	groupId?: string | string[];
	InRoster?: 0 | 1;
};*/

// prettier-ignore
const createViewMembersSQL =
	"DROP VIEW IF EXISTS members; " +
	"CREATE VIEW members AS SELECT " +
		"u.SAPIN AS SAPIN, " +
		"u.Email AS Email, " +
		"u.Name AS Name, " +
		"u.FirstName AS FirstName, " +
		"u.MI AS MI, " +
		"u.LastName AS LastName, " +
		"u.Employer AS Employer, " +
		"u.ContactInfo AS ContactInfo, " +
		"u.ContactEmails AS ContactEmails, " +
		"m.groupId AS groupId, " +
		"m.MemberID AS MemberID, " +
		"m.Affiliation AS Affiliation, " +
		"m.Status AS Status, " +
		"m.ReplacedBySAPIN AS ReplacedBySAPIN, " +
		"m.StatusChangeDate AS StatusChangeDate, " +
		"m.StatusChangeOverride AS StatusChangeOverride, " +
		"m.StatusChangeHistory AS StatusChangeHistory, " +
		"m.Notes AS Notes, " +
		"m.DateAdded AS DateAdded, " +
		"m.InRoster AS InRoster " +
	"FROM users u LEFT JOIN groupMembers m ON (u.SAPIN=m.SAPIN)"

export async function init() {
	const tables = await db.query<RowDataPacket[]>(
		"SELECT TABLE_NAME FROM information_schema.TABLES " +
			"WHERE TABLE_TYPE LIKE 'BASE%' AND TABLE_SCHEMA LIKE database() AND TABLE_NAME='members'"
	);
	if (tables.length > 0) {
		// Table "members" exists as a base table
		await db.query("ALTER TABLE members RENAME users");
	}
	return db.query(createViewMembersSQL);
}

function selectMembersSql(constraints: MemberQuery) {
	const { groupId, ...rest } = constraints;
	const wheres: string[] = [];

	let sql: string;
	if (groupId === "00000000-0000-0000-0000-000000000000") {
		// prettier-ignore
		sql =
			"SELECT " +
				`'${groupId}' as groupId, ` +
				"SAPIN, " +
				"NULL as MemberID, " +
				"Name, " +
				"FirstName, MI, LastName, " +
				"Email, " +
				"'' as Affiliation, " +
				"Employer, " +
				"'Non-Voter' as Status, " +
				"NULL as StatusChangeDate, " +
				"NULL as StatusChangeOverride, " +
				"NULL as ReplacedBySAPIN, " +
				"NULL as DateAdded, " +
				"'' as Notes, " +
				"ContactInfo, " +
				"ContactEmails, " +
				"JSON_ARRAY() as StatusChangeHistory, " +
				"JSON_ARRAY() AS ObsoleteSAPINs, " +
				"FALSE as InRoster " +
			"FROM users";

		Object.entries(rest).forEach(([key, value]) => {
			wheres.push(
				db.format(Array.isArray(value) ? "?? IN (?)" : "??=?", [
					key,
					value,
				])
			);
		});
	} else {
		// prettier-ignore
		sql =
			"SELECT " +
				"BIN_TO_UUID(groupId) as groupId, " +
				"m.SAPIN, " +
				"MemberID, " +
				"Name, " +
				"FirstName, MI, LastName, " +
				"Email, " +
				"Affiliation, " +
				"Employer, " +
				"Status, " +
				'DATE_FORMAT(StatusChangeDate, "%Y-%m-%dT%TZ") AS StatusChangeDate, ' +
				"StatusChangeOverride, " +
				"ReplacedBySAPIN, " +
				'DATE_FORMAT(DateAdded, "%Y-%m-%dT%TZ") AS DateAdded, ' +
				"Notes, " +
				"ContactInfo, " +
				"ContactEmails, " +
				"StatusChangeHistory, " +
				"COALESCE(ObsoleteSAPINs, JSON_ARRAY()) AS ObsoleteSAPINs, " +
				"InRoster " +
			"FROM members m " +
				'LEFT JOIN (SELECT ReplacedBySAPIN AS SAPIN, JSON_ARRAYAGG(SAPIN) AS ObsoleteSAPINs FROM members WHERE Status="Obsolete" GROUP BY ReplacedBySAPIN) AS o ON m.SAPIN=o.SAPIN ';

		if (groupId) {
			wheres.push(
				db.format(
					Array.isArray(groupId)
						? "BIN_TO_UUID(groupId) IN (?)"
						: "groupId=UUID_TO_BIN(?)",
					[groupId]
				)
			);
		}

		Object.entries(rest).forEach(([key, value]) => {
			wheres.push(
				db.format(Array.isArray(value) ? "m.?? IN (?)" : "m.??=?", [
					key,
					value,
				])
			);
		});
	}

	if (wheres.length > 0) sql += " WHERE " + wheres.join(" AND ");

	return sql;
}

/*
 * A detailed list of members
 */
export function getMembers(
	access: number,
	constraints: MemberQuery
): Promise<Member[]> {
	const sql = selectMembersSql(constraints);
	return db.query<(RowDataPacket & Member)[]>(sql);
}

export async function getMember(
	access: number,
	groupId: string,
	SAPIN: number
) {
	const members: (Member | undefined)[] = await getMembers(access, {
		groupId,
		SAPIN,
	});
	return members[0];
}

/*
 * A details list of users (IEEE account holders)
 */
export function getUsers() {
	let sql =
		"SELECT " +
		"SAPIN, " +
		"Email, " +
		"Name, " +
		"FirstName, MI, LastName, " +
		"Employer, " +
		"ContactInfo, " +
		"ContactEmails " +
		"FROM users";
	console.log(sql);
	return db.query(sql) as Promise<UserType[]>;
}

export type UserMember = {
	SAPIN: number;
	Name: string;
	Status: string;
	Email?: string;
};

/*
 * A list of members is available to any member (for reassigning comments, etc.).
 * We only care about members with status Aspirant, Potential Voter, Voter or ExOfficial.
 */
export function getUserMembers(access: number, groupId: string) {
	let sql = "SELECT SAPIN, Name, Status";
	// Admin privileges needed to see email addresses
	if (access >= AccessLevel.rw) sql += ", Email";
	sql +=
		" FROM members " +
		"WHERE " +
		`groupId=UUID_TO_BIN(${db.escape(groupId)}) ` +
		'AND Status IN ("Aspirant", "Potential Voter", "Voter", "ExOfficio")';

	return db.query(sql) as Promise<UserMember[]>;
}

/*
 * Get a snapshot of the members and their status at a specific date
 * by walking through the status change history.
 */
export async function getMembersSnapshot(
	access: number,
	groupId: string,
	date: string
) {
	let members = await getMembers(access, {
		groupId,
		Status: [
			"Non-Voter",
			"Aspirant",
			"Potential Voter",
			"Voter",
			"ExOfficio",
			"Obsolete",
		],
	});
	let fromDate = new Date(date);
	//console.log(date.toISOString().substr(0,10));
	members = members
		.filter((m) => m.DateAdded && new Date(m.DateAdded) < fromDate)
		.map((m) => {
			//m.StatusChangeHistory.forEach(h => h.Date = new Date(h.Date));
			let history = m.StatusChangeHistory.map((h) => ({
				...h,
				Date: new Date(h.Date || ""),
			})).sort((h1, h2) => h2.Date.valueOf() - h1.Date.valueOf());
			let status = m.Status;
			//console.log(`${m.SAPIN}:`)
			for (const h of history) {
				//console.log(`${h.Date.toISOString().substr(0,10)} ${h.OldStatus} -> ${h.NewStatus}`)
				if (h.Date > fromDate && h.OldStatus && h.NewStatus) {
					if (status !== h.NewStatus)
						console.warn(
							`${m.SAPIN}: Status mismatch; status=${status} but new status=${h.NewStatus}`
						);
					status = h.OldStatus;
					//console.log(`status=${status}`)
				}
			}
			//console.log(`final Status=${status}`)
			return {
				...m,
				Status: status,
			};
		});

	//console.log(members);
	return members;
}

const statusMap = {
	"Non-Voter": "Non-Voter",
	Aspirant: "Aspirant",
	"Potential Voter": "Potential Voter",
	Voter: "Voter",
	ExOfficio: "ExOfficio",
	Obsolete: "Obsolete",
};

function userEntry(m: Partial<Member>) {
	const entry: Partial<UserTypeDB> = {
		SAPIN: m.SAPIN,
		Name: m.Name,
		LastName: m.LastName,
		FirstName: m.FirstName,
		MI: m.MI,
		Email: m.Email,
		Employer: m.Employer,
	};

	if (m.ContactInfo !== undefined)
		entry.ContactInfo = JSON.stringify(m.ContactInfo);

	if (m.ContactEmails !== undefined)
		entry.ContactEmails = JSON.stringify(m.ContactEmails);

	for (const key in entry) {
		if (typeof entry[key] === "undefined") delete entry[key];
	}

	return entry;
}

function memberEntry(m: Partial<Member>) {
	const entry: Partial<GroupMemberDB> = {
		SAPIN: m.SAPIN,
		MemberID: m.MemberID,
		Affiliation: m.Affiliation,
		Status: m.Status,
		StatusChangeOverride: m.StatusChangeOverride,
		ReplacedBySAPIN: m.ReplacedBySAPIN,
		Notes: m.Notes,
	};

	if (m.StatusChangeDate !== undefined) {
		const date = DateTime.fromISO(m.StatusChangeDate || "");
		entry.StatusChangeDate = date.isValid
			? date.toUTC().toFormat("yyyy-MM-dd HH:mm:ss")
			: null;
	}

	if (m.DateAdded !== undefined) {
		const date = DateTime.fromISO(m.DateAdded || "");
		entry.DateAdded = date.isValid
			? date.toUTC().toFormat("yyyy-MM-dd HH:mm:ss")
			: null;
	}

	if (m.StatusChangeHistory !== undefined)
		entry.StatusChangeHistory = JSON.stringify(m.StatusChangeHistory);

	for (const key of Object.keys(entry)) {
		if (entry[key] === undefined) delete entry[key];
	}

	if (entry.Status && statusMap[entry.Status] === undefined)
		entry.Status = Object.keys(statusMap)[0];

	return entry;
}

function memberSetsSql(entry: Partial<GroupMemberDB>) {
	let sets: string[] = [];
	Object.entries(entry).forEach(([key, value]) => {
		sets.push(
			db.format(key === "groupId" ? "??=UUID_TO_BIN(?)" : "??=?", [
				key,
				value,
			])
		);
	});

	return sets.join(", ");
}

async function addMember(groupId: string, member: MemberCreate) {
	let sql: string;

	const SAPIN = member.SAPIN;
	if (!SAPIN) throw new TypeError("Must provide SAPIN");

	if (!member.DateAdded) member.DateAdded = DateTime.now().toISO();

	const uEntry = userEntry(member);
	uEntry.SAPIN = SAPIN;
	sql = "INSERT IGNORE INTO users SET " + db.escape(uEntry) + "; ";

	const mEntry = memberEntry(member);
	mEntry.groupId = groupId;
	mEntry.SAPIN = SAPIN;

	sql += "INSERT INTO groupMembers SET " + memberSetsSql(mEntry) + ";";
	await db.query(sql);

	return getMember(AccessLevel.rw, groupId, SAPIN);
}

export async function addMembers(groupId: string, members: MemberCreate[]) {
	return await Promise.all(members.map((m) => addMember(groupId, m)));
}

type StatusChangeUpdate = {
	id: number;
	changes: Partial<StatusChangeEntry>;
};

function validStatusChangeEntry(entry: any): entry is StatusChangeEntry {
	return (
		isPlainObject(entry) &&
		typeof entry.id === "number" &&
		(entry.Date === null || typeof entry.Date === "string") &&
		typeof entry.OldStatus === "string" &&
		typeof entry.NewStatus === "string" &&
		typeof entry.Reason === "string"
	);
}

function validStatusChangeEntries(
	entries: any
): entries is StatusChangeEntry[] {
	return Array.isArray(entries) && entries.every(validStatusChangeEntry);
}

function validStatusChangeUpdate(update: any): update is StatusChangeUpdate {
	return (
		isPlainObject(update) &&
		typeof update.id === "number" &&
		isPlainObject(update.changes)
	);
}

function validStatusChangeUpdates(
	updates: any
): updates is StatusChangeUpdate[] {
	return Array.isArray(updates) && updates.every(validStatusChangeUpdate);
}

function validStatusChangeIds(ids: any): ids is number[] {
	return Array.isArray(ids) && ids.every((id) => typeof id === "number");
}

export async function addMemberStatusChangeEntries(
	groupId: string,
	sapin: number,
	entries: any
) {
	if (!validStatusChangeEntries(entries))
		throw new TypeError("Expected array of status change entries");

	const member = await getMember(AccessLevel.rw, groupId, sapin);
	if (!member)
		throw new NotFoundError(`Member with SAPIN=${sapin} does not exist`);

	const history = member.StatusChangeHistory.concat(entries);

	const sql = db.format(
		"UPDATE groupMembers SET StatusChangeHistory=? " +
			"WHERE groupId=UUID_TO_BIN(?) AND SAPIN=?",
		[JSON.stringify(history), groupId, sapin]
	);
	await db.query(sql);

	return getMember(AccessLevel.rw, groupId, sapin);
}

export async function updateMemberStatusChangeEntries(
	groupId: string,
	sapin: number,
	updates: any
) {
	if (!validStatusChangeUpdates(updates))
		throw new TypeError(
			"Expected array of shape: {id: number, changes: object}[]"
		);

	const member = await getMember(AccessLevel.rw, groupId, sapin);
	if (!member)
		throw new NotFoundError(`Member with SAPIN=${sapin} does not exist`);

	const history = member.StatusChangeHistory.map((h) => {
		const update = updates.find((u) => u.id === h.id);
		return update ? { ...h, ...update.changes } : h;
	});

	const sql = db.format(
		"UPDATE groupMembers SET StatusChangeHistory=? " +
			"WHERE groupId=UUID_TO_BIN(?) AND SAPIN=?",
		[JSON.stringify(history), groupId, sapin]
	);
	await db.query(sql);

	return getMember(AccessLevel.rw, groupId, sapin);
}

export async function deleteMemberStatusChangeEntries(
	groupId: string,
	sapin: number,
	ids: any
) {
	if (!validStatusChangeIds(ids))
		throw new TypeError(
			"Expected an array of status change entry identifiers: number[]"
		);

	const member = await getMember(AccessLevel.rw, groupId, sapin);
	if (!member)
		throw new NotFoundError(`Member with SAPIN=${sapin} does not exist`);

	const history = member.StatusChangeHistory.filter(
		(h) => !ids.includes(h.id)
	);
	const sql = db.format(
		"UPDATE groupMembers SET StatusChangeHistory=? " +
			"WHERE groupId=UUID_TO_BIN(?) AND SAPIN=?",
		[JSON.stringify(history), groupId, sapin]
	);
	await db.query(sql);

	return getMember(AccessLevel.rw, groupId, sapin);
}

export async function updateMemberContactEmail(
	groupId: string,
	sapin: number,
	entry: Partial<ContactEmail>
) {
	const member = await getMember(AccessLevel.rw, groupId, sapin);
	if (!member)
		throw new NotFoundError(`Member with SAPIN=${sapin} does not exist`);

	const emails = member.ContactEmails.map((h) =>
		h.id === entry.id ? { ...h, ...entry } : h
	);
	const sql = db.format("UPDATE users SET ContactEmails=? WHERE SAPIN=?", [
		JSON.stringify(emails),
		sapin,
	]);
	await db.query(sql);

	return (await getMember(AccessLevel.rw, groupId, sapin))!;
}

export async function addMemberContactEmail(
	groupId: string,
	sapin: number,
	entry: Omit<ContactEmail, "id" | "DateAdded"> & { DateAdded?: string }
) {
	const member = await getMember(AccessLevel.rw, groupId, sapin);
	if (!member)
		throw new NotFoundError(`Member with SAPIN=${sapin} does not exist`);

	const id =
		member.ContactEmails.reduce(
			(maxId, h) => (h.id > maxId ? h.id : maxId),
			0
		) + 1;
	const emails = member.ContactEmails.slice();
	emails.unshift({ id, DateAdded: DateTime.now().toISO(), ...entry });
	const sql = db.format("UPDATE users SET ContactEmails=? WHERE SAPIN=?", [
		JSON.stringify(emails),
		sapin,
	]);
	await db.query(sql);

	return (await getMember(AccessLevel.rw, groupId, sapin))!;
}

export async function deleteMemberContactEmail(
	groupId: string,
	sapin: number,
	entry: Pick<ContactEmail, "id">
) {
	const member = await getMember(AccessLevel.rw, groupId, sapin);
	if (!member)
		throw new NotFoundError(`Member with SAPIN=${sapin} does not exist`);

	const emails = member.ContactEmails.filter((h) => h.id !== entry.id);
	const sql = db.format("UPDATE users SET ContactEmails=? WHERE SAPIN=?", [
		JSON.stringify(emails),
		sapin,
	]);
	await db.query(sql);

	return (await getMember(AccessLevel.rw, groupId, sapin))!;
}

async function updateMemberStatus(
	member: Member,
	status: string,
	reason: string,
	dateStr?: string
) {
	const date = dateStr ? DateTime.fromISO(dateStr) : DateTime.now();
	const id =
		member.StatusChangeHistory.reduce(
			(maxId, h) => (h.id > maxId ? h.id : maxId),
			0
		) + 1;
	const historyEntry = {
		id,
		Date: date.toUTC().toISO(),
		OldStatus: member.Status,
		NewStatus: status,
		Reason: reason,
	};
	const replacedBySAPIN =
		member.Status === "Obsolete" && status !== "Obsolete"
			? null
			: member.ReplacedBySAPIN;
	let sql = db.format(
		"UPDATE groupMembers SET " +
			"Status=?, " +
			"StatusChangeDate=?, " +
			"StatusChangeHistory=JSON_ARRAY_INSERT(StatusChangeHistory, '$[0]', CAST(? AS JSON)), " +
			"ReplacedBySAPIN=? " +
			"WHERE groupId=UUID_TO_BIN(?) AND SAPIN=?;",
		[
			status,
			date.toUTC().toFormat("yyyy-MM-dd HH:mm:ss"),
			JSON.stringify(historyEntry),
			replacedBySAPIN,
			member.groupId,
			member.SAPIN,
		]
	);
	await db.query(sql);
}

export async function updateMember(
	groupId: string,
	sapin: number,
	changes: Partial<Member> & { StatusChangeReason?: string }
) {
	const p: Promise<any>[] = [];
	const { Status, StatusChangeReason, ...changesRest } = changes;

	/* If the member status changes, then update the status change history */
	const member = await getMember(AccessLevel.rw, groupId, sapin);
	if (!member)
		throw new NotFoundError(`Member with SAPIN=${sapin} does not exist`);

	if (Status && Status !== member.Status) {
		p.push(
			updateMemberStatus(
				member,
				Status,
				StatusChangeReason || "",
				changes.StatusChangeDate || undefined
			)
		);
	}
	const entry1 = userEntry(changesRest);
	if (Object.keys(entry1).length > 0) {
		const sql = db.format("UPDATE users SET ? WHERE SAPIN=?", [
			entry1,
			sapin,
		]);
		p.push(db.query(sql));
	}

	const entry2 = memberEntry(changesRest);
	if (Object.keys(entry2).length) {
		const sql = db.format(
			"UPDATE groupMembers SET ? WHERE groupId=UUID_TO_BIN(?) AND SAPIN=?",
			[entry2, groupId, sapin]
		);
		p.push(db.query(sql));
	}

	if (p.length > 0) await Promise.all(p);

	return (await getMember(AccessLevel.rw, groupId, sapin))!;
}

type Update<T> = {
	id: number;
	changes: Partial<T>;
};
export async function updateMembers(
	groupId: string,
	updates: Update<Member>[]
) {
	// Validate request
	for (const u of updates) {
		if (typeof u !== "object" || !u.id || typeof u.changes !== "object")
			throw new TypeError(
				"Expected array of objects with shape {id, changes}"
			);
	}
	const newMembers = await Promise.all(
		updates.map((u) => updateMember(groupId, u.id, u.changes))
	);
	return newMembers;
}

export async function deleteMembers(groupId: string, ids: number[]) {
	if (ids.length > 0) {
		const sql = db.format(
			"DELETE FROM groupMembers WHERE groupId=UUID_TO_BIN(?) AND SAPIN IN (?)",
			[groupId, ids]
		);
		const result = await db.query<ResultSetHeader>(sql);
		return result.affectedRows;
	}
	return 0;
}

async function uploadDatabaseMembers(groupId: string, buffer: Buffer) {
	let members = (await parseMembersSpreadsheet(buffer)).filter(
		(m) => m.SAPIN > 0
	);

	await db.query("DELETE FROM groupMembers WHERE groupId=UUID_TO_BIN(?)", [
		groupId,
	]);

	if (members.length > 0) {
		let users = members.map((r) => ({
			...userEntry(r),
			SAPIN: r.SAPIN,
		}));

		let insertKeys = Object.keys(users[0]);
		let insertValues = users.map((u) =>
			insertKeys.map((key) => db.escape(u[key])).join(", ")
		);
		let updateKeys = insertKeys.filter((k) => k !== "SAPIN");
		let sql =
			`INSERT INTO users (${insertKeys}) VALUES ` +
			insertValues.map((v) => `(${v})`).join(", ") +
			" ON DUPLICATE KEY UPDATE " +
			updateKeys.map((k) => k + "=VALUES(" + k + ")");
		await db.query(sql);

		let groupMembers = members.map((r) => ({
			groupId,
			SAPIN: r.SAPIN,
			Affiliation: r.Affiliation,
			InRoster: true,
		}));

		insertKeys = Object.keys(groupMembers[0]);
		insertValues = groupMembers.map((m) =>
			insertKeys
				.map((key) =>
					key === "groupId"
						? `UUID_TO_BIN(${db.escape(m[key])})`
						: db.escape(m[key])
				)
				.join(", ")
		);
		updateKeys = insertKeys.filter(
			(key) => key !== "groupId" && key !== "SAPIN"
		);
		sql =
			`INSERT INTO groupMembers (${insertKeys}) VALUES ` +
			insertValues.map((v) => `(${v})`).join(", ") +
			" ON DUPLICATE KEY UPDATE " +
			updateKeys.map((k) => k + "=VALUES(" + k + ")");
		await db.query(sql);
	}
}

async function uploadDatabaseMemberSAPINs(groupId: string, buffer: Buffer) {
	const sapins = await parseSAPINsSpreadsheet(buffer);

	const updateSql = (SAPIN: number, date: string | null) =>
		db.format(
			"UPDATE groupMembers SET DateAdded=? WHERE groupId=UUID_TO_BIN(?) AND SAPIN=?",
			[date, groupId, SAPIN]
		);

	const insertUserSql = (SAPIN: number, memberId: number) =>
		// prettier-ignore
		"INSERT IGNORE INTO users (" +
			"SAPIN, " +
			"Name, LastName, FirstName, MI, " +
			"Email, Employer, ContactInfo) " +
		"SELECT " +
			`${db.escape(SAPIN)}, ` +
			"Name, LastName, FirstName, MI, " +
			"Email, Employer, ContactInfo " +
		"FROM users u JOIN groupMembers m " +
			`ON u.SAPIN=m.SAPIN AND m.groupId=UUID_TO_BIN(${db.escape(groupId)}) ` +
		`WHERE m.MemberID=${db.escape(memberId)} ` +
		"LIMIT 1";

	const insertGroupMemberSql = (
		SAPIN: number,
		date: string | null,
		memberId: number
	) =>
		// prettier-ignore
		"INSERT INTO groupMembers (" +
			"SAPIN, groupId, DateAdded, " +
			"MemberID, " +
			"Affiliation, " +
			"Status, " +
			"StatusChangeDate, " +
			"ReplacedBySAPIN) " +
		"SELECT " +
			db.format("?, UUID_TO_BIN(?), ?, ", [SAPIN, groupId, date]) +
			"MemberID, " +
			"Affiliation, " +
			'"Obsolete", ' +
			'UTC_TIMESTAMP(), ' +
			"SAPIN " +
		"FROM groupMembers " +
		db.format("WHERE groupId=UUID_TO_BIN(?) AND MemberID=? ", [groupId, memberId]) +
		"LIMIT 1";

	const missingSapins: typeof sapins = [];
	await Promise.all(
		sapins.map(async (s) => {
			const dateAdded = s.DateAdded
				? DateTime.fromISO(s.DateAdded)
						.toUTC()
						.toFormat("yyyy-MM-dd HH:mm:ss")
				: null;
			const result = await db.query<ResultSetHeader>(
				updateSql(s.SAPIN, dateAdded)
			);
			if (result.affectedRows === 0) missingSapins.push(s);
		})
	);
	const sql = missingSapins
		.map((s) => {
			const dateAdded = s!.DateAdded
				? DateTime.fromISO(s!.DateAdded)
						.toUTC()
						.toFormat("yyyy-MM-dd HH:mm:ss")
				: null;
			return (
				insertUserSql(s.SAPIN, s.MemberID) +
				"; " +
				insertGroupMemberSql(s.SAPIN, dateAdded, s.MemberID)
			);
		})
		.join("; ");
	await db.query(sql);
}

async function uploadDatabaseMemberEmails(groupId: string, buffer: Buffer) {
	const emails = await parseEmailsSpreadsheet(buffer);
	const entities: Record<number, ContactEmail[]> = {};
	for (const entry of emails) {
		const memberId = entry.MemberID!;
		delete entry.MemberID;
		if (!entities[memberId]) {
			entities[memberId] = [];
		}
		const contactEmails = entities[memberId];
		contactEmails.push({ ...entry, id: contactEmails.length });
	}
	let sql =
		"UPDATE users u LEFT JOIN groupMembers m " +
		`ON u.SAPIN=m.SAPIN AND m.groupId=UUID_TO_BIN(${db.escape(groupId)}) ` +
		"SET ContactEmails=JSON_ARRAY(); ";

	sql += Object.entries(entities)
		.map(
			([memberId, contactEmails]) =>
				"UPDATE users u LEFT JOIN groupMembers m " +
				`ON u.SAPIN=m.SAPIN AND m.groupId=UUID_TO_BIN(${db.escape(
					groupId
				)}) ` +
				`SET ContactEmails=${db.escape(
					JSON.stringify(contactEmails)
				)} ` +
				`WHERE m.MemberID=${memberId}`
		)
		.join("; ");

	await db.query(sql);
}

async function uploadDatabaseMemberHistory(groupId: string, buffer: Buffer) {
	const histories = await parseHistorySpreadsheet(buffer);
	const entities: Record<number, StatusChangeEntry[]> = {};
	for (const h of histories) {
		const memberId = h.MemberID!;
		delete h.MemberID;
		if (!entities[memberId]) {
			entities[memberId] = [];
		}
		const history = entities[memberId];
		history.push({ ...h, id: history.length });
	}

	const sql =
		"UPDATE groupMembers SET StatusChangeHistory=JSON_ARRAY() " +
		`WHERE groupId=UUID_TO_BIN(${db.escape(groupId)}); ` +
		Object.entries(entities)
			.map(
				([memberId, history]) =>
					"UPDATE groupMembers " +
					`SET StatusChangeHistory=${db.escape(
						JSON.stringify(history.reverse())
					)} ` +
					`WHERE groupId=UUID_TO_BIN(${db.escape(
						groupId
					)}) AND MemberID=${db.escape(memberId)}`
			)
			.join("; ");

	await db.query(sql);
}

const uploadFormats = ["members", "sapins", "emails", "history"] as const;
type UploadFormat = (typeof uploadFormats)[number];

function isUploadFormat(format: any): format is UploadFormat {
	return uploadFormats.includes(format);
}

export async function uploadMembers(
	groupId: string,
	format: string,
	file: { buffer: Buffer }
) {
	format = format.toLocaleLowerCase();
	if (!isUploadFormat(format))
		throw new TypeError(
			"Invalid format; expected one of " + uploadFormats.join(", ")
		);

	if (format === "members") await uploadDatabaseMembers(groupId, file.buffer);
	else if (format === "sapins")
		await uploadDatabaseMemberSAPINs(groupId, file.buffer);
	else if (format === "emails")
		await uploadDatabaseMemberEmails(groupId, file.buffer);
	else if (format === "history")
		await uploadDatabaseMemberHistory(groupId, file.buffer);

	return getMembers(AccessLevel.admin, { groupId });
}

export async function importMyProjectRoster(
	groupId: string,
	file: { buffer: Buffer }
) {
	let roster = await parseMyProjectRosterSpreadsheet(file.buffer);
	roster = roster.filter(
		(u) =>
			typeof u.SAPIN === "number" &&
			u.SAPIN > 0 &&
			u.Status.search(/Voter|Potential|Aspirant|Non-Voter/) === 0
	);

	if (roster.length > 0) {
		let users = roster.map((r) => ({
			...userEntry(r),
			SAPIN: r.SAPIN,
		}));

		let insertKeys = Object.keys(users[0]);
		let insertValues = users.map((u) =>
			insertKeys.map((key) => db.escape(u[key])).join(", ")
		);
		let updateKeys = insertKeys.filter((k) => k !== "SAPIN");
		let sql =
			db.format("INSERT INTO users (??) VALUES ", [insertKeys]) +
			insertValues.map((s) => "(" + s + ")").join(", ") +
			" AS new ON DUPLICATE KEY UPDATE " +
			updateKeys.map((k) => db.format("??=new.??", [k, k])).join(", ");
		let result = await db.query<ResultSetHeader>(sql);

		sql = db.format(
			"UPDATE groupMembers SET InRoster=0 WHERE groupId=UUID_TO_BIN(?)",
			[groupId]
		);
		await db.query(sql);

		let members = roster.map((r) => ({
			...memberEntry(r),
			groupId,
			SAPIN: r.SAPIN,
			Status: "Non-Voter", // Always import as Non-Voter
			InRoster: true,
		}));

		insertKeys = Object.keys(members[0]);
		insertValues = members.map((m) =>
			insertKeys
				.map((key) =>
					key === "groupId"
						? `UUID_TO_BIN(${db.escape(m[key])})`
						: db.escape(m[key])
				)
				.join(", ")
		);
		sql =
			db.format("INSERT INTO groupMembers (??) VALUES ", [insertKeys]) +
			insertValues.map((s) => "(" + s + ")").join(", ") +
			" AS new ON DUPLICATE KEY UPDATE `Affiliation`=new.`Affiliation`, `InRoster`=new.`InRoster`";
		result = await db.query<ResultSetHeader>(sql);
		console.log(result);
	}

	return getMembers(AccessLevel.admin, { groupId });
}

export async function exportMyProjectRoster(
	user: User,
	groupId: string,
	res: Response
) {
	let members = await getMembers(AccessLevel.admin, {
		groupId,
		Status: [
			"Voter",
			"Aspirant",
			"Potential Voter",
			"Non-Voter",
			"ExOfficio",
		],
	});
	members = members.filter((m) => m.Status !== "Non-Voter" || m.InRoster);
	return genMyProjectRosterSpreadsheet(user, members, res);
}

export async function exportMembersPublic(groupId: string, res: Response) {
	let members = await getMembers(AccessLevel.admin, {
		groupId,
		Status: ["Voter", "Aspirant", "Potential Voter", "ExOfficio"],
	});

	let ssData = members.map((m) => ({
		"Family Name": m.LastName,
		"Given Name": m.FirstName,
		MI: m.MI,
		Affiliation: m.Affiliation,
		Status: m.Status,
	}));

	const csv = await csvStringify(ssData, { header: true });
	res.attachment("members-public.csv");
	res.status(200).send(csv);
}

export async function exportMembersPrivate(groupId: string, res: Response) {
	let members = await getMembers(AccessLevel.admin, {
		groupId,
		Status: ["Voter", "Aspirant", "Potential Voter", "ExOfficio"],
	});

	let ssData = members.map((m) => ({
		SAPIN: m.SAPIN,
		"Family Name": m.LastName,
		"Given Name": m.FirstName,
		MI: m.MI,
		Affiliation: m.Affiliation,
		Status: m.Status,
	}));

	const csv = await csvStringify(ssData, { header: true });
	res.attachment("members-private.csv");
	res.status(200).send(csv);
}

export async function exportVotingMembers(
	groupId: string,
	forPlenarySession: boolean,
	res: Response
) {
	const Status = forPlenarySession
		? ["Voter", "ExOfficio", "Potential Voter"]
		: ["Voter", "ExOfficio"];
	let members = await getMembers(AccessLevel.admin, {
		groupId,
		Status,
	});

	let ssData = members.map((m) => ({
		SAPIN: m.SAPIN,
		"Family Name": m.LastName,
		"Given Name": m.FirstName,
		MI: m.MI,
		Email: m.Email,
		Status: m.Status,
	}));

	const csv = await csvStringify(ssData, { header: true });
	res.attachment("voting-members.csv");
	res.status(200).send(csv);
}
