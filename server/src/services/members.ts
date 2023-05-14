import { DateTime } from 'luxon';

import db from '../utils/database';
import type { OkPacket } from 'mysql2';

import { userIsSubgroupAdmin, User } from './users';
import type { Response } from 'express';

import {
	parseMyProjectRosterSpreadsheet,
	genMyProjectRosterSpreadsheet
} from './myProjectSpreadsheets';

import {
	parseMembersSpreadsheet,
	parseSAPINsSpreadsheet,
	parseEmailsSpreadsheet,
	parseHistorySpreadsheet
} from './membersSpreadsheets';

import { NotFoundError } from '../utils';

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
}

export type MemberBasic = Pick<Member, 
	"SAPIN" |
	"Name" |
	"FirstName" |
	"MI" |
	"LastName" |
	"Email" |
	"Affiliation" |
	"Employer" |
	"Status" |
	"StatusChangeOverride" |
	"StatusChangeDate" |
	"MemberID" |
	"ContactInfo"
>

export type StatusChangeEntry = {
	id: number;
	Date: string | null;
	OldStatus: string;
	NewStatus: string;
	Reason: string;
}

export type ContactEmail = {
	id: number;
	Email: string;
	DateAdded: string | null;
	Primary: boolean;
	Broken: boolean;
}

export type ContactInfo = {
	StreetLine1: string;
	StreetLine2: string;
	City: string;
	State: string;
	Zip: string;
	Country: string;
	Phone: string;
	Fax: string;
}

type MemberDB = Omit<Member, "ContactInfo" | "ContactEmails" | "StatusChangeHistory"> & {
	ContactInfo: string;
	ContactEmails: string;
	StatusChangeHistory: string;
}

function selectMembersSql({sapins}: {sapins?: number[]}) {
	let sql =
		'SELECT ' +
			'm.SAPIN, ' +
			'MemberID, ' +
			'Name, ' +
			'FirstName, MI, LastName, ' +
			'Email, ' +
			'Affiliation, ' +
			'Employer, ' +
			'Status, ' +
			'DATE_FORMAT(StatusChangeDate, "%Y-%m-%dT%TZ") AS StatusChangeDate, ' +
			'StatusChangeOverride, ' +
			'ReplacedBySAPIN, ' +
			'DATE_FORMAT(DateAdded, "%Y-%m-%dT%TZ") AS DateAdded, ' +
			'Notes, ' +
			'Access, ' +
			'ContactInfo, ' +
			'ContactEmails, ' +
			'StatusChangeHistory, ' +
			'COALESCE(ObsoleteSAPINs, JSON_ARRAY()) AS ObsoleteSAPINs, ' +
			'COALESCE(Permissions, JSON_ARRAY()) AS Permissions ' +
		'FROM members m ' +
			'LEFT JOIN (SELECT ReplacedBySAPIN AS SAPIN, JSON_ARRAYAGG(SAPIN) AS ObsoleteSAPINs FROM members WHERE Status="Obsolete" GROUP BY ReplacedBySAPIN) AS o ON m.SAPIN=o.SAPIN ' +
			'LEFT JOIN (SELECT SAPIN, JSON_ARRAYAGG(scope) AS Permissions FROM permissions GROUP BY SAPIN) AS p ON m.SAPIN=p.SAPIN';

	let wheres: string[] = [];
	if (sapins)
		wheres.push(db.format('m.SAPIN IN (?)', [sapins]));

	if (wheres.length > 0)
		sql += ' WHERE ' + wheres.join(' AND ');

	return sql;
}

/*
 * A detailed list of members
 */
export async function getMembers(sapins?: number[]) {
	const sql = selectMembersSql({sapins});
	const members = await db.query({sql, dateStrings: true}) as Member[];
	return members;
}

export async function getMember(sapin: number) {
	const members: (Member | undefined)[] = await getMembers([sapin]);
	return members[0];
}

export type UserMember = {
	SAPIN: number;
	Name: string;
	Status: string;
	Email?: string;
	Access?: number;
	Permissions?: string[];
}

/*
 * A list of members is available to any user with access level Member or higher
 * (for reassigning comments, etc.). We only care about members with status.
 */
export function selectUsers(user: User) {
	let sql = 'SELECT m.SAPIN, Name, Status ';
	
	if (userIsSubgroupAdmin(user)) {
		sql += 
			', Email, Access, COALESCE(Permissions, JSON_ARRAY()) AS Permissions ' +
			'FROM members m ' +
				'LEFT JOIN (SELECT SAPIN, JSON_ARRAYAGG(scope) AS Permissions FROM permissions GROUP BY SAPIN) AS p ON m.SAPIN=p.SAPIN';
	}
	else {
		sql +=
			'FROM members m'; 
	}
	sql += ' WHERE Status IN ("Aspirant", "Potential Voter", "Voter", "ExOfficio")';

	return db.query(sql) as Promise<UserMember[]>;
}

/*
 * Get a snapshot of the members and their status at a specific date 
 * by walking through the status change history.
 */
export async function getMembersSnapshot(date: string | Date) {
	let members = await getMembers();
	date = new Date(date);
	//console.log(date.toISOString().substr(0,10));
	members = members
		.filter(m => m.DateAdded && m.DateAdded < date)
		.map(m => {
			//m.StatusChangeHistory.forEach(h => h.Date = new Date(h.Date));
			let history = m.StatusChangeHistory
				.map(h => ({...h, Date: new Date(h.Date || '')}))
				.sort((h1, h2) => h2.Date.valueOf() - h1.Date.valueOf());
			let status = m.Status;
			//console.log(`${m.SAPIN}:`)
			for (const h of history) {
				//console.log(`${h.Date.toISOString().substr(0,10)} ${h.OldStatus} -> ${h.NewStatus}`)
				if (h.Date > date && h.OldStatus && h.NewStatus) {
					if (status !== h.NewStatus)
						console.warn(`${m.SAPIN}: Status mismatch; status=${status} but new status=${h.NewStatus}`);
					status = h.OldStatus;
					//console.log(`status=${status}`)
				}
			}
			//console.log(`final Status=${status}`)
			return {
				...m,
				Status: status
			}
		});

	//console.log(members);
	return members
}

const Status = {
	'Non-Voter': 'Non-Voter',
	'Aspirant': 'Aspirant',
	'Potential Voter': 'Potential Voter',
	'Voter': 'Voter',
	'ExOfficio': 'ExOfficio',
	'Obsolete': 'Obsolete'
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
		Notes: m.Notes
	};

	if (m.StatusChangeDate !== undefined) {
		const date = DateTime.fromISO(m.StatusChangeDate || '');
		entry.StatusChangeDate = date.isValid? date.toUTC().toFormat('yyyy-MM-dd HH:mm:ss'): null;
	}

	if (m.DateAdded !== undefined) {
		const date = DateTime.fromISO(m.DateAdded || '');
		entry.DateAdded = date.isValid? date.toUTC().toFormat('yyyy-MM-dd HH:mm:ss'): null;
	}

	if (m.ContactInfo !== undefined)
		entry.ContactInfo = JSON.stringify(m.ContactInfo)

	if (m.ContactEmails !== undefined)
		entry.ContactEmails = JSON.stringify(m.ContactEmails)

	if (m.StatusChangeHistory !== undefined)
		entry.StatusChangeHistory = JSON.stringify(m.StatusChangeHistory)

	for (const key of Object.keys(entry)) {
		if (entry[key] === undefined)
			delete entry[key]
	}

	if (entry.Status && Status[entry.Status] === undefined)
		entry.Status = Object.keys(Status)[0];

	return entry;
}

function replaceMemberPermissions(sapin: number, permissions: string[]): Promise<any> {
	let sql = db.format('DELETE FROM permissions WHERE SAPIN=?;', [sapin]);
	if (permissions.length > 0)
		sql += 'INSERT INTO permissions (SAPIN, scope) VALUES ' +
			permissions.map(scope => db.format('(?, ?)', [sapin, scope])).join(', ') + ';';
	return db.query(sql);
}

async function addMember(member: Member) {

	if (!member.SAPIN)
		throw new TypeError('Must provide SAPIN');

	if (!member.DateAdded)
		member.DateAdded = DateTime.now().toISO();

	const entry = memberEntry(member);

	await db.query({sql: 'INSERT INTO members SET ?;', dateStrings: true}, [entry]);

	if (Array.isArray(member.Permissions))
		await replaceMemberPermissions(member.SAPIN, member.Permissions);

	return getMember(entry.SAPIN!);
}

export async function addMembers(members: Member[]) {
	return await Promise.all(members.map(addMember));
}

export async function updateMemberStatusChange(sapin: number, statusChangeEntry: StatusChangeEntry) {
	const member = await getMember(sapin);
	if (!member)
		throw new NotFoundError(`Member with SAPIN=${sapin} does not exist`);

	const history = member.StatusChangeHistory.map(h => h.id === statusChangeEntry.id? {...h, ...statusChangeEntry}: h);
	await db.query(
		'UPDATE members SET ' + 
			'StatusChangeHistory=? ' +
		'WHERE SAPIN=?;', 
		[JSON.stringify(history), sapin]
	);
	return (await getMember(sapin))!;
}

export async function deleteMemberStatusChange(sapin: number, statusChangeId: number) {
	const member = await getMember(sapin);
	if (!member)
		throw new NotFoundError(`Member with SAPIN=${sapin} does not exist`);

	const history = member.StatusChangeHistory.filter(h => h.id !== statusChangeId);
	await db.query(
		'UPDATE members SET ' + 
			'StatusChangeHistory=? ' +
		'WHERE SAPIN=?;', 
		[JSON.stringify(history), sapin]
	);
	return (await getMember(sapin))!;
}

export async function updateMemberContactEmail(sapin: number, entry: Partial<ContactEmail>) {
	const member = await getMember(sapin);
	if (!member)
		throw new NotFoundError(`Member with SAPIN=${sapin} does not exist`);

	const emails = member.ContactEmails.map(h => h.id === entry.id? {...h, ...entry}: h);
	await db.query(
		'UPDATE members SET ' + 
			'ContactEmails=? ' +
		'WHERE SAPIN=?;', 
		[JSON.stringify(emails), sapin]
	);
	return (await getMember(sapin))!;
}

export async function addMemberContactEmail(sapin: number, entry: Omit<ContactEmail, "id" | "DateAdded"> & { DateAdded?: string }) {
	const member = await getMember(sapin);
	if (!member)
		throw new NotFoundError(`Member with SAPIN=${sapin} does not exist`);

	const id = member.ContactEmails.reduce((maxId, h) => h.id > maxId? h.id: maxId, 0) + 1;
	const emails = member.ContactEmails.slice();
	emails.unshift({id, DateAdded: DateTime.now().toISO(), ...entry});
	await db.query(
		'UPDATE members SET ' + 
			'ContactEmails=? ' +
		'WHERE SAPIN=?;', 
		[JSON.stringify(emails), sapin]
	);
	return (await getMember(sapin))!;
}

export async function deleteMemberContactEmail(sapin: number, entry: Pick<ContactEmail, "id">) {
	const member = await getMember(sapin);
	if (!member)
		throw new NotFoundError(`Member with SAPIN=${sapin} does not exist`);

	const emails = member.ContactEmails.filter(h => h.id !== entry.id);
	await db.query(
		'UPDATE members SET ' + 
			'ContactEmails=? ' +
		'WHERE SAPIN=?;', 
		[JSON.stringify(emails), sapin]
	);
	return (await getMember(sapin))!;
}

async function updateMemberStatus(member: Member, status: string, reason: string) {
	const date = DateTime.now();
	const id = member.StatusChangeHistory.reduce((maxId, h) => h.id > maxId? h.id: maxId, 0) + 1;
	const historyEntry = {
		id,
		Date: date.toUTC().toISO(),
		OldStatus: member.Status,
		NewStatus: status,
		Reason: reason
	};
	const replacedBySAPIN = (member.Status === 'Obsolete' && status !== 'Obsolete')? null: member.ReplacedBySAPIN;
	await db.query({sql:
		'UPDATE members SET ' + 
			'Status=?, ' + 
			'StatusChangeDate=?, ' +
			'StatusChangeHistory=JSON_ARRAY_INSERT(StatusChangeHistory, \'$[0]\', CAST(? AS JSON)), ' +
			'ReplacedBySAPIN=? ' +
		'WHERE SAPIN=?;', dateStrings: true}, 
		[status, date.toUTC().toFormat('yyyy-MM-dd HH:mm:ss'), JSON.stringify(historyEntry), replacedBySAPIN, member.SAPIN]
	);
}

export async function updateMember(sapin: number, changes: Partial<Member> & { StatusChangeReason?: string } ) {
	const p: Promise<any>[] = [];
	const {Status, StatusChangeReason, Permissions, ...changesRest} = changes;

	/* If the member status changes, then update the status change history */
	const member = await getMember(sapin);
	if (!member)
		throw new NotFoundError(`Member with SAPIN=${sapin} does not exist`);

	if (Status && Status !== member.Status)
		p.push(updateMemberStatus(member, Status, StatusChangeReason || ''));

	const entry = memberEntry(changesRest);
	if (Object.keys(entry).length)
		p.push(db.query({sql: 'UPDATE members SET ? WHERE SAPIN=?;', dateStrings: true},  [entry, sapin]));

	if (Permissions)
		p.push(replaceMemberPermissions(sapin, Permissions));

	if (p.length)
		await Promise.all(p);

	return (await getMember(sapin))!;
}

type Update<T> = {
	id: number;
	changes: Partial<T>;
}
export async function updateMembers(updates: Update<Member>[]) {
	// Validate request
	for (const u of updates) {
		if (typeof u !== 'object' || !u.id || typeof u.changes !== 'object')
			throw new TypeError('Expected array of objects with shape {id, changes}');
	}
	const newMembers = await Promise.all(updates.map(u => updateMember(u.id, u.changes)));
	return newMembers;
}

/*
 * Update existing member details (Name, Email, Affiliation) and insert as new members
 */
/*export async function upsertMembers(attendees: Member[]) {

	const sapins = Object.keys(attendees).map(sapin => Number(sapin));
	const existing = await db.query('SELECT * FROM members WHERE SAPIN IN (?)', [sapins]) as Member[];
	const insert = {...attendees};
	const update: Record<number, Partial<Member>> = {};
	for (const m of existing) {
		const i = insert[m.SAPIN];
		if (i) {
			delete insert[m.SAPIN];
			const memberUpdate: Partial<Member> = {};
			if (m.Name !== i.Name)
				memberUpdate.Name = i.Name;
			if (m.Email !== i.Email)
				memberUpdate.Email = i.Email;
			if (m.Affiliation !== i.Affiliation)
				memberUpdate.Affiliation = i.Affiliation;
			if (Object.keys(memberUpdate).length > 0) {
				update[m.id] = memberUpdate;
			}
		}
	}

	for (const i of Object.values(insert)) {
		i.Status = 'Non-Voter';
		i.DataAdded = new Date();
		i.StatusChangeHistory = [{
			Date: i.DateAdded,
			OldStatus: '',
			NewStatus: i.Status,
			Reason: 'New attendee'
		}];
		i.ContactEmails = [{
			Email: i.Email,
			Primary: 1,
			Broken: 0,
			DateAdded: i.DateAdded
		}];
	}
	console.log(update)

	let sql = '';
	if (Object.entries(update).length > 0)
		sql += Object.entries(update).map(
			([id, m]) => db.format('UPDATE members SET ? WHERE id=?;', [memberEntry(m), id])
		).join('');
	if (Object.values(insert).length > 0)
		sql += Object.values(insert).map(
			m => db.format('INSERT members SET ?;', [memberEntry(m)])
		).join(' ');
	if (sql)
		await db.query(sql);

	return getMembersWithParticipation(sapins);
}*/

export async function deleteMembers(ids: number[]) {
	if (ids.length > 0) {
		const result = await db.query('DELETE FROM members WHERE SAPIN IN (?)', [ids]) as OkPacket;
		return result.affectedRows;
	}
	return 0;
}

async function uploadDatabaseMembers(buffer: Buffer) {
	let members = (await parseMembersSpreadsheet(buffer))
		.filter(m => m.SAPIN > 0)
		.map(memberEntry);

	const sql =
		'DELETE FROM members; ' +
		db.format('INSERT INTO members (??) VALUES ', [Object.keys(members[0])]) +
		members.map(u => '(' + db.escape(Object.values(u)) + ')').join(', ') +
		';';

	await db.query({sql, dateStrings: true});
}

async function uploadDatabaseMemberSAPINs(buffer: Buffer) {
	const sapins = await parseSAPINsSpreadsheet(buffer);

	const members = await db.query('SELECT MemberID, SAPIN, ReplacedBySAPIN, Status FROM members;') as Pick<Member, "MemberID" | "SAPIN" | "ReplacedBySAPIN" | "Status">[];

	let sql = '';
	for (const s of sapins) {
		/* Find member with indexed MemberID */
		const m1 = members.find(m => m.MemberID === s.MemberID);
		if (m1) {
			if (m1.SAPIN === s.SAPIN) {
				const dateAdded = s.DateAdded? DateTime.fromISO(s.DateAdded).toUTC().toFormat('yyyy-MM-dd HH:mm:ss'): null;
				sql += db.format(
						'UPDATE members SET DateAdded=? WHERE MemberID=?;',
						[dateAdded, m1.MemberID]
					);
			}
			else {
				const m2 = members.find(m => m.SAPIN === s.SAPIN);
				if (m2) {
					if (m2.MemberID !== s.MemberID) {
						sql += db.format(
								'UPDATE members SET Status="Obsolete", ReplacedBySAPIN=? WHERE MemberID=?;',
								[m1.SAPIN, m2.MemberID]
							);
					}
				}
				else {
					const entry = {
						SAPIN: s.SAPIN,
						ReplacedBySAPIN: m1.SAPIN,
						Status: 'Obsolete',
						Notes: 'Replaced by SAPIN=' + m1.SAPIN,
						DateAdded: s.DateAdded? DateTime.fromISO(s.DateAdded).toUTC().toFormat('yyyy-MM-dd HH:mm:ss'): null
					}
					sql += db.format('INSERT INTO members SET ?;', [entry])
				}
			}
		}
	}

	await db.query({sql, dateStrings: true});
}

async function uploadDatabaseMemberEmails(buffer: Buffer) {
	const emailsArray = await parseEmailsSpreadsheet(buffer);
	const emailsObj: Record<number, Omit<ContactEmail, "id">[]> = {};
	for (const entry of emailsArray) {
		const memberId = entry.MemberID!;
		delete entry.MemberID;
		if (!emailsObj[memberId])
			emailsObj[memberId] = [];
		emailsObj[memberId].push(entry);
	}
	const sql =
		'UPDATE members SET ContactEmails=JSON_ARRAY(); ' +
		Object.entries(emailsObj).map(([memberId, memberEmails]) => {
			const emails = memberEmails.map((entry, i) => ({id: i+1, ...entry}))	// Insert id for each entry
			return db.format(
				'UPDATE members SET ' +
					'ContactEmails=? ' +
				'WHERE MemberID=?; ',
				[JSON.stringify(emails), memberId]
			);
		}).join('');
	await db.query(sql);
}

async function uploadDatabaseMemberHistory(buffer: Buffer) {
	const historyArray = await parseHistorySpreadsheet(buffer);
	const historyObj: Record<number, Omit<StatusChangeEntry, "id">[]> = {};
	for (const h of historyArray) {
		const memberId = h.MemberID!;
		delete h.MemberID;
		if (!historyObj[memberId])
			historyObj[memberId] = [];
		historyObj[memberId].push(h);
	}
	const sql =
		'UPDATE members SET StatusChangeHistory=JSON_ARRAY(); ' +
		Object.entries(historyObj).map(([memberId, h1]) => {
			const h2 = h1
				.map((entry, i) => ({id: i+1, ...entry}))	// Insert id for each entry
				.reverse()									// Latest first
			return db.format(
				'UPDATE members SET ' +
					'StatusChangeHistory=? ' +
				'WHERE MemberID=?; ',
				[JSON.stringify(h2), memberId]
			);
		}).join('');
	await db.query(sql);
}

const uploadFormats = ['members', 'sapins', 'emails', 'history'] as const;
type UploadFormat = typeof uploadFormats[number];

function isUploadFormat(format: any): format is UploadFormat {
	return uploadFormats.includes(format);
}

export async function uploadMembers(format: string, file: {buffer: Buffer}) {

	format = format.toLocaleLowerCase();
	if (!isUploadFormat(format))
		throw new TypeError("Invalid format; expected one of " + uploadFormats.join(', '));

	if (format === 'members')
		await uploadDatabaseMembers(file.buffer);
	else if (format === 'sapins')
		await uploadDatabaseMemberSAPINs(file.buffer);
	else if (format === 'emails')
		await uploadDatabaseMemberEmails(file.buffer);
	else if (format === 'history')
		await uploadDatabaseMemberHistory(file.buffer);
	else
		throw new Error("Type checking error");

	return getMembers();
}

export async function importMyProjectRoster(file: {buffer: Buffer}) {
	let roster = await parseMyProjectRosterSpreadsheet(file.buffer);
	let members = roster
		.filter(u => 
			typeof u.SAPIN === 'number' && u.SAPIN > 0 &&
			!u.Status.search(/^Voter|^Potential|^Aspirant|^Non-Voter/)
		)
		.map(u => ({
			SAPIN: u.SAPIN,
			Name: u.Name,
			LastName: u.LastName,
			FirstName: u.FirstName,
			MI: u.MI,
			Status: u.Status,
			Email: u.Email,
			Affiliation: u.Affiliation,
			Employer: u.Employer
		}));
	const insertKeys = Object.keys(members[0]);
	const updateKeys = insertKeys.filter(k => k !== 'SAPIN' && k !== 'Status');
	const sql =
		`INSERT INTO members (${insertKeys}) VALUES ` +
		members.map(m => '(' + db.escape(Object.values(m)) + ')').join(', ') +
		' ON DUPLICATE KEY UPDATE ' +
		updateKeys.map(k => k + '=VALUES(' + k + ')') +
		';';
	await db.query(sql);

	return getMembers();
}

export async function exportMyProjectRoster(res: Response) {
	let members = await getMembers();
	members = members.filter(m => !m.Status.search(/^Voter|^Aspirant|^Potential Voter|^Non-Voter/));
	await genMyProjectRosterSpreadsheet(members, res);
	res.end();
}
