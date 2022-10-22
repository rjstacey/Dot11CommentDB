/*
 * Manage sessions and session attendance
 */
import { DateTime } from 'luxon';
import {getImatBreakouts, getImatBreakoutAttendance, getImatAttendanceSummary} from './imat';
import {NotFoundError} from '../utils';

const db = require('../utils/database');

const getSessionTotalCreditSQL = (session_id) =>
	'SELECT ' +
		'SUM(OverrideCreditNumerator/OverrideCreditDenominator) AS TotalCredit ' +
	'FROM ' +
		'(SELECT DISTINCT Day, Start, OverrideCreditDenominator, OverrideCreditNumerator ' +
			'FROM breakouts ' +
			'WHERE Credit="Normal" AND session_id=' + session_id + ') AS t';

const getSessionsSQL = () =>
	'SELECT ' +
		'id, ' +
		'name, ' +
		'type, ' +
		'BIN_TO_UUID(`groupId`) AS `groupId`, ' +
		'startDate, ' +
		'endDate, ' +
		'timezone, ' +
		'imatMeetingId, ' +
		'OrganizerID, ' +
		'timeslots, ' +
		'rooms, ' +
		'(SELECT COUNT(*) FROM breakouts WHERE session_id=m.id) AS Breakouts, ' +
		'(' + getSessionTotalCreditSQL('m.id') + ') AS TotalCredit, ' +
		'(SELECT COUNT(DISTINCT(SAPIN)) FROM attendance_summary WHERE session_id=m.id) AS Attendees ' +
	'FROM sessions m';

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
		'a.SAPIN, ' +
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
 * Return a complete list of sessions
 */
export function getSessions(constraints) {
	let sql = getSessionsSQL();
	if (constraints) {
		sql += ' WHERE ' + Object.entries(constraints).map(
			([key, value]) => db.format(Array.isArray(value)? '?? IN (?)': '??=?', [key, value])
		).join(' AND ');
	}
	sql += ' ORDER BY startDate DESC';
	return db.query({sql, dateStrings: true});
}

function sessionEntrySetSql(s) {
	const entry = {
		name: s.name,
		type: s.type,
		groupId: s.groupId,
		imatMeetingId: s.imatMeetingId,
		OrganizerID: s.OrganizerID
	};

	if (typeof s.timezone !== 'undefined') {
		if (DateTime.local().setZone(s.timezone).isValid)
			entry.timezone = s.timezone;
		else
			throw new TypeError('Invalid parameter timezone: ' + s.timezone);
	}

	if (typeof s.startDate !== 'undefined') {
		if (DateTime.fromISO(s.startDate).isValid)
			entry.startDate = s.startDate;
		else
			throw new TypeError('Invlid parameter startDate: ' + s.startDate);
	}

	if (typeof s.endDate !== 'undefined') {
		if (DateTime.fromISO(s.endDate).isValid)
			entry.endDate = s.endDate;
		else
			throw new TypeError('Invlid parameter endDate: ' + s.endDate);
	}

	if (typeof s.timeslots !== 'undefined') {
		if (!Array.isArray(s.timeslots))
			throw new TypeError('Invlid parameter timeslots: ' + s.timeslots);
		entry.timeslots = JSON.stringify(s.timeslots);
	}

	if (typeof s.rooms !== 'undefined') {
		if (!Array.isArray(s.rooms))
			throw new TypeError('Invlid parameter rooms: ' + s.rooms);
		entry.rooms = JSON.stringify(s.rooms);
	}

	for (const key of Object.keys(entry)) {
		if (entry[key] === undefined)
			delete entry[key]
	}

	const sets = [];
	for (const [key, value] of Object.entries(entry)) {
		let sql;
		if (key === 'groupId')
			sql = db.format('??=UUID_TO_BIN(?)', [key, value]);
		else
			sql = db.format('??=?', [key, value]);
		sets.push(sql);
	}

	return sets.join(', ');
}

export async function addSession(session) {
	const setSql = sessionEntrySetSql(session);
	const {insertId} = await db.query({sql: `INSERT INTO sessions ${setSql};`, dateStrings: true});
	const [insertedSession] = await getSessions({id: insertId});
	return insertedSession;
}

export async function updateSession(id, changes) {
	const setSql = sessionEntrySetSql(changes);
	if (setSql) {
		await db.query({sql: `UPDATE sessions SET ${setSql} WHERE id=?;`, dateStrings: true},  [id]);
		const sessions = await getSessions({id});
		return sessions[0];
	}

	return {id};
}

export async function deleteSessions(ids) {
	const results = await db.query(
		db.format('DELETE FROM sessions WHERE id IN (?);', [ids]) +
		db.format('DELETE FROM attendance WHERE session_id IN (?);', [ids]) +
		db.format('DELETE FROM attendance_summary WHERE session_id IN (?);', [ids]) +
		db.format('DELETE FROM breakouts WHERE session_id IN (?);', [ids])
	);
	return results[0].affectedRows;
}

export async function getBreakouts(session_id) {
	const [session] = await(getSessions({id: session_id}));
	if (!session)
		throw `Session ID ${session_id} not recognized`;
	const breakouts = await db.query(getBreakoutsSQL(session_id));
	return {session, breakouts};
}

export async function getBreakoutAttendees(user, session_id, breakout_id) {
	const sql =
		getSessionSQL(session_id) +
		db.format('SELECT * FROM breakouts WHERE id=?; ', [breakout_id]) +
		getBreakoutAttendeesSQL(session_id, breakout_id);
	const [sessions, breakouts, attendees] = await db.query(sql);
	if (sessions.length === 0)
		throw `No such session: ${session_id}`;
	if (breakouts.length === 0)
		throw `No such breakout: ${breakout_id}`;
	return {session: sessions[0], breakout: breakouts[0], attendees};
}

export async function getSessionAttendees(session_id) {
	const sql =
		getSessionSQL(session_id) +
		getSessionAttendeesSQL(session_id);
	const [sessions, attendees] = await db.query(sql);
	if (sessions.length === 0)
		throw `No such session: ${session_id}`;
	const session = sessions[0];
	return {session, attendees};
}

export async function getRecentSessionsWithAttendees() {
	let sessions = (await getSessions())
		.map(s => ({...s, timestamp: Date.parse(s.Start)}))
		.sort((s1, s2) => s1.timestamp - s2.timestamp)	// Oldest to newest

	// Plenary sessions only, newest 4 with attendance
	let plenaries = sessions
		.filter(s => s.Type === 'p' && s.Attendees > 0)
		.slice(-4);
	if (plenaries.length === 0)
		return [];

	// Plenary and interim sessions (with attendance) from the oldest plenary date
	let fromTimestamp = plenaries[0].timestamp;
	sessions = sessions.filter(s => (s.Type === 'i' || s.Type === 'p') && s.timestamp >= fromTimestamp && s.Attendees > 0);

	const results = await Promise.all(sessions.map(s => getSessionAttendees(s.id)));
	//console.log(results)

	// Merge attendees with sessions
	sessions.forEach((s, i) => {
		s.Attendees = results[i].attendees;
		delete s.timestamp;
	});

	return sessions;
}

export async function importBreakouts(user, sessionId) {

	const [session] = await db.query('SELECT * FROM sessions WHERE id=?;', [sessionId]);
	if (!session)
		throw new NotFoundError(`Session id=${sessionId} does not exist`);
	console.log(session)

	let {breakouts} = await getImatBreakouts(user, session.imatMeetingId);
	breakouts = breakouts.map(b => ({...b, session_id: sessionId}));	// Add session ID to each entry
	
	await db.query('DELETE FROM breakouts WHERE session_id=?; ', [sessionId]);

	//console.log(breakouts)
	for (const b of breakouts) {
		const result = await db.query('INSERT INTO breakouts (??) VALUE (?)', [Object.keys(b), Object.values(b)]);
		await importBreakoutAttendance(user, session, result.insertId, session.imatMeetingId, b.BreakoutID);
	}

	return getBreakouts(sessionId);
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

	let [session] = await db.query('SELECT * FROM sessions WHERE id=?;', [session_id]);
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
				Status: 'Non-Voter'
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