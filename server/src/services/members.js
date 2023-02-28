import {DateTime} from 'luxon';

import db from '../utils/database';

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

import {
	getRecentSessionsWithAttendees,
	upsertMemberAttendanceSummaries
} from './sessions';

import {getRecentBallotSeriesWithResults} from './ballots';

import {updateVoter} from './voters';


function selectMembersSql({sapins}) {
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

	let wheres = [];
	if (sapins)
		wheres.push(db.format('m.SAPIN IN (?)', [sapins]));

	if (wheres.length > 0)
		sql += ' WHERE ' + wheres.join(' AND ');

	return sql;
}

/*
 * A detailed list of members
 */
export async function getMembers(sapins) {
	/*const sql =
		selectMembersSql({sapins}) + '; ' +
		'SELECT SAPIN FROM members WHERE Status="Obsolete"' + 
			(sapins? db.format(' AND ReplacedBySAPIN IN (?);', [sapins]): ';');
	const [members, obsoleteMembers] = await db.query({sql, dateStrings: true});

	// For each member, generate a list of obsolete SAPINs
	members.forEach(m => m.ObsoleteSAPINs = []);
	obsoleteMembers.forEach(o => {
		const u = members.find(m => m.SAPIN === o.ReplacedBySAPIN);
		if (u)
			u.ObsoleteSAPINs.push(o.SAPIN);
	});*/
	const sql = selectMembersSql({sapins});
	const members = await db.query({sql, dateStrings: true});

	return members;
}

export async function getMember(sapin) {
	const members = await getMembers([sapin]);
	return members[0];
}

function getMemberAttendances(m, sessions) {
	const sapins = [m.SAPIN].concat(m.ObsoleteSAPINs);
	const attendances = sessions
		.map(s => {
			// Find the attendee entry (if any) for one of the SAPINs in the sapins array
			// The order in which we do the SAPIN search is important; primary SAPIN first and then the obsolete ones.
			let a = sapins.reduce((attendee, sapin) => attendee || s.attendees.find(a => a.SAPIN === sapin), undefined);
			return {
				id: a? a.id: null,
				session_id: s.id,
				type: s.type,
				startDate: s.startDate,
				SAPIN: a? a.SAPIN: m.SAPIN,
				AttendancePercentage: a? a.AttendancePercentage: 0,
				DidAttend: a? a.DidAttend: 0,
				DidNotAttend: a? a.DidNotAttend: 0,
				Notes: a? a.Notes: ''
			};
		});

	return {...m, Attendances: attendances}
}

function getMemberBallotSeriesParticipation(m, ballotSeries) {

	let BallotSeriesParticipation = [];

	const sapins = [m.SAPIN].concat(m.ObsoleteSAPINs);
	for (const ballots of ballotSeries) {
		// Ignore if members last status change occured after the ballot series started
		if (ballots[0].Start < m.StatusChangeDate)
			continue;
		// Find voting pool entry
		let v = sapins.reduce((voter, sapin) => voter || ballots[0].Voters.find(v => v.SAPIN === sapin), undefined);
		if (v) {
			// Member in voting pool, therefore counts toward maintaining voting rights
			const summary = {
				BallotIDs: ballots.map(b => b.BallotID).join(', '),
				VotingPoolID: ballots[0].VotingPoolID,
				Start: ballots[0].Start,
				End: ballots[ballots.length-1].End,
				Project: ballots[0].Project,
				Excused: v.Excused,
				SAPIN: null,
				BallotID: null,
				Vote: null,
				CommentCount: null,
			};
			// Find last vote
			for (const b of ballots.slice().reverse()) {
				let r = sapins.reduce((result, sapin) => result || b.Results.find(r => r.SAPIN === sapin), undefined);
				if (r) {
					summary.SAPIN = r.SAPIN;
					summary.BallotID = b.BallotID;
					summary.Vote = r.Vote;
					summary.CommentCount = r.CommentCount;
					break;
				}
			}
			BallotSeriesParticipation.push(summary);
		}
	}

	return {...m, BallotSeriesParticipation};
}

export async function getMembersWithParticipation(sapins) {
	const sessions = (await getRecentSessionsWithAttendees()).reverse(); // Newest to oldest
	const ballotSeries = await getRecentBallotSeriesWithResults();
	let members = (await getMembers(sapins))
		.map(m => getMemberAttendances(m, sessions))
		.map(m => getMemberBallotSeriesParticipation(m, ballotSeries));
	return members;
}

async function getMemberWithParticipation(sapin) {
	const members = await getMembersWithParticipation([sapin]);
	return members[0];
}

/*
 * Get a snapshot of the members and their status at a specific date 
 * by walking through the status change history.
 */
export async function getMembersSnapshot(date) {
	let members = await getMembers();
	date = new Date(date);
	//console.log(date.toISOString().substr(0,10));
	members = members
		.filter(m => m.DateAdded < date)
		.map(m => {
			m.StatusChangeHistory.forEach(h => h.Date = new Date(h.Date));
			let history = m.StatusChangeHistory.sort((h1, h2) => h2.Date - h1.Date);
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

function memberEntry(m) {
	const entry = {
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
		const date = DateTime.fromISO(m.StatusChangeDate);
		entry.StatusChangeDate = date.isValid? date.toUTC().toFormat('yyyy-MM-dd HH:mm:ss'): null;
	}

	if (m.DateAdded !== undefined) {
		const date = DateTime.fromISO(m.DateAdded);
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

function replaceMemberPermissions(sapin, permissions) {
	let sql = db.format('DELETE FROM permissions WHERE SAPIN=?;', [sapin]);
	if (permissions.length > 0)
		sql += 'INSERT INTO permissions (SAPIN, scope) VALUES ' +
			permissions.map(scope => db.format('(?, ?)', [sapin, scope])).join(', ') + ';';
	return db.query(sql);
}

async function addMember(member) {

	if (!member.SAPIN)
		throw new TypeError('Must provide SAPIN');

	if (!member.DateAdded)
		member.DateAdded = DateTime.now().toISO();

	const entry = memberEntry(member);

	await db.query({sql: 'INSERT INTO members SET ?;', dateStrings: true}, [entry]);

	if (Array.isArray(member.Permissions))
		await replaceMemberPermissions(member.SAPIN, member.Permissions);

	return await getMemberWithParticipation(entry.SAPIN);
}

export async function addMembers(members) {
	return await Promise.all(members.map(addMember));
}

export async function updateMemberStatusChange(sapin, statusChangeEntry) {
	const member = await getMember(sapin);
	const history = member.StatusChangeHistory.map(h => h.id === statusChangeEntry.id? {...h, ...statusChangeEntry}: h);
	await db.query(
		'UPDATE members SET ' + 
			'StatusChangeHistory=? ' +
		'WHERE SAPIN=?;', 
		[JSON.stringify(history), sapin]
	);
	return await getMemberWithParticipation(sapin);
}

export async function deleteMemberStatusChange(sapin, statusChangeId) {
	const member = await getMember(sapin);
	const history = member.StatusChangeHistory.filter(h => h.id !== statusChangeId);
	await db.query(
		'UPDATE members SET ' + 
			'StatusChangeHistory=? ' +
		'WHERE SAPIN=?;', 
		[JSON.stringify(history), sapin]
	);
	return await getMemberWithParticipation(sapin);
}

export async function updateMemberContactEmail(sapin, entry) {
	const member = await getMember(sapin);
	const emails = member.ContactEmails.map(h => h.id === entry.id? {...h, ...entry}: h);
	await db.query(
		'UPDATE members SET ' + 
			'ContactEmails=? ' +
		'WHERE SAPIN=?;', 
		[JSON.stringify(emails), sapin]
	);
	return await getMemberWithParticipation(sapin);
}

export async function addMemberContactEmail(sapin, entry) {
	const member = await getMember(sapin);
	const id = member.ContactEmails.reduce((maxId, h) => h.id > maxId? h.id: maxId, 0) + 1;
	const emails = member.ContactEmails.slice();
	emails.unshift({id, DateAdded: new Date(), ...entry});
	await db.query(
		'UPDATE members SET ' + 
			'ContactEmails=? ' +
		'WHERE SAPIN=?;', 
		[JSON.stringify(emails), sapin]
	);
	return await getMemberWithParticipation(sapin);
}

export async function deleteMemberContactEmail(sapin, entry) {
	const member = await getMember(sapin);
	const emails = member.ContactEmails.filter(h => h.id !== entry.id);
	await db.query(
		'UPDATE members SET ' + 
			'ContactEmails=? ' +
		'WHERE SAPIN=?;', 
		[JSON.stringify(emails), sapin]
	);
	return await getMemberWithParticipation(sapin);
}

async function updateMemberStatus(member, status, reason) {
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

export async function updateMember(sapin, changes) {
	const p = [];
	const {Attendances, BallotSeriesParticipation, Status, StatusChangeReason, Permissions, ...changesRest} = changes;

	if (Attendances && Attendances.length)
		p.push(upsertMemberAttendanceSummaries(sapin, Attendances));

	if (BallotSeriesParticipation && BallotSeriesParticipation.length > 0) {
		for (let summary of BallotSeriesParticipation)
			p.push(updateVoter(summary.VotingPoolID, sapin, {Excused: summary.Excused}));
	}

	/* If the member status changes, then update the status change history */
	const member = await getMember(sapin);
	if (Status && Status !== member.Status)
		p.push(updateMemberStatus(member, Status, StatusChangeReason || ''));

	const entry = memberEntry(changesRest);
	if (Object.keys(entry).length)
		p.push(db.query({sql: 'UPDATE members SET ? WHERE SAPIN=?;', dateStrings: true},  [entry, sapin]));

	if (Permissions)
		p.push(replaceMemberPermissions(sapin, Permissions));

	if (p.length)
		await Promise.all(p);

	return getMemberWithParticipation(sapin);
}

export async function updateMembers(updates) {
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
export async function upsertMembers(attendees) {

	const sapins = Object.keys(attendees);
	const existing = await db.query('SELECT * FROM members WHERE SAPIN IN (?)', [sapins]);
	const insert = {...attendees};
	const update = {};
	for (const m of existing) {
		const i = insert[m.SAPIN];
		if (i) {
			delete insert[m.SAPIN];
			const memberUpdate = {};
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

	const sql = '';
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
}

export async function deleteMembers(ids) {
	if (ids.length > 0) {
		const result = await db.query('DELETE FROM members WHERE SAPIN IN (?)', [ids]);
		return result.affectedRows;
	}
	return 0;
}


async function uploadDatabaseMembers(buffer) {
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

async function uploadDatabaseMemberSAPINs(buffer) {
	const sapins = await parseSAPINsSpreadsheet(buffer);

	const members = await db.query('SELECT MemberID, SAPIN, ReplacedBySAPIN, Status FROM members;');

	let sql = '';
	for (const s of sapins) {
		/* Find member with indexed MemberID */
		const m1 = members.find(m => m.MemberID === s.MemberID);
		if (m1) {
			if (m1.SAPIN === s.SAPIN) {
				sql += db.format(
						'UPDATE members SET DateAdded=? WHERE MemberID=?;',
						[DateTime.fromISO(s.DateAdded).toUTC().toFormat('yyyy-MM-dd HH:mm:ss'), m1.MemberID]
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
						DateAdded: DateTime.fromISO(s.DateAdded).toUTC().toFormat('yyyy-MM-dd HH:mm:ss')
					}
					sql += db.format('INSERT INTO members SET ?;', [entry])
				}
			}
		}
	}

	await db.query({sql, dateStrings: true});
}

async function uploadDatabaseMemberEmails(buffer) {
	const emailsArray = await parseEmailsSpreadsheet(buffer);
	const emailsObj = {};
	for (const entry of emailsArray) {
		const memberId = entry.MemberID;
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

async function uploadDatabaseMemberHistory(buffer) {
	const historyArray = await parseHistorySpreadsheet(buffer);
	const historyObj = {};
	for (const h of historyArray) {
		const memberId = h.MemberID;
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

export const UploadFormat = {
	Members: 'members',
	SAPINs: 'sapins',
	Emails: 'emails',
	History: 'history'
};

export async function uploadMembers(format, file) {

	let roster = [], members = [], sapins = [], emails = [], history = [];
	switch (format) {
		case UploadFormat.Members:
			await uploadDatabaseMembers(file.buffer);
			break;
		case UploadFormat.SAPINs:
			await uploadDatabaseMemberSAPINs(file.buffer);
			break;
		case UploadFormat.Emails:
			await uploadDatabaseMemberEmails(file.buffer);
			break;
		case UploadFormat.History:
			await uploadDatabaseMemberHistory(file.buffer);
			break;
		default:
			throw `Unknown format: ${format}. Extected: ${Object.values(UploadFormat)}.`
	}

	return getMembersWithParticipation();
}

export async function importMyProjectRoster(file) {
	let roster = await parseMyProjectRosterSpreadsheet(file.buffer);
	roster = roster
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
	const insertKeys = Object.keys(roster[0]);
	const updateKeys = insertKeys.filter(k => k !== 'SAPIN' && k !== 'Status');
	const sql =
		`INSERT INTO members (${insertKeys}) VALUES ` +
		roster.map(m => '(' + db.escape(Object.values(m)) + ')').join(', ') +
		' ON DUPLICATE KEY UPDATE ' +
		updateKeys.map(k => k + '=VALUES(' + k + ')') +
		';';
	await db.query(sql);

	return getMembersWithParticipation();
}

export async function exportMyProjectRoster(res) {
	let members = await getMembers();
	members = members.filter(m => !m.Status.search(/^Voter|^Aspirant|^Potential Voter|^Non-Voter/));
	await genMyProjectRosterSpreadsheet(members, res);
	res.end();
}
