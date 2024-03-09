import { DateTime } from "luxon";

import db from "../utils/database";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Response } from "express";

import { User } from "./users";

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

import { NotFoundError, isPlainObject } from "../utils";
import { AccessLevel } from "../auth/access";

export type Member = {
	/** SA PIN (unique identifier for IEEE SA account) */
	SAPIN: number;
	/** Member name (formed from FirstName + MI + LastName) */
	Name: string;
	FirstName: string;
	MI: string;
	LastName: string;
	/** Member account email (alternate unique identifier for IEEE SA account) */
	Email: string;
	/** Member declared affiliation */
	Affiliation: string;
	/** Member declared employer */
	Employer: string;
	/** Group membership status */
	Status: string;
	/** Array of SAPINs previously used by member */
	ObsoleteSAPINs: number[];
	/** SAPIN that replaces this one */
	ReplacedBySAPIN: number;
	/** Date of last status change (ISO date string) */
	StatusChangeDate: string | null;
	/** History of status change */
	StatusChangeHistory: StatusChangeEntry[];
	/** Manually maintain status; don't update based on attendance/participation */
	StatusChangeOverride: boolean;
	/** Date member was added */
	DateAdded: string | null;
	/** Member identifier from Adrian's Access database */
	MemberID: number;
	Access: number;
	Permissions: string[];
	Notes: string;
	ContactInfo: ContactInfo;
	ContactEmails: ContactEmail[];
};

export type MemberBasic = Pick<
	Member,
	| "SAPIN"
	| "Name"
	| "FirstName"
	| "MI"
	| "LastName"
	| "Email"
	| "Affiliation"
	| "Employer"
	| "Status"
	| "StatusChangeOverride"
	| "StatusChangeDate"
	| "MemberID"
	| "ContactInfo"
>;

export type StatusChangeEntry = {
	id: number;
	Date: string | null;
	OldStatus: string;
	NewStatus: string;
	Reason: string;
};

export type ContactEmail = {
	id: number;
	Email: string;
	DateAdded: string | null;
	Primary: boolean;
	Broken: boolean;
};

export type ContactInfo = {
	StreetLine1: string;
	StreetLine2: string;
	City: string;
	State: string;
	Zip: string;
	Country: string;
	Phone: string;
	Fax: string;
};

type MemberDB = Omit<
	Member,
	"ContactInfo" | "ContactEmails" | "StatusChangeHistory"
> & {
	ContactInfo: string;
	ContactEmails: string;
	StatusChangeHistory: string;
};

type MembersQueryConstraints = {
	SAPIN?: number | number[];
	Status?: string | string[];
}

function selectMembersSql(constraints?: MembersQueryConstraints) {
	// prettier-ignore
	let sql =
		"SELECT " +
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
			"Access, " +
			"ContactInfo, " +
			"ContactEmails, " +
			"StatusChangeHistory, " +
			"COALESCE(ObsoleteSAPINs, JSON_ARRAY()) AS ObsoleteSAPINs " +
		"FROM members m " +
			'LEFT JOIN (SELECT ReplacedBySAPIN AS SAPIN, JSON_ARRAYAGG(SAPIN) AS ObsoleteSAPINs FROM members WHERE Status="Obsolete" GROUP BY ReplacedBySAPIN) AS o ON m.SAPIN=o.SAPIN ';

	if (constraints) {
		const wheres: string[] = [];
		Object.entries(constraints).forEach(([key, value]) => {
			wheres.push(
				db.format(Array.isArray(value)? '?? IN (?)': '??=?', [key, value])
			);
		});
		if (wheres.length > 0)
			sql += ' WHERE ' + wheres.join(' AND ');
	}

	return sql;
}

/*
 * A detailed list of members
 */
export function getMembers(constraints?: MembersQueryConstraints): Promise<Member[]> {
	const sql = selectMembersSql(constraints);
	return db.query<(RowDataPacket & Member)[]>(sql);
}

export async function getMember(SAPIN: number) {
	const members: (Member | undefined)[] = await getMembers({SAPIN});
	return members[0];
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
export function selectUsers(user: User, access: number) {
	let sql = "SELECT SAPIN, Name, Status";
	// Admin privileges needed to see email addresses
	if (access >= AccessLevel.admin) sql += ", Email";
	sql +=
		' FROM members WHERE Status IN ("Aspirant", "Potential Voter", "Voter", "ExOfficio")';

	return db.query(sql) as Promise<UserMember[]>;
}

/*
 * Get a snapshot of the members and their status at a specific date
 * by walking through the status change history.
 */
export async function getMembersSnapshot(date: string) {
	let members = await getMembers();
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

const Status = {
	"Non-Voter": "Non-Voter",
	Aspirant: "Aspirant",
	"Potential Voter": "Potential Voter",
	Voter: "Voter",
	ExOfficio: "ExOfficio",
	Obsolete: "Obsolete",
};

function memberEntry(m: Partial<Member>) {
	const entry: Partial<MemberDB> = {
		SAPIN: m.SAPIN,
		MemberID: m.MemberID,
		Name: m.Name,
		LastName: m.LastName,
		FirstName: m.FirstName,
		MI: m.MI,
		Email: m.Email,
		Affiliation: m.Affiliation,
		Employer: m.Employer,
		Access: m.Access,
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

	if (m.ContactInfo !== undefined)
		entry.ContactInfo = JSON.stringify(m.ContactInfo);

	if (m.ContactEmails !== undefined)
		entry.ContactEmails = JSON.stringify(m.ContactEmails);

	if (m.StatusChangeHistory !== undefined)
		entry.StatusChangeHistory = JSON.stringify(m.StatusChangeHistory);

	for (const key of Object.keys(entry)) {
		if (entry[key] === undefined) delete entry[key];
	}

	if (entry.Status && Status[entry.Status] === undefined)
		entry.Status = Object.keys(Status)[0];

	return entry;
}

function replaceMemberPermissions(
	sapin: number,
	permissions: string[]
): Promise<any> {
	let sql = db.format("DELETE FROM permissions WHERE SAPIN=?;", [sapin]);
	if (permissions.length > 0)
		sql +=
			"INSERT INTO permissions (SAPIN, scope) VALUES " +
			permissions
				.map((scope) => db.format("(?, ?)", [sapin, scope]))
				.join(", ") +
			";";
	return db.query(sql);
}

async function addMember(member: Member) {
	if (!member.SAPIN) throw new TypeError("Must provide SAPIN");

	if (!member.DateAdded) member.DateAdded = DateTime.now().toISO();

	const entry = memberEntry(member);

	await db.query({ sql: "INSERT INTO members SET ?;", dateStrings: true }, [
		entry,
	]);

	if (Array.isArray(member.Permissions))
		await replaceMemberPermissions(member.SAPIN, member.Permissions);

	return getMember(entry.SAPIN!);
}

export async function addMembers(members: Member[]) {
	return await Promise.all(members.map(addMember));
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
	sapin: number,
	entries: any
) {
	if (!validStatusChangeEntries(entries))
		throw new TypeError("Expected array of status change entries");

	const member = await getMember(sapin);
	if (!member)
		throw new NotFoundError(`Member with SAPIN=${sapin} does not exist`);

	const history = member.StatusChangeHistory.concat(entries);

	await db.query(
		"UPDATE members SET " + "StatusChangeHistory=? " + "WHERE SAPIN=?;",
		[JSON.stringify(history), sapin]
	);

	return getMember(sapin);
}

export async function updateMemberStatusChangeEntries(
	sapin: number,
	updates: any
) {
	if (!validStatusChangeUpdates(updates))
		throw new TypeError(
			"Expected array of shape: {id: number, changes: object}[]"
		);

	const member = await getMember(sapin);
	if (!member)
		throw new NotFoundError(`Member with SAPIN=${sapin} does not exist`);

	const history = member.StatusChangeHistory.map((h) => {
		const update = updates.find((u) => u.id === h.id);
		return update ? { ...h, ...update.changes } : h;
	});

	await db.query(
		"UPDATE members SET " + "StatusChangeHistory=? " + "WHERE SAPIN=?;",
		[JSON.stringify(history), sapin]
	);

	return getMember(sapin);
}

export async function deleteMemberStatusChangeEntries(sapin: number, ids: any) {
	if (!validStatusChangeIds(ids))
		throw new TypeError(
			"Expected an array of status change entry identifiers: number[]"
		);

	const member = await getMember(sapin);
	if (!member)
		throw new NotFoundError(`Member with SAPIN=${sapin} does not exist`);

	const history = member.StatusChangeHistory.filter(
		(h) => !ids.includes(h.id)
	);
	await db.query(
		"UPDATE members SET " + "StatusChangeHistory=? " + "WHERE SAPIN=?;",
		[JSON.stringify(history), sapin]
	);

	return getMember(sapin);
}

export async function updateMemberContactEmail(
	sapin: number,
	entry: Partial<ContactEmail>
) {
	const member = await getMember(sapin);
	if (!member)
		throw new NotFoundError(`Member with SAPIN=${sapin} does not exist`);

	const emails = member.ContactEmails.map((h) =>
		h.id === entry.id ? { ...h, ...entry } : h
	);
	await db.query(
		"UPDATE members SET " + "ContactEmails=? " + "WHERE SAPIN=?;",
		[JSON.stringify(emails), sapin]
	);
	return (await getMember(sapin))!;
}

export async function addMemberContactEmail(
	sapin: number,
	entry: Omit<ContactEmail, "id" | "DateAdded"> & { DateAdded?: string }
) {
	const member = await getMember(sapin);
	if (!member)
		throw new NotFoundError(`Member with SAPIN=${sapin} does not exist`);

	const id =
		member.ContactEmails.reduce(
			(maxId, h) => (h.id > maxId ? h.id : maxId),
			0
		) + 1;
	const emails = member.ContactEmails.slice();
	emails.unshift({ id, DateAdded: DateTime.now().toISO(), ...entry });
	await db.query(
		"UPDATE members SET " + "ContactEmails=? " + "WHERE SAPIN=?;",
		[JSON.stringify(emails), sapin]
	);
	return (await getMember(sapin))!;
}

export async function deleteMemberContactEmail(
	sapin: number,
	entry: Pick<ContactEmail, "id">
) {
	const member = await getMember(sapin);
	if (!member)
		throw new NotFoundError(`Member with SAPIN=${sapin} does not exist`);

	const emails = member.ContactEmails.filter((h) => h.id !== entry.id);
	await db.query(
		"UPDATE members SET " + "ContactEmails=? " + "WHERE SAPIN=?;",
		[JSON.stringify(emails), sapin]
	);
	return (await getMember(sapin))!;
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
	await db.query(
		{
			sql:
				"UPDATE members SET " +
				"Status=?, " +
				"StatusChangeDate=?, " +
				"StatusChangeHistory=JSON_ARRAY_INSERT(StatusChangeHistory, '$[0]', CAST(? AS JSON)), " +
				"ReplacedBySAPIN=? " +
				"WHERE SAPIN=?;",
			dateStrings: true,
		},
		[
			status,
			date.toUTC().toFormat("yyyy-MM-dd HH:mm:ss"),
			JSON.stringify(historyEntry),
			replacedBySAPIN,
			member.SAPIN,
		]
	);
}

export async function updateMember(
	sapin: number,
	changes: Partial<Member> & { StatusChangeReason?: string }
) {
	const p: Promise<any>[] = [];
	const { Status, StatusChangeReason, Permissions, ...changesRest } = changes;

	/* If the member status changes, then update the status change history */
	const member = await getMember(sapin);
	if (!member)
		throw new NotFoundError(`Member with SAPIN=${sapin} does not exist`);

	if (Status && Status !== member.Status)
		p.push(
			updateMemberStatus(
				member,
				Status,
				StatusChangeReason || "",
				changes.StatusChangeDate || undefined
			)
		);

	const entry = memberEntry(changesRest);
	if (Object.keys(entry).length)
		p.push(
			db.query(
				{
					sql: "UPDATE members SET ? WHERE SAPIN=?;",
					dateStrings: true,
				},
				[entry, sapin]
			)
		);

	if (Permissions) p.push(replaceMemberPermissions(sapin, Permissions));

	if (p.length > 0) await Promise.all(p);

	return (await getMember(sapin))!;
}

type Update<T> = {
	id: number;
	changes: Partial<T>;
};
export async function updateMembers(updates: Update<Member>[]) {
	// Validate request
	for (const u of updates) {
		if (typeof u !== "object" || !u.id || typeof u.changes !== "object")
			throw new TypeError(
				"Expected array of objects with shape {id, changes}"
			);
	}
	const newMembers = await Promise.all(
		updates.map((u) => updateMember(u.id, u.changes))
	);
	return newMembers;
}

export async function deleteMembers(ids: number[]) {
	if (ids.length > 0) {
		const result = (await db.query(
			"DELETE FROM members WHERE SAPIN IN (?)",
			[ids]
		)) as ResultSetHeader;
		return result.affectedRows;
	}
	return 0;
}

async function uploadDatabaseMembers(buffer: Buffer) {
	let members = (await parseMembersSpreadsheet(buffer))
		.filter((m) => m.SAPIN > 0)
		.map(memberEntry);

	const sql =
		"DELETE FROM members; " +
		db.format("INSERT INTO members (??) VALUES ", [
			Object.keys(members[0]),
		]) +
		members.map((u) => "(" + db.escape(Object.values(u)) + ")").join(", ") +
		";";

	await db.query({ sql, dateStrings: true });
}

async function uploadDatabaseMemberSAPINs(buffer: Buffer) {
	const sapins = await parseSAPINsSpreadsheet(buffer);

	const updateSql = (SAPIN: number, date: string | null) =>
		db.format("UPDATE members SET DateAdded=? WHERE SAPIN=?",
			[date, SAPIN]
		);

	const insertSql = (SAPIN: number, date: string | null, memberId: number) =>
		// prettier-ignore
		db.format(
			"INSERT INTO members (" +
				"SAPIN, DateAdded, " +
				"MemberID, " +
				"Name, LastName, FirstName, MI, " +
				"Email, Affiliation, Employer, ContactInfo, " +
				"Status, " +
				"StatusChangeDate, " +
				"ReplacedBySAPIN) " +
			"SELECT " +
				"?, ?, " +
				"MemberID, " +
				"Name, LastName, FirstName, MI, " +
				"Email, Affiliation, Employer, ContactInfo, " +
				'"Obsolete", ' +
				'UTC_TIMESTAMP(), ' +
				"SAPIN " +
			"FROM members WHERE MemberID=? LIMIT 1",
			[SAPIN, date, memberId]
		);

	const missingSapins: typeof sapins = []; 
	await Promise.all(
		sapins.map(async (s) => {
			const dateAdded = s.DateAdded
				? DateTime.fromISO(s.DateAdded).toUTC().toFormat("yyyy-MM-dd HH:mm:ss")
				: null;
			const result = (await db.query(updateSql(s.SAPIN, dateAdded))) as ResultSetHeader;
			if (result.affectedRows === 0)
				missingSapins.push(s);
		})
	);
	const sql = 
		missingSapins.map(s => {
			const dateAdded = s!.DateAdded
				? DateTime.fromISO(s!.DateAdded).toUTC().toFormat("yyyy-MM-dd HH:mm:ss")
				: null;
			return insertSql(s.SAPIN, dateAdded, s.MemberID);
		}).join("; ");
	await db.query(sql);
}

async function uploadDatabaseMemberEmails(buffer: Buffer) {
	const emails = await parseEmailsSpreadsheet(buffer);
	const entities: Record<number, ContactEmail[]> = {};
	for (const entry of emails) {
		const memberId = entry.MemberID!;
		delete entry.MemberID;
		if (!entities[memberId]) {
			entities[memberId] = [];
		}
		const contactEmails = entities[memberId];
		contactEmails.push({...entry, id: contactEmails.length});
	}
	const sql =
		"UPDATE members SET ContactEmails=JSON_ARRAY(); " +
		Object.entries(entities)
			.map(([memberId, contactEmails]) => db.format(
					"UPDATE members SET ContactEmails=? WHERE MemberID=?",
					[JSON.stringify(contactEmails), memberId]
				))
			.join("; ");
	await db.query(sql);
}

async function uploadDatabaseMemberHistory(buffer: Buffer) {
	const histories = await parseHistorySpreadsheet(buffer);
	const entities: Record<number, StatusChangeEntry[]> = {};
	for (const h of histories) {
		const memberId = h.MemberID!;
		delete h.MemberID;
		if (!entities[memberId]) {
			entities[memberId] = [];
		}
		const history = entities[memberId];
		history.push({...h, id: history.length});
	}
	const sql =
		"UPDATE members SET StatusChangeHistory=JSON_ARRAY(); " +
		Object.entries(entities)
			.map(([memberId, history]) => db.format(
					"UPDATE members SET StatusChangeHistory=? WHERE MemberID=?",
					[JSON.stringify(history.reverse()), memberId]
				))
			.join("; ");
	await db.query(sql);
}

const uploadFormats = ["members", "sapins", "emails", "history"] as const;
type UploadFormat = (typeof uploadFormats)[number];

function isUploadFormat(format: any): format is UploadFormat {
	return uploadFormats.includes(format);
}

export async function uploadMembers(format: string, file: { buffer: Buffer }) {
	format = format.toLocaleLowerCase();
	if (!isUploadFormat(format))
		throw new TypeError(
			"Invalid format; expected one of " + uploadFormats.join(", ")
		);

	if (format === "members") await uploadDatabaseMembers(file.buffer);
	else if (format === "sapins") await uploadDatabaseMemberSAPINs(file.buffer);
	else if (format === "emails") await uploadDatabaseMemberEmails(file.buffer);
	else if (format === "history")
		await uploadDatabaseMemberHistory(file.buffer);
	else throw new Error("Type checking error");

	return getMembers();
}

export async function importMyProjectRoster(file: { buffer: Buffer }) {
	let roster = await parseMyProjectRosterSpreadsheet(file.buffer);
	let members = roster
		.filter(
			(u) =>
				typeof u.SAPIN === "number" &&
				u.SAPIN > 0 &&
				!u.Status.search(/^Voter|^Potential|^Aspirant|^Non-Voter/)
		)
		.map((u) => ({
			SAPIN: u.SAPIN,
			Name: u.Name,
			LastName: u.LastName,
			FirstName: u.FirstName,
			MI: u.MI,
			Status: u.Status,
			Email: u.Email,
			Affiliation: u.Affiliation,
			Employer: u.Employer,
		}));
	const insertKeys = Object.keys(members[0]);
	const updateKeys = insertKeys.filter(
		(k) => k !== "SAPIN" && k !== "Status"
	);
	const sql =
		`INSERT INTO members (${insertKeys}) VALUES ` +
		members.map((m) => "(" + db.escape(Object.values(m)) + ")").join(", ") +
		" ON DUPLICATE KEY UPDATE " +
		updateKeys.map((k) => k + "=VALUES(" + k + ")") +
		";";
	await db.query(sql);

	return getMembers();
}

export async function exportMyProjectRoster(user: User, res: Response) {
	const members = await getMembers({Status: ["Voter", "Aspirant", "Potential Voter", "Non-Voter"]});
	return genMyProjectRosterSpreadsheet(user, members, res);
}
