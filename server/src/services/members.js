
import {AccessLevel} from '../auth/access'
import {
	parseMyProjectRosterSpreadsheet,
	genMyProjectRosterSpreadsheet
} from './myProjectSpreadsheets'
import {
	parseMembersSpreadsheet,
	parseSAPINsSpreadsheet,
	parseEmailsSpreadsheet,
	parseHistorySpreadsheet
} from './membersSpreadsheets'
import {
	getSessions,
	getRecentSessionsWithAttendees,
	upsertMemberAttendanceSummaries
} from './sessions'
import {getRecentBallotSeriesWithResults} from './ballots'
import {updateVoter} from './voters'

const db = require('../util/database')
const moment = require('moment-timezone')

/*
 * A list of members is available to any user with access level Member or higher
 * (for reassigning comments, etc.). We only care about members with status.
 */
export async function getUsers(user) {
	const SQL = db.format(
		'SELECT SAPIN, Name, Email, Status, Access FROM members ' +
		'WHERE ' +
			'Status="Aspirant" OR ' +
			'Status="Potential Voter" OR ' +
			'Status="Voter" OR ' +
			'Status="ExOfficio"');
	const users = await db.query(SQL);
	return {users};
}

/*
 * A detailed list of members
 */
export async function getMembers(sapins) {
	const sql = 
		'SELECT * FROM members' + 
			(sapins? db.format(' WHERE sapin IN (?); ', [sapins]): '; ') +
		'SELECT SAPIN FROM members WHERE Status="Obsolete"' + 
			(sapins? db.format(' AND ReplacedBySAPIN IN (?);', [sapins]): ';');
	const [members, obsoleteMembers] = await db.query(sql);

	// For each member, generate a list of obsolete SAPINs
	members.forEach(m => m.ObsoleteSAPINs = []);
	obsoleteMembers.forEach(o => {
		const u = members.find(m => m.SAPIN === o.ReplacedBySAPIN);
		if (u)
			u.ObsoleteSAPINs.push(o.SAPIN);
	});

	members.forEach(m => {
		m.DateAdded = moment(m.DateAdded);
		m.StatusChangeDate = moment(m.StatusChangeDate);
	});

	return members;
}

export async function getMember(sapin) {
	const members = await getMembers([sapin]);
	return members[0];
}

function getMemberAttendances(m, sessions) {
	const attendances = {};
	let pCount = 0, iCount = 0;
	const sapins = [m.SAPIN].concat(m.ObsoleteSAPINs);
	for (const s of sessions) {
		let a;
		for (const sapin of sapins) {
			a = s.Attendees.find(a => a.SAPIN === sapin);
			if (a)
				break;
		}
		if (a) {
			attendances[s.id] = {
				id: a.id,
				session_id: a.session_id,
				SAPIN: a.SAPIN,
				AttendancePercentage: a.AttendancePercentage,
				DidAttend: a.DidAttend,
				DidNotAttend: a.DidNotAttend,
				Notes: a.Notes
			};
			if ((a.AttendancePercentage >= 75 && !a.DidNotAttend) || a.DidAttend) {
				if (s.Type === 'p')
					pCount++;
				else
					iCount++;
			}
		}
		else {
			attendances[s.id] = {
				id: null,
				session_id: s.id,
				SAPIN: m.SAPIN,
				AttendancePercentage: 0,
				DidAttend: 0,
				DidNotAttend: 0,
				Notes: ''
			};
		}
	}
	const attendanceCount = pCount + (iCount? 1: 0);
	let newStatus = '';
	if (!m.StatusChangeOverride && 
		(m.Status === 'Voter' || m.Status === 'Potential Voter' || m.Status === 'Aspirant' || m.Status === 'Non-Voter')) {
		const lastIsP = sessions.length > 0 && sessions[0].Type === 'p';
		/* A Voter, Potential Voter or Aspirant becomes a Non-Voter after failing to attend 1 of the last 4 plenary sessions.
		 * One interim may be substited for a plenary session. */
		if (m.AttendanceCount === 0 && m.Status !== 'Non-Voter')
			newStatus = 'Non-Voter'
		/* A Non-Voter becomes an Aspirant after attending 1 plenary or interim session.
		 * A Voter or Potential Voter becomes an Aspirant if they have only attended 1 of the last 4 plenary sessions
		 * or intervening interim sessions. */
		else if (attendanceCount === 1 && m.Status !== 'Aspirant')
			newStatus = 'Aspirant'
		/* An Aspirant becomes a Potential Voter after attending 2 of the last 4 plenary sessions. One intervening
		 * interim meeting may be substituted for a plenary meeting. */
		else if (attendanceCount === 2 && m.Status === 'Aspirant')
			newStatus = 'Potential Voter'
		/* A Potential Voter becomes a Voter at the next plenary session after attending 2 of the last 4 plenary 
		 * sessions. One intervening interim meeting may be substituted for a plenary meeting. */
		else if (((attendanceCount === 3 && lastIsP) || attendanceCount > 3) && m.Status === 'Potential Voter')
			newStatus = 'Voter'
	}

	return {...m, Attendances: attendances, AttendanceCount: attendanceCount, NewStatus: newStatus}
}

function getMemberBallotSeriesParticipation(m, ballotSeries) {
	const summary = {};
	const member = {
		...m,
		BallotSeriesSummary: summary,
		BallotSeriesTotal: 0,
		BallotSeriesCount: 0
	};
	let id = 0;
	const sapins = [m.SAPIN].concat(m.ObsoleteSAPINs);
	for (const ballots of ballotSeries) {
		// Ignore if members last status change occured after the ballot series started
		if (ballots[0].Start < m.StatusChangeDate)
			continue;
		let v;
		for (const sapin of sapins) {
			v = ballots[0].Voters.find(v => v.SAPIN === sapin);
			if (v)
				break;
		}
		if (v) {
			// Member in voting pool, therefore counts toward maintaining voting rights
			summary[id] = {
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
			member.BallotSeriesTotal++;
			// Find last vote
			let r, b;
			for (b of ballots.slice().reverse()) {
				for (const sapin of sapins) {
					r = b.Results.find(r => r.SAPIN === sapin);
					if (r)
						break;
				}
				if (r)
					break;
			}
			if (r) {
				summary[id].SAPIN = r.SAPIN;
				summary[id].BallotID = b.BallotID;
				summary[id].Vote = r.Vote;
				summary[id].CommentCount = r.CommentCount;
			}
			if (r || v.Excused)
				member.BallotSeriesCount++;
			id++;
		}
	}
	if (!member.StatusChangeOverride &&
		member.Status === 'Voter' &&
		member.BallotSeriesTotal === 3 &&
		member.BallotSeriesCount < 2)
			member.NewStatus = 'Non-Voter'
	return member;
}

export async function getMembersWithParticipation(sapins) {
	const sessions = await getRecentSessionsWithAttendees();
	const ballotSeries = await getRecentBallotSeriesWithResults();
	let members = await getMembers(sapins);
	members = members
		.map(m => getMemberAttendances(m, sessions))
		.map(m => getMemberBallotSeriesParticipation(m, ballotSeries));
	return members;
}

async function getMemberWithParticipation(sapin) {
	const members = await getMembersWithParticipation([sapin]);
	console.log(members)
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
		ReplacedBySAPIN: m.ReplacedBySAPIN
	};

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

async function addMember(member) {

	const entry = memberEntry(member);
	if (!entry.SAPIN)
		throw 'Must provide SAPIN';

	await db.query('INSERT INTO members (??) VALUES (?);', [Object.keys(entry), Object.values(entry)]);

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
	const date = new Date();
	const id = member.StatusChangeHistory.reduce((maxId, h) => h.id > maxId? h.id: maxId, 0) + 1;
	const historyEntry = {
		id,
		Date: date,
		OldStatus: member.Status,
		NewStatus: status,
		Reason: reason
	};
	const replacedBySAPIN = (member.Status === 'Obsolete' && status !== 'Obsolete')? null: member.ReplacedBySAPIN;
	await db.query(
		'UPDATE members SET ' + 
			'Status=?, ' + 
			'StatusChangeDate=?, ' +
			'StatusChangeHistory=JSON_ARRAY_INSERT(StatusChangeHistory, \'$[0]\', CAST(? AS JSON)), ' +
			'ReplacedBySAPIN=? ' +
		'WHERE SAPIN=?;', 
		[status, date, JSON.stringify(historyEntry), replacedBySAPIN, member.SAPIN]
	);
}

export async function updateMember(sapin, changes) {
	const p = [];
	const {Attendances, BallotSeriesSummary, Status, StatusChangeReason, ...changesRest} = changes;

	if (Attendances && Object.keys(Attendances).length)
		p.push(upsertMemberAttendanceSummaries(sapin, Attendances));

	if (BallotSeriesSummary && Object.keys(BallotSeriesSummary).length > 0) {
		for (let summary of Object.values(BallotSeriesSummary))
			p.push(updateVoter(summary.VotingPoolID, sapin, {Excused: summary.Excused}));
	}

	/* If the member status changes, then update the status change history */
	const member = await getMember(sapin);
	if (Status && Status !== member.Status)
		p.push(updateMemberStatus(member, Status, StatusChangeReason || ''));

	const entry = memberEntry(changesRest);
	if (Object.keys(entry).length)
		p.push(db.query("UPDATE members SET ? WHERE SAPIN=?;",  [entry, sapin]));

	if (p.length)
		await Promise.all(p);

	return getMemberWithParticipation(sapin);
}

export async function updateMembers(updates) {
	// Validate request
	for (const u of updates) {
		if (typeof u !== 'object' || !u.id || typeof u.changes !== 'object')
			throw 'Expected array of objects with shape {id, changes}'
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
	let members = await parseMembersSpreadsheet(buffer);
	members = members.filter(m => m.SAPIN > 0);
	const sql =
		'DELETE FROM members; ' +
		db.format('INSERT INTO members (??) VALUES ', [Object.keys(members[0])]) +
		members.map(u => '(' + db.escape(Object.values(u)) + ')').join(', ') +
		';';
	await db.query(sql);
}

async function uploadDatabaseMemberSAPINs(buffer) {
	const [sapins, members] = await Promise.all([
			parseSAPINsSpreadsheet(buffer),
			db.query('SELECT MemberID, SAPIN, ReplacedBySAPIN, Status FROM members;')
		]);
	let sql = '';
	for (const s of sapins) {
		/* Find member with indexed MemberID */
		const m1 = members.find(m => m.MemberID === s.MemberID);
		if (m1) {
			if (m1.SAPIN === s.SAPIN) {
				sql += db.format(
						'UPDATE members SET DateAdded=? WHERE MemberID=?;',
						[s.DateAdded, m1.MemberID]
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
						DateAdded: s.DateAdded
					}
					sql += db.format('INSERT INTO members SET ?;', [entry])
				}
			}
		}
	}
	await db.query(sql);
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
