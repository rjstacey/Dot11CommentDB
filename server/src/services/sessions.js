
const db = require('../util/database')
const moment = require('moment-timezone')

import {getImatBreakouts, getImatBreakoutAttendance, getImatAttendanceSummary} from './imat';

const getSessionTotalCreditSQL = (session_id) =>
	'SELECT ' +
		'SUM(OverrideCreditNumerator/OverrideCreditDenominator) AS TotalCredit ' +
	'FROM ' +
		'(SELECT DISTINCT Day, Start, OverrideCreditDenominator, OverrideCreditNumerator ' +
			'FROM breakouts ' +
			'WHERE Credit="Normal" AND session_id=' + session_id + ') AS t';

const getSessionsSQL = () =>
	'SELECT ' +
		'*, ' +
		'(SELECT COUNT(*) FROM breakouts WHERE session_id=m.id) AS Breakouts, ' +
		'(' + getSessionTotalCreditSQL('m.id') + ') AS TotalCredit, ' +
		'(SELECT COUNT(DISTINCT(SAPIN)) FROM attendance_summary WHERE session_id=m.id) AS Attendees ' +
	'FROM meetings m';

/*
 * Get session attendees with attendance for obselete SAPINs mapped to the new SAPIN
 */
const getSessionAttendeesCoalescedSQL = (session_id) => 
	'SELECT ' +
		'COALESCE(o.SAPIN, m.SAPIN) AS SAPIN, ' +
		'COALESCE(o.MemberID, m.MemberID) AS MemberID, ' +
		'COALESCE(o.Name, m.Name) AS Name, ' +
		'COALESCE(o.Email, m.Email) AS Email, ' +
		'COALESCE(o.Affiliation, m.Affiliation) AS Affiliation, ' +
		'COALESCE(o.Status, m.Status) AS Status, ' +
		'a.id, ' +
		'a.session_id, ' +
		'a.SAPIN AS AttendanceSAPIN, ' +
		'a.AttendancePercentage, ' +
		'a.DidAttend, ' +
		'a.DidNotAttend, ' +
		'a.Notes ' +
	'FROM attendances a ' +
		'LEFT JOIN (SELECT m1.*, m2.SAPIN AS ObsoleteSAPIN FROM members m1 INNER JOIN members m2 ON m2.Status="Obsolete" AND m2.ReplacedBySAPIN=m1.SAPIN) o ON o.ObsoleteSAPIN=a.SAPIN ' +
		'LEFT JOIN members m ON m.SAPIN=a.SAPIN ' +
	'WHERE a.session_id=' + session_id;

/*
 * Get session attendance
 */
const getSessionAttendeesSQL = (session_id) => 
	'SELECT ' +
		'm.SAPIN, ' +
		'm.MemberID, ' +
		'm.Name, ' +
		'm.Email, ' +
		'm.Affiliation, ' +
		'm.Status, ' +
		'a.AttendancePercentage, ' +
		'a.DidAttend, ' +
		'a.DidNotAttend, ' +
		'a.Notes, ' +
		'a.session_id ' +
	'FROM attendance_summary a ' +
		'LEFT JOIN members m ON m.SAPIN=a.SAPIN ' +
	'WHERE a.session_id=' + session_id;

const getBreakoutsSQL = (session_id) =>
	'SELECT ' +
		'*, ' +
		'(SELECT COUNT(DISTINCT(SAPIN)) FROM attendance WHERE breakout_id=b.id) AS Attendees ' +
	'FROM breakouts b ' +
	'WHERE session_id=' + session_id + ';';

const getSessionSQL = (session_id) =>
	getSessionsSQL() +
	' WHERE id=' + session_id + ';';

const getBreakoutAttendeesSQL = (session_id, breakout_id) =>
	'SELECT ' +
		'a.SAPIN, ' +
		'IFNULL(m.Name, a.Name) AS Name, ' +
		'IFNULL(m.Email, a.Email) AS Email, ' +
		'a.Affiliation, ' +
		'IFNULL(m.Status, "New") AS Status ' +
	'FROM attendance a ' +
		'LEFT JOIN members m ON a.SAPIN=m.SAPIN ' +
	'WHERE a.breakout_id=' + breakout_id + ' ' +
	'ORDER BY a.SAPIN;';

const getAttendeeSessionCreditTable = (session_id) =>
	'SELECT SAPIN, COUNT(*) AS SessionCredit ' +
	'FROM attendance a2 ' +
		'LEFT JOIN breakouts b2 ON a2.breakout_id=b2.id ' +
	'WHERE a2.session_id=' + session_id + ' AND (b2.Credit="Normal" OR b2.Credit="Extra") ' +
	'GROUP BY SAPIN';

const getSessionAttendanceSQL = (session_id) =>
	'SELECT ' +
		'a.SAPIN, ' +
		'IFNULL(u.Name, a.Name) AS Name, ' +
		'IFNULL(u.Email, a.Email) AS Email, ' +
		'a.Affiliation, ' +
		'IFNULL(u.Status, "New") AS Status, ' +
		's.SessionCredit ' +
	'FROM ' +
		'(SELECT ' +
				'SAPIN, ' +
				'MAX(Name) AS Name, ' +
				'MAX(Email) AS Email, ' +
				'MAX(Affiliation) AS Affiliation ' +
			'FROM attendance WHERE session_id=' + session_id + ' GROUP BY SAPIN) a ' +
		'LEFT JOIN (' + getAttendeeSessionCreditTable(session_id) + ') s ON a.SAPIN=s.SAPIN ' +
		'LEFT JOIN users u ON a.SAPIN=u.SAPIN ' +
	'ORDER BY a.SAPIN;';

/*
 * Return a complete list of meetings
 */
export function getSessions() {
	return db.query(getSessionsSQL());
}

function sessionEntry(s) {
	const entry = {
		Start: s.Start !== undefined? new Date(s.Start): undefined,
		End: s.End !== undefined? new Date(s.End): undefined,
		Name: s.Name,
		Type: s.Type,
		TimeZone: s.TimeZone,
		MeetingNumber: s.MeetingNumber,
		OrganizerID: s.OrganizerID
	};

	for (const key of Object.keys(entry)) {
		if (entry[key] === undefined)
			delete entry[key]
	}

	return entry;
}

export async function addSession(session) {
	const entry = sessionEntry(session);
	const {insertId} = await db.query('INSERT INTO meetings (??) VALUES (?);', [Object.keys(entry), Object.values(entry)]);
	const [insertedSession] = await db.query('SELECT * FROM meetings WHERE id=?;', [insertId]);
	return insertedSession;
}

export async function updateSession(id, session) {
	let entry = sessionEntry(session);
	if (Object.keys(entry).length) {
		const SQL =
			db.format("UPDATE meetings SET ? WHERE id=?;",  [entry, id]) +
			db.format("SELECT ?? from meetings WHERE id=?;", [Object.keys(entry), id])
		const [noop, sessions] = await db.query(SQL);
		entry = sessions[0];
	}

	return entry;
}

export async function deleteSessions(ids) {
	const results = await db.query('DELETE FROM meetings WHERE id IN (?)', [ids]);
	return results.affectedRows
}

export const getTimeZones = moment.tz.names;

export async function getBreakouts(session_id) {
	let [sessions, breakouts] = await db.query(
		getSessionSQL(session_id) + 
		getBreakoutsSQL(session_id)
	);
	if (sessions.length === 0)
		throw `Session ID ${session_id} not recognized`;
	const session = sessions[0];
	for (const b of breakouts) {
		/* Convert breakout start/end to strings in local time */
		const start = moment(b.Start).tz(session.TimeZone);
		b.Date = start.format('YYYY-MM-DD');
		b.Day = start.format('ddd');
		b.StartTime = start.format('HH:mm');
		const end = moment(b.End).tz(session.TimeZone);
		b.EndTime = end.format('HH:mm');
		b.DayDate = b.Day + ', ' + b.Date;
		b.Time = b.StartTime + ' - ' + b.EndTime;
	}
	return {session, breakouts};
}

export async function getBreakoutAttendees(user, session_id, breakout_id) {
	const SQL =
		getSessionSQL(session_id) +
		db.format('SELECT * FROM breakouts WHERE id=?; ', [breakout_id]) +
		getBreakoutAttendeesSQL(session_id, breakout_id);
	const [sessions, breakouts, attendees] = await db.query(SQL);
	if (sessions.length === 0)
		throw `No such session: ${session_id}`;
	if (breakouts.length === 0)
		throw `No such breakout: ${breakout_id}`;
	return {session: sessions[0], breakout: breakouts[0], attendees};
}

export async function getSessionAttendees(session_id) {
	const SQL =
		getSessionSQL(session_id) +
		getSessionAttendeesSQL(session_id);
	const [sessions, attendees] = await db.query(SQL);
	if (sessions.length === 0)
		throw `No such session: ${session_id}`;
	const session = sessions[0];
	return {session, attendees};
}

export async function getRecentSessionsWithAttendees() {
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

	const results = await Promise.all(sessions.map(s => getSessionAttendees(s.id)));
	//console.log(results)

	// Merge attendees with sessions
	sessions.forEach((s, i) => s.Attendees = results[i].attendees);

	return sessions;
}

export async function importBreakouts(user, session_id) {

	const [session] = await db.query('SELECT * FROM meetings WHERE id=?;', [session_id]);
	if (!session)
		throw `Unrecognized session ${session_id}`

	const imatBreakouts = await getImatBreakouts(user, session);

	// Add session ID to each entry
	imatBreakouts.forEach(b => b.session_id = session_id);

	await db.query('DELETE FROM breakouts WHERE session_id=?; ', [session_id]);
	//console.log(breakouts)
	if (imatBreakouts.length) {
		for (const b of imatBreakouts) {
			const result = await db.query('INSERT INTO breakouts (??) VALUE (?)', [Object.keys(b), Object.values(b)]);
			await importBreakoutAttendance(user, session, result.insertId, session.MeetingNumber, b.BreakoutID);
		}
	}

	return getBreakouts(session_id)
}

export async function importBreakoutAttendance(user, session, breakout_id, meetingNumber, breakoutNumber) {

	const attendance = await getImatBreakoutAttendance(user, breakoutNumber, meetingNumber);

	await db.query('DELETE FROM attendance WHERE breakout_id=?; ', [breakout_id]);

	if (attendance.length) {
		const SQL =
			db.format('INSERT INTO attendance (session_id, breakout_id, ??) VALUES ', [Object.keys(attendance[0])]) +
			attendance.map(a => db.format('(?, ?, ?)', [session.id, breakout_id, Object.values(a)])).join(', ');
		await db.query(SQL);
	}
}

export async function importAttendances(user, session_id) {

	let [session] = await db.query('SELECT * FROM meetings WHERE id=?;', [session_id]);
	if (!session)
		throw `Unrecognized session ${session_id}`

	const imatAttendances = await getImatAttendanceSummary(user, session);
	const sapins = imatAttendances.map(i => i.SAPIN);
	const members = sapins.length > 0? await db.query('SELECT * FROM members WHERE SAPIN IN (?)', [sapins]): [];

	const updates = [], inserts = [];
	for (const i of imatAttendances) {
		const m = members.find(m => i.SAPIN === m.SAPIN);
		if (m) {
			const u = {};
			if (m.Name !== i.Name) {
				u.Name = i.Name
				u.LastName = i.LastName
				u.FirstName = i.FirstName
				u.MI = i.MI
			}
			if (m.Affiliation !== i.Affiliation)
				u.Affiliation = i.Affiliation
			if (m.Email !== i.Email)
				u.Email = i.Email
			if (Object.keys(u).length > 0) {
				u.SAPIN = i.SAPIN;
				updates.push(u);
			}
		}
		else {
			const u = {
				SAPIN: i.SAPIN,
				Name: i.Name,
				LastName: i.LastName,
				FirstName: i.FirstName,
				MI: i.MI,
				Affiliation: i.Affiliation,
				Email: i.Email,
				Status: 'New'
			}
			inserts.push(u);
		}
	}

	let SQL;

	if (inserts.length > 0) {
		SQL = 
			db.format('INSERT INTO members (??) VALUES ', [Object.keys(inserts[0])]) +
			inserts.map(m => '(' + db.escape(Object.values(m)) + ')').join(', ') +
			'; ';
		await db.query(SQL);
	}

	if (updates.length > 0) {
		SQL = updates.map(u => db.format('UPDATE members SET ? WHERE SAPIN=?', [u, u.SAPIN])).join('; ');
		await db.query(SQL);
	}

	const attendances = imatAttendances.map(a => (
			{
				SAPIN: a.SAPIN,
				AttendancePercentage: a.AttendancePercentage
			}
		));

	await db.query('DELETE FROM attendance_summary WHERE session_id=?; ', [session_id]);

	if (attendances.length) {
		SQL =
			db.format('INSERT INTO attendance_summary (session_id, ??) VALUES ', [Object.keys(attendances[0])]) +
			attendances.map(a => db.format('(?, ?)', [session.id, Object.values(a)])).join(', ');
		await db.query(SQL);
	}

	SQL = getSessionSQL(session_id) + getSessionAttendeesSQL(session_id);

	const [sessions, attendees] = await db.query(SQL);

	return {session: sessions[0], attendees};
}

function attendanceSummaryEntry(a) {
	if (!a)
		return {};

	const entry = {
		session_id: a.session_id,
		SAPIN: a.SAPIN,
		AttendancePercentage: a.AttendancePercentage,
		DidAttend: a.DidAttend? 1: 0,
		DidNotAttend: a.DidNotAttend? 1: 0,
		Notes: a.Notes
	};

	for (const key of Object.keys(entry)) {
		if (entry[key] === undefined)
			delete entry[key]
	}

	return entry;
}

export async function upsertMemberAttendanceSummaries(sapin, attendances) {

	const session_ids = Object.keys(attendances);
	const existing = await db.query(
		'SELECT * FROM attendance_summary WHERE SAPIN=? AND session_id IN (?);', 
		[sapin, session_ids]
	);
	let insert = {...attendances};
	let update = {};
	for (const a of existing) {
		if (insert[a.session_id]) {
			update[a.id] = insert[a.session_id];
			delete insert[a.session_id];
		}
	}
	insert = Object.values(insert).map(a => ({...a, SAPIN: sapin}));

	const SQL = 
		Object.keys(update).map(id => db.format('UPDATE attendance_summary SET ? WHERE id=?;', [attendanceSummaryEntry(update[id]), id])).join(' ') +
		insert.map(a => db.format('INSERT attendance_summary SET ?;', [attendanceSummaryEntry(a)])).join(' ') +
		db.format('SELECT * FROM attendance_summary WHERE SAPIN=? AND session_id IN (?);', [sapin, session_ids]);
	console.log(SQL)
	const results = await db.query(SQL);

	return {attendances: results[results.length-1]}
}