
import {AccessLevel} from '../auth/access'
import {parseMyProjectRosterSpreadsheet} from './myProjectSpreadsheets'
import {parseMembersSpreadsheet, parseSAPINsSpreadsheet, parseEmailsSpreadsheet} from './membersSpreadsheets'
import {getSessions, getSessionAttendeesCoalesced} from './sessions'

const db = require('../util/database')
const moment = require('moment-timezone')

/*
 * A list of members is available to any user with access level Member or higher
 * (for reassigning comments, etc.). We only care about members with status.
 */
export async function getUsers(user) {
	const SQL = db.format(
		'SELECT SAPIN, Name, Status, Access FROM members ' +
		'WHERE ' +
			'Status="Aspirant" OR ' +
			'Status="Potential Voter" OR ' +
			'Status="Voter" OR ' +
			'Status="ExOfficio"');
	const users = await db.query(SQL);
	return {users};
}

/*
 * A detailed list of members is only available with access level WG Admin since it contains
 * sensitive information like email address.
 */
export async function getMembers() {
	const [members, emails] = await db.query(
		'SELECT * FROM members ORDER BY SAPIN; ' +
		'SELECT * FROM emails;');
	return {members, emails};
}

export async function getMembersWithAttendance() {
	let sessions = await getSessions();
	sessions.forEach(s => s.Start = moment(s.Start).tz(s.TimeZone));
	sessions = sessions.sort((s1, s2) => s1.Start - s2.Start)	// Oldest to newest

	// Plenary sessions only, newest 4 with attendance
	let plenaries = sessions
		.filter(s => s.Type === 'p' && s.Attendees > 0)
		.slice(-4);
	let fromDate = plenaries[0].Start;

	// Plenary and interim sessions from the oldest plenary date
	sessions = sessions.filter(s => (s.Type === 'i' || s.Type === 'p') && s.Start >= fromDate && s.Attendees > 0);

	//console.log(sessions);

	const results = await Promise.all(sessions.map(s => getSessionAttendeesCoalesced(s.id)));
	//console.log(results)

	// Merge attendances with sessions
	sessions.forEach((s, i) => s.Attendees = results[i].attendees);

	const {members} = await getMembers();

	for (const m of members) {
		m.Attendances = {};
		let pCount = 0, iCount = 0;
		for (const s of sessions) {
			m.Attendances[s.id] = 0;
			const attendance = s.Attendees.find(a => a.SAPIN === m.SAPIN);
			if (attendance) {
				m.Attendances[s.id] = attendance.AttendancePercentage;
				if (attendance.AttendancePercentage >= 75) {
					if (s.Type === 'p')
						pCount++;
					else
						iCount++;
				}
			}
		}
		m.AttendanceCount = pCount + (iCount? 1: 0);
		m.NewStatus = '';
		if (!m.StatusChangeOverride && 
			(m.Status === 'Voter' || m.Status === 'Potential Voter' || m.Status === 'Aspirant' || m.Status === 'Non-Voter')) {
			const lastIsP = sessions.length > 0 && sessions[0].Type === 'p';
			/* A Voter, Potential Voter or Aspirant becomes a Non-Voter after failing to attend 1 of the last 4 plenary sessions.
			 * One interim may be substited for a plenary session. */
			if (m.AttendanceCount === 0 && m.Status !== 'Non-Voter')
				m.NewStatus = 'Non-Voter'
			/* A Non-Voter becomes an Aspirant after attending 1 plenary or interim session.
			 * A Voter or Potential Voter becomes an Aspirant if they have only attended 1 of the last 4 plenary sessions
			 * or intervening interim sessions. */
			else if (m.AttendanceCount === 1 && m.Status !== 'Aspirant')
				m.NewStatus = 'Aspirant'
			/* An Aspirant becomes a Potential Voter after attending 2 of the last 4 plenary sessions. One intervening
			 * interim meeting may be substituted for a plenary meeting. */
			else if (m.AttendanceCount === 2 && m.Status === 'Aspirant')
				m.NewStatus = 'Potential Voter'
			/* A Potential Voter becomes a Voter at the next plenary session after attending 2 of the last 4 plenary 
			 * sessions. One intervening interim meeting may be substituted for a plenary meeting. */
			else if (((m.AttendanceCount === 3 && lastIsP) || m.AttendanceCount > 3) && m.Status === 'Potential Voter')
				m.NewStatus = 'Voter'
		}
	}

	sessions.forEach((s, i) => delete s.Attendees);

	return {sessions, members}
}

export async function getMembersWithBallots(user) {
	let ballots = await db.query('SELECT * FROM ballots WHERE Type=3 OR Type=4');
	sessions.forEach(s => s.Start = moment(s.Start).tz(s.TimeZone));
	sessions = sessions.sort((s1, s2) => s1.Start - s2.Start)	// Oldest to newest

	// Plenary sessions only, last 4
	let plenaries = sessions
		.filter(s => s.Type === 'p' && s.TotalCredit > 0)
		.slice(-4);
	let fromDate = plenaries[0].Start;

	// Plenary and interim sessions from the oldest plenary date
	sessions = sessions.filter(s => (s.Type === 'i' || s.Type === 'p') && s.TotalCredit > 0 && s.Start >= fromDate);

	//console.log(sessions);

	const results = await Promise.all(sessions.map(s => getSessionAttendees(s.id)));
	//console.log(results)

	// Merge attendances with sessions
	sessions.forEach((s, i) => s.Attendees = results[i].attendees);

	const {members} = await getMembers(user);

	for (const m of members) {
		m.Attendances = {};
		let pCount = 0, iCount = 0;
		for (const s of sessions) {
			m.Attendances[s.id] = 0;
			const attendance = s.Attendees.find(a => a.SAPIN === m.SAPIN);
			if (attendance) {
				m.Attendances[s.id] = attendance.SessionCreditPct;
				if (attendance.SessionCreditPct >= 0.75) {
					if (s.Type === 'p')
						pCount++;
					else
						iCount++;
				}
			}
		}
		m.NewStatus = '';
		if (!m.StatusChangeOverride && 
			(m.Status === 'Voter' || m.Status === 'Potential Voter' || m.Status === 'Aspirant' || m.Status === 'Non-Voter')) {
			const count = pCount + (iCount? 1: 0);
			const lastIsP = sessions.length > 0 && sessions[0].Type === 'p';
			/* A Voter, Potential Voter or Aspirant becomes a Non-Voter after failing to attend 1 of the last 4 plenary sessions.
			 * One interim may be substited for a plenary session. */
			if (count === 0 && m.Status !== 'Non-Voter')
				m.NewStatus = 'Non-Voter'
			/* A Non-Voter becomes an Aspirant after attending 1 plenary or interim session.
			 * A Voter or Potential Voter becomes an Aspirant if they have only attended 1 of the last 4 plenary sessions
			 * or intervening interim sessions. */
			else if (count === 1 && m.Status !== 'Aspirant')
				m.NewStatus = 'Aspirant'
			/* An Aspirant becomes a Potential Voter after attending 2 of the last 4 plenary sessions. One intervening
			 * interim meeting may be substituted for a plenary meeting. */
			else if (count === 2 && m.Status === 'Aspirant')
				m.NewStatus = 'Potential Voter'
			/* A Potential Voter becomes a Voter at the next plenary session after attending 2 of the last 4 plenary 
			 * sessions. One intervening interim meeting may be substituted for a plenary meeting. */
			else if (((count === 3 && lastIsP) || count > 3) && m.Status === 'Potential Voter')
				m.NewStatus = 'Voter'
		}
	}

	sessions.forEach((s, i) => delete s.Attendees);

	return {sessions, members}
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
		Status: m.Status,
		Affiliation: m.Affiliation,
		Employer: m.Employer,
		Access: m.Access,
		StatusChangeOverride: m.StatusChangeOverride
	};

	for (const key of Object.keys(entry)) {
		if (entry[key] === undefined)
			delete entry[key]
	}

	if (entry.Status && Status[entry.Status] === undefined)
		entry.Status = Object.keys(Status)[0];

	return entry;
}

export async function addMember(member) {

	let entry = memberEntry(member);

	if (!entry.SAPIN)
		throw 'Must provide SAPIN';

	const SQL = 
		db.format('INSERT INTO members (??) VALUES (?);', [Object.keys(entry), Object.values(entry)]) +
		db.format('SELECT * FROM members WHERE SAPIN=?;', [entry.SAPIN])
	try {
		const [noop, members] = await db.query(SQL);
		return {member: members[0]}
	}
	catch (err) {
		throw err.code === 'ER_DUP_ENTRY'? `A member with SAPIN ${entry.SAPIN} already exists`: err
	}
}

export async function updateMember(id, member) {

	let entry = memberEntry(member);

	if (Object.keys(entry).length) {
		const SQL =
			db.format("UPDATE members SET ? WHERE id=?;",  [entry, id]) +
			db.format("SELECT ?? from members WHERE id=?;", [Object.keys(entry), id])
		const [noop, members] = await db.query(SQL);
		entry = members[0];
	}

	return {member: entry}
}

export async function upsertMembers(attendees) {

	const sapins = Object.keys(attendees);
	const existing = await db.query('SELECT * FROM members WHERE SAPIN IN (?)', [sapins]);
	console.log(existing)
	const insert = {...attendees};
	const update = {};
	for (const u of existing) {
		if (insert[u.SAPIN]) {
			update[u.id] = insert[u.SAPIN];
			delete insert[u.SAPIN];
		}
	}

	const SQL = 
		Object.values(update).map(u => db.format('UPDATE members SET ? WHERE id=?;', [memberEntry(u), u.id])).join(' ') +
		Object.values(insert).map(u => db.format('INSERT members SET ?;', [memberEntry(u)])).join(' ') +
		db.format('SELECT * FROM members WHERE SAPIN IN (?);', [sapins]);

	const results = await db.query(SQL);

	return {members: results[results.length-1]}
}

export async function deleteMembers(ids) {
	if (ids.length > 0)
		await db.query('DELETE FROM members WHERE id IN (?)', [ids]);
	return null;
}

export const UploadFormat = {
	Roster: 'roster',
	Members: 'members',
	SAPINs: 'sapins',
	Emails: 'emails'
};

export async function uploadMembers(format, file) {

	let roster = [], members = [], sapins = [], emails = [];
	switch (format) {
		case UploadFormat.Roster:
			roster = await parseMyProjectRosterSpreadsheet(file.buffer);
			break;
		case UploadFormat.Members:
			members = await parseMembersSpreadsheet(file.buffer);
			members = members.filter(m => m.SAPIN > 0);
			break;
		case UploadFormat.SAPINs:
			sapins = await parseSAPINsSpreadsheet(file.buffer);
			break;
		case UploadFormat.Emails:
			emails = await parseEmailsSpreadsheet(file.buffer);
			break;
		default:
			throw `Unknown format: ${format}. Extected: ${Object.values(UploadFormat)}.`
	}

	roster = roster
		.filter(u => typeof u.SAPIN === 'number' && u.SAPIN > 0 && !u.Status.search(/^Voter|^Potential|^Aspirant|^Non-Voter|^ExOfficio/g))
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

	//console.log(members);
	let SQL = '';
	if (roster.length) {
		SQL =
			`INSERT INTO users (${Object.keys(members[0])}) VALUES ` +
			members.map(u => '(' + db.escape(Object.values(u)) + ')').join(', ') +
			' ON DUPLICATE KEY UPDATE ' +
			Object.keys(members[0]).filter(k => k !== 'SAPIN').map(k => k + '=VALUES(' + k + ')') +
			';';
		console.log(SQL)
		await db.query(SQL);
	}
	if (members.length) {
		SQL =
			'DELETE FROM members; ' +
			db.format('INSERT INTO members (??) VALUES ', [Object.keys(members[0])]) +
			members.map(u => '(' + db.escape(Object.values(u)) + ')').join(', ') +
			';';
		await db.query(SQL);
	}
	if (sapins.length) {
		const members = await db.query('SELECT MemberID, SAPIN, ReplacedBySAPIN, Status FROM members;')
		for (const s of sapins) {
			/* If the member_id and SAPIN match, then update DateAdded */
			const m1 = members.find(m => m.MemberID === s.MemberID)
			if (m1) {
				if (m1.SAPIN === s.SAPIN) {
					db.query(
							'UPDATE members SET DateAdded=? WHERE MemberID=?',
							[s.DateAdded, m1.MemberID]
						).catch(console.warn);
				}
				else {
					const m2 = members.find(m => m.SAPIN === s.SAPIN);
					if (m2) {
						if (m2.MemberID !== s.MemberID) {
							db.query(
									'UPDATE members SET Status="Obsolete", ReplacedBySAPIN=? WHERE MemberID=?',
									[m1.SAPIN, m2.MemberID]
								).catch(console.warn);
						}
					}
					else {
						const entry = {
							SAPIN: s.SAPIN,
							ReplacedBySAPIN: m1.SAPIN,
							Status: 'Obsolete',
							Notes: 'Replaced by SAPIN=' + m1.SAPIN
						}
						db.query('INSERT INTO members SET ?, DateAdded=NOW()', [entry]).catch(console.warn);
					}
				}
			}
		}
	}
	if (emails.length) {
		SQL =
			'DELETE FROM emails; ' +
			db.format('INSERT INTO emails (??) VALUES ', [Object.keys(emails[0])]) +
			emails.map(u => '(' + db.escape(Object.values(u)) + ')').join(', ') +
			';'
		await db.query(SQL);
	}
	return getMembers();
}
