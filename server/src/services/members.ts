import { DateTime } from "luxon";

import db from "../utils/database.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Response } from "express";

import type { UserContext } from "./users.js";

import {
	parseMyProjectRosterSpreadsheet,
	genMyProjectRosterSpreadsheet,
	updateMyProjectRoster,
} from "./myProjectSpreadsheets.js";

import {
	parseMembersSpreadsheet,
	parseSAPINsSpreadsheet,
	parseEmailsSpreadsheet,
	parseHistorySpreadsheet,
} from "./membersSpreadsheets.js";

import { NotFoundError, csvStringify, isPlainObject } from "../utils/index.js";
import { AccessLevel } from "@schemas/access.js";

import {
	UserType,
	GroupMember,
	Member,
	MemberQuery,
	MemberCreate,
	StatusChangeEntry,
	ContactEmail,
	UpdateRosterOptions,
	StatusType,
	UserMember,
	memberStatusValues,
	MembersExportQuery,
} from "@schemas/members.js";
import { Group } from "@schemas/groups.js";

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
	"FROM users u JOIN groupMembers m ON (u.SAPIN=m.SAPIN)"

export async function init() {
	return db.query(createViewMembersSQL);
}

function selectMembersSql(query: MemberQuery) {
	const { groupId, ...rest } = query;
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
				"CAST(FALSE as JSON) as StatusChangeOverride, " +
				"NULL as ReplacedBySAPIN, " +
				"NULL as DateAdded, " +
				"'' as Notes, " +
				"ContactInfo, " +
				"ContactEmails, " +
				"JSON_ARRAY() as StatusChangeHistory, " +
				"JSON_ARRAY() AS ObsoleteSAPINs, " +
				"CAST(FALSE as JSON) as InRoster " +
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

/** A detailed list of members */
export function getMembers(query: MemberQuery): Promise<Member[]> {
	const sql = selectMembersSql(query);
	return db.query<(RowDataPacket & Member)[]>(sql);
}

export async function getMember(groupId: string, SAPIN: number) {
	const members: (Member | undefined)[] = await getMembers({
		groupId,
		SAPIN,
	});
	return members[0];
}

/** A details list of users (IEEE account holders) */
export function getUsers() {
	// prettier-ignore
	const sql =
		"SELECT " +
			"SAPIN, " +
			"Email, " +
			"Name, " +
			"FirstName, MI, LastName, " +
			"Employer, " +
			"ContactInfo, " +
			"ContactEmails " +
		"FROM users";
	return db.query(sql) as Promise<UserType[]>;
}

/** A record of users (IEEE account holders) */
export async function getUserEntities(): Promise<Record<number, UserType>> {
	const users = await getUsers();
	return users.reduce(
		(entities, user) => {
			entities[user.SAPIN] = user;
			return entities;
		},
		{} as Record<number, UserType>
	);
}

/*
 * A list of members is available to any member (for reassigning comments, etc.).
 * We only care about members with status Aspirant, Potential Voter, Voter or ExOfficial.
 */
export function getUserMembers(
	access: number,
	groupId: string
): Promise<UserMember[]> {
	let sql = "SELECT SAPIN, Name, Status";
	// Admin privileges needed to see email addresses
	if (access >= AccessLevel.rw) sql += ", Email";
	sql +=
		" FROM members " +
		"WHERE " +
		`groupId=UUID_TO_BIN(${db.escape(groupId)}) ` +
		'AND Status IN ("Observer", "Aspirant", "Potential Voter", "Voter", "ExOfficio")';

	return db.query<(RowDataPacket & UserMember)[]>(sql);
}

// eslint-disable-next-line
function isValidStatus(status: any): status is StatusType {
	return memberStatusValues.includes(status);
}

/*
 * Get a snapshot of the members and their status at a specific date
 * by walking through the status change history.
 */
export async function getMembersSnapshot(groupId: string, date: string) {
	let members = await getMembers({
		groupId,
		Status: [
			"Non-Voter",
			"Observer",
			"Aspirant",
			"Potential Voter",
			"Voter",
			"ExOfficio",
			"Obsolete",
		],
	});
	const fromDate = new Date(date);
	//console.log(date.toISOString().substr(0,10));
	members = members
		.filter((m) => m.DateAdded && new Date(m.DateAdded) < fromDate)
		.map((m) => {
			//m.StatusChangeHistory.forEach(h => h.Date = new Date(h.Date));
			const history = m.StatusChangeHistory.map((h) => ({
				...h,
				Date: new Date(h.Date || ""),
			})).sort((h1, h2) => h2.Date.valueOf() - h1.Date.valueOf());
			let status = m.Status;
			//console.log(`${m.SAPIN}:`)
			for (const h of history) {
				//console.log(`${h.Date.toISOString().substr(0,10)} ${h.OldStatus} -> ${h.NewStatus}`)
				if (
					h.Date > fromDate &&
					h.OldStatus &&
					h.NewStatus &&
					isValidStatus(h.OldStatus)
				) {
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

const statusMap: Record<StatusType, string> = {
	"Non-Voter": "Non-Voter",
	Observer: "Observer",
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
		entry.Status = "Non-Voter";

	return entry;
}

function memberSetsSql(entry: Partial<GroupMemberDB>) {
	const sets: string[] = [];
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

	return getMember(groupId, SAPIN);
}

export async function addMembers(groupId: string, members: MemberCreate[]) {
	return await Promise.all(members.map((m) => addMember(groupId, m)));
}

type StatusChangeUpdate = {
	id: number;
	changes: Partial<StatusChangeEntry>;
};

function validStatusChangeEntry(entry: unknown): entry is StatusChangeEntry {
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
	entries: unknown
): entries is StatusChangeEntry[] {
	return Array.isArray(entries) && entries.every(validStatusChangeEntry);
}

function validStatusChangeUpdate(
	update: unknown
): update is StatusChangeUpdate {
	return (
		isPlainObject(update) &&
		typeof update.id === "number" &&
		isPlainObject(update.changes)
	);
}

function validStatusChangeUpdates(
	updates: unknown
): updates is StatusChangeUpdate[] {
	return Array.isArray(updates) && updates.every(validStatusChangeUpdate);
}

function validStatusChangeIds(ids: unknown): ids is number[] {
	return Array.isArray(ids) && ids.every((id) => typeof id === "number");
}

export async function addMemberStatusChangeEntries(
	groupId: string,
	sapin: number,
	entries: unknown
) {
	if (!validStatusChangeEntries(entries))
		throw new TypeError("Expected array of status change entries");

	const member = await getMember(groupId, sapin);
	if (!member)
		throw new NotFoundError(`Member with SAPIN=${sapin} does not exist`);

	const history = member.StatusChangeHistory.concat(entries);

	const sql = db.format(
		"UPDATE groupMembers SET StatusChangeHistory=? " +
			"WHERE groupId=UUID_TO_BIN(?) AND SAPIN=?",
		[JSON.stringify(history), groupId, sapin]
	);
	await db.query(sql);

	return getMember(groupId, sapin);
}

export async function updateMemberStatusChangeEntries(
	groupId: string,
	sapin: number,
	updates: unknown
) {
	if (!validStatusChangeUpdates(updates))
		throw new TypeError(
			"Expected array of shape: {id: number, changes: object}[]"
		);

	const member = await getMember(groupId, sapin);
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

	return getMember(groupId, sapin);
}

export async function deleteMemberStatusChangeEntries(
	groupId: string,
	sapin: number,
	ids: unknown
) {
	if (!validStatusChangeIds(ids))
		throw new TypeError(
			"Expected an array of status change entry identifiers: number[]"
		);

	const member = await getMember(groupId, sapin);
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

	return getMember(groupId, sapin);
}

export async function updateMemberContactEmail(
	groupId: string,
	sapin: number,
	entry: Partial<ContactEmail>
) {
	const member = await getMember(groupId, sapin);
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

	return (await getMember(groupId, sapin))!;
}

export async function addMemberContactEmail(
	groupId: string,
	sapin: number,
	entry: Omit<ContactEmail, "id" | "DateAdded"> & { DateAdded?: string }
) {
	const member = await getMember(groupId, sapin);
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

	return (await getMember(groupId, sapin))!;
}

export async function deleteMemberContactEmail(
	groupId: string,
	sapin: number,
	entry: Pick<ContactEmail, "id">
) {
	const member = await getMember(groupId, sapin);
	if (!member)
		throw new NotFoundError(`Member with SAPIN=${sapin} does not exist`);

	const emails = member.ContactEmails.filter((h) => h.id !== entry.id);
	const sql = db.format("UPDATE users SET ContactEmails=? WHERE SAPIN=?", [
		JSON.stringify(emails),
		sapin,
	]);
	await db.query(sql);

	return (await getMember(groupId, sapin))!;
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
	const sql = db.format(
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
	const p: Promise<void | ResultSetHeader>[] = [];
	const { Status, StatusChangeReason, ...changesRest } = changes;

	/* If the member status changes, then update the status change history */
	const member = await getMember(groupId, sapin);
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
		p.push(db.query<ResultSetHeader>(sql));
	}

	const entry2 = memberEntry(changesRest);
	if (Object.keys(entry2).length) {
		const sql = db.format(
			"UPDATE groupMembers SET ? WHERE groupId=UUID_TO_BIN(?) AND SAPIN=?",
			[entry2, groupId, sapin]
		);
		p.push(db.query<ResultSetHeader>(sql));
	}

	if (p.length > 0) await Promise.all(p);

	return (await getMember(groupId, sapin))!;
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
	let sql: string;
	if (ids.length > 0) {
		sql = db.format(
			"DELETE FROM groupMembers WHERE groupId=UUID_TO_BIN(?) AND SAPIN IN (?)",
			[groupId, ids]
		);
		const result = await db.query<ResultSetHeader>(sql);

		// SAPINs that are no longer referenced from any groupMembers table, must be removed them from the users table
		sql = db.format("SELECT SAPIN FROM groupMembers WHERE SAPIN IN (?)", [
			ids,
		]);
		const inUseIds = (
			await db.query<(RowDataPacket & { SAPIN: number })[]>(sql)
		).map((row) => row.SAPIN);
		ids = ids.filter((id) => !inUseIds.includes(id));
		if (ids.length) {
			sql = db.format("DELETE FROM users WHERE SAPIN IN (?)", [ids]);
			await db.query(sql);
		}

		return result.affectedRows;
	}
	return 0;
}

async function uploadDatabaseMembers(groupId: string, buffer: Buffer) {
	const members = (await parseMembersSpreadsheet(buffer)).filter(
		(m) => m.SAPIN > 0
	);

	await db.query("DELETE FROM groupMembers WHERE groupId=UUID_TO_BIN(?)", [
		groupId,
	]);

	if (members.length > 0) {
		const users = members.map((r) => ({
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

		const groupMembers = members.map((r) => ({
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

// eslint-disable-next-line
function isUploadFormat(format: any): format is UploadFormat {
	return uploadFormats.includes(format);
}

export async function uploadMembers(
	groupId: string,
	format: string,
	filename: string,
	buffer: Buffer
) {
	format = format.toLocaleLowerCase();
	if (!isUploadFormat(format))
		throw new TypeError(
			"Invalid format; expected one of " + uploadFormats.join(", ")
		);

	if (format === "members") await uploadDatabaseMembers(groupId, buffer);
	else if (format === "sapins")
		await uploadDatabaseMemberSAPINs(groupId, buffer);
	else if (format === "emails")
		await uploadDatabaseMemberEmails(groupId, buffer);
	else if (format === "history")
		await uploadDatabaseMemberHistory(groupId, buffer);

	return getMembers({ groupId });
}

export async function importMyProjectRoster(
	groupId: string,
	filename: string,
	buffer: Buffer
) {
	let roster = await parseMyProjectRosterSpreadsheet(buffer);
	roster = roster.filter(
		(u) =>
			typeof u.SAPIN === "number" &&
			u.SAPIN > 0 &&
			u.Status.search(/Voter|Potential|Aspirant|Non-Voter/) === 0
	);

	if (roster.length > 0) {
		const users = roster.map((r) => ({
			...userEntry(r),
			SAPIN: r.SAPIN,
		}));

		let insertKeys = Object.keys(users[0]);
		let insertValues = users.map((u) =>
			insertKeys.map((key) => db.escape(u[key])).join(", ")
		);
		const updateKeys = insertKeys.filter((k) => k !== "SAPIN");
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

		const members = roster.map((r) => ({
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

	return getMembers({ groupId });
}

export async function exportMyProjectRoster(
	user: UserContext,
	groupId: string,
	res: Response
) {
	let members = await getMembers({
		groupId,
		Status: [
			"Voter",
			"Observer",
			"Aspirant",
			"Potential Voter",
			"Non-Voter",
			"ExOfficio",
		],
	});
	members = members.filter((m) => m.Status !== "Non-Voter" || m.InRoster);
	return genMyProjectRosterSpreadsheet(user, members, res);
}

export async function updateMyProjectRosterWithMemberStatus(
	user: UserContext,
	groupId: string,
	options: UpdateRosterOptions,
	fileanme: string,
	buffer: Buffer,
	res: Response
) {
	const members = await getMembers({
		groupId,
		Status: [
			"Voter",
			"Observer",
			"Aspirant",
			"Potential Voter",
			"Non-Voter",
			"ExOfficio",
		],
	});

	return updateMyProjectRoster(user, members, options, buffer, res);
}

function memberToPublicEntry(m: Member) {
	return {
		"Family Name": m.LastName,
		"Given Name": m.FirstName,
		MI: m.MI,
		Affiliation: m.Affiliation,
		Status: m.Status,
	};
}
export async function exportMembersPublic(groupId: string, res: Response) {
	const members = await getMembers({
		groupId,
		Status: [
			"Voter",
			"Observer",
			"Aspirant",
			"Potential Voter",
			"ExOfficio",
		],
	});

	const ssData = members.map(memberToPublicEntry);

	const csv = await csvStringify(ssData, { header: true });
	res.attachment("members-public.csv");
	res.status(200).send(csv);
}

function memberToVotingMemberEntry(m: Member) {
	return {
		SAPIN: m.SAPIN,
		"Last Name": m.LastName,
		"First Name": m.FirstName,
		"Middle Name": m.MI,
		Email: m.Email,
		Employer: m.Employer,
		Affiliation: m.Affiliation,
		Status: m.Status,
	};
}

function memberToDVLVotingMemberEntry(m: Member) {
	return {
		"First Name": m.FirstName,
		"Last Name": m.LastName,
		Email: m.Email,
		MobilePhone: "",
		City: "",
		State: "",
		Zipcode: "",
		Country: "",
		AllocatedVotes: "",
	};
}

type MemberMapper = (
	m: Member
) =>
	| ReturnType<typeof memberToVotingMemberEntry>
	| ReturnType<typeof memberToDVLVotingMemberEntry>
	| ReturnType<typeof memberToPublicEntry>;

export async function exportVotingMembers(
	group: Group,
	forPlenarySession: boolean,
	forDVL: boolean,
	date: string | undefined,
	res: Response
) {
	const Status = forPlenarySession
		? ["Voter", "ExOfficio", "Potential Voter"]
		: ["Voter", "ExOfficio"];
	let members: Member[];

	if (date) {
		members = await getMembersSnapshot(group.id, date);
		members = members.filter((m) => Status.includes(m.Status));
	} else {
		members = await getMembers({
			groupId: group.id,
			Status,
		});
	}

	let memberMapper: MemberMapper;
	let filename: string;
	if (forDVL) {
		memberMapper = memberToDVLVotingMemberEntry;
		filename = `${group.name}-voting-members-dvl.csv`;
	} else {
		memberMapper = memberToVotingMemberEntry;
		filename = `${group.name}-voting-members.csv`;
	}

	const ssData = members.map(memberMapper);
	const csv = await csvStringify(ssData, { header: true });

	res.attachment(filename);
	res.status(200).send(csv);
}

export async function membersExport(
	group: Group,
	query: MembersExportQuery,
	res: Response
) {
	let members: Member[];
	let Status: string[];
	if (query.format === "public") {
		Status = [
			"Observer",
			"Aspirant",
			"Potential Voter",
			"Voter",
			"ExOfficio",
		];
	} else {
		Status = ["Voter", "ExOfficio"];
	}
	if (query.status) Status = query.status;

	if (query.date) {
		members = await getMembersSnapshot(group.id, query.date);
		members = members.filter((m) => Status.includes(m.Status));
	} else {
		members = await getMembers({
			groupId: group.id,
			Status,
		});
	}

	let memberMapper: MemberMapper;
	let filename: string;
	if (query.format === "dvl") {
		memberMapper = memberToDVLVotingMemberEntry;
		filename = `${group.name}-voting-members-dvl.csv`;
	} else if (query.format === "public") {
		memberMapper = memberToPublicEntry;
		filename = "members-public.csv";
	} else if (query.format === "publication") {
		memberMapper = memberToPublicEntry;
		filename = `${group.name}-voting-members-public.csv`;
	} else {
		memberMapper = memberToVotingMemberEntry;
		filename = `${group.name}-voting-members.csv`;
	}

	if (query.date) {
		filename = filename.replace(".csv", `-${query.date}.csv`);
	}

	const ssData = members.map(memberMapper);
	const csv = await csvStringify(ssData, { header: true });

	res.attachment(filename);
	res.status(200).send(csv);
}
