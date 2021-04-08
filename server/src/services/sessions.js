
const db = require('../util/database')
const rp = require('request-promise-native')
const moment = require('moment-timezone')

import {parseMeetingsPage, parseBreakouts, parseBreakoutAttendance} from './imatHtml';

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
		'(SELECT COUNT(DISTINCT(SAPIN)) FROM attendance WHERE session_id=m.id) AS Attendees ' +
	'FROM meetings m';

const getSessionSQL = (session_id) =>
	getSessionsSQL() +
	' WHERE id=' + session_id + ';';

/*
 * Return a complete list of meetings
 */
export async function getSessions() {
	const sessions = await db.query(getSessionsSQL());
	return sessions;
}

export async function addSession(meeting) {

	let entry = {
		Start: meeting.Start !== undefined? new Date(meeting.Start): undefined,
		End: meeting.End !== undefined? new Date(meeting.End): undefined,
		Name: meeting.Name,
		Type: meeting.Type,
		TimeZone: meeting.TimeZone,
		MeetingNumber: meeting.MeetingNumber,
	}

	for (let key of Object.keys(entry)) {
		if (entry[key] === undefined) {
			delete entry[key]
		}
	}

	const {insertId} = await db.query('INSERT INTO meetings (??) VALUES (?);', [Object.keys(entry), Object.values(entry)]);
	const [insertedMeeting] = await db.query('SELECT * FROM meetings WHERE id=?;', [insertId]);
	return {meeting: insertedMeeting}
}

export async function updateSession(id, meeting) {

	let entry = {
		Start: meeting.Start !== undefined? new Date(meeting.Start): undefined,
		End: meeting.End !== undefined? new Date(meeting.End): undefined,
		Name: meeting.Name,
		Type: meeting.Type,
		TimeZone: meeting.TimeZone,
		MeetingNumber: meeting.MeetingNumber,
	}

	for (let key of Object.keys(entry)) {
		if (entry[key] === undefined) {
			delete entry[key]
		}
	}

	if (Object.keys(entry).length) {
		const SQL =
			db.format("UPDATE meetings SET ? WHERE id=?;",  [entry, id]) +
			db.format("SELECT ?? from meetings WHERE id=?;", [Object.keys(entry), id])
		const [noop, meetings] = await db.query(SQL);
		entry = meetings[0];
	}

	return {meeting: entry}
}

export async function deleteSessions(ids) {
	await db.query('DELETE FROM meetings WHERE id IN (?)', [ids]);
	return true;
}

/*
* getImatSessions
*
* Parameters: n = number of entries to get
*/
export async function getImatMeetings(user, n) {
	//console.log(user)

	async function recursivePageGet(meetings, n, page) {
		//console.log('get epolls n=', n)

		var options = {
			url: `https://imat.ieee.org/${user.Email}/meetings?n=${page}`,
			jar: user.ieeeCookieJar
		}
		//console.log(options.url);

		const body = await rp.get(options);

		//console.log(body)
		var meetingsPage = parseMeetingsPage(body);
		var end = n - meetings.length;
		if (end > meetingsPage.length) {
			end = meetingsPage.length;
		}
		meetings = meetings.concat(meetingsPage.slice(0, end));

		if (meetings.length === n || meetingsPage.length === 0) {
			return meetings;
		}

		return recursivePageGet(meetings, n, page+1);
	}

	return await recursivePageGet([], n, 1);
}

export const getTimeZones = moment.tz.names;

const getBreakoutsSQL = (session_id) =>
	'SELECT ' +
		'*, ' +
		'(SELECT COUNT(DISTINCT(SAPIN)) FROM attendance WHERE breakout_id=b.id) AS Attendees ' +
	'FROM breakouts b ' +
	'WHERE session_id=' + session_id + ';';

export async function getBreakouts(session_id) {
	let [meetings, breakouts] = await db.query(
		getSessionSQL(session_id) + 
		getBreakoutsSQL(session_id)
	);
	if (meetings.length === 0)
		throw `Session ID ${session_id} not recognized`;
	const meeting = meetings[0];
	meeting.TotalCredit = 0;
	for (const b of breakouts) {
		/* Convert breakout start/end to strings in local time */
		const start = moment(b.Start).tz(meeting.TimeZone);
		b.Date = start.format('YYYY-MM-DD');
		b.Day = start.format('ddd');
		b.StartTime = start.format('HH:mm');
		const end = moment(b.End).tz(meeting.TimeZone);
		b.EndTime = end.format('HH:mm');
		b.DayDate = b.Day + ', ' + b.Date;
		b.Time = b.StartTime + ' - ' + b.EndTime;
	}
	return {meeting, breakouts};
}

const getBreakoutAttendanceSQL = (session_id, breakout_id) =>
	'SELECT ' +
		'a.SAPIN, ' +
		'IFNULL(u.Name, a.Name) AS Name, ' +
		'IFNULL(u.Email, a.Email) AS Email, ' +
		'a.Affiliation, ' +
		'IFNULL(u.Status, "New") AS Status ' +
	'FROM attendance a ' +
		'LEFT JOIN users u ON a.SAPIN=u.SAPIN ' +
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

export async function getBreakoutAttendees(user, session_id, breakout_id) {
	const SQL =
		db.format('SELECT * FROM meetings WHERE id=?; ', [session_id]) +
		db.format('SELECT * FROM breakouts WHERE id=?; ', [breakout_id]) +
		getBreakoutAttendanceSQL(session_id, breakout_id);
	const [meetings, breakouts, attendees] = await db.query(SQL);
	if (meetings.length === 0)
		throw `No such session: ${session_id}`;
	if (breakouts.length === 0)
		throw `No such breakout: ${breakout_id}`;
	return {meeting: meetings[0], breakout: breakouts[0], attendees};
}

export async function getSessionAttendees(session_id) {
	const SQL =
		getSessionSQL(session_id) +
		getSessionAttendanceSQL(session_id);
	const [meetings, attendees] = await db.query(SQL);
	if (meetings.length === 0)
		throw `No such session: ${session_id}`;
	const meeting = meetings[0];
	for (const a of attendees)
		a.SessionCreditPct = a.SessionCredit/meeting.TotalCredit;
	return {meeting, attendees};
}

export async function importBreakouts(user, session_id) {

	const [meeting] = await db.query('SELECT * FROM meetings WHERE id=?;', [session_id]);
	if (!meeting)
		throw `Unrecognized meeting ${session_id}`
	const group = meeting.Type === 'p'? 'sp7200043': '802.11';
	const options = {
		url: `https://imat.ieee.org/${group}/breakouts.csv?p=${meeting.MeetingNumber}&xls=1`,
		jar: user.ieeeCookieJar,
		resolveWithFullResponse: true,
		simple: false
	}

	const response = await rp.get(options);
	if (response.headers['content-type'] !== 'text/csv')
		throw 'Not logged in'

	let breakouts = parseBreakouts(response.body, meeting);

	// Add session ID to each entry
	breakouts.forEach(b => b.session_id = session_id);

	await db.query('DELETE FROM breakouts WHERE session_id=?; ', [session_id]);
	//console.log(breakouts)
	if (breakouts.length) {
		for (const b of breakouts) {
			const result = await db.query('INSERT INTO breakouts (??) VALUE (?)', [Object.keys(b), Object.values(b)]);
			await importBreakoutAttendance(user, meeting.id, result.insertId, meeting.MeetingNumber, b.BreakoutID);
		}
	}

	const SQL = db.format(
		'SELECT ' +
			'*, ' +
			'(SELECT COUNT(*) FROM attendance a WHERE breakout_id=b.id) AS Attendance ' +
		'FROM breakouts b ' +
		'WHERE session_id=?;', [session_id]);
	//console.log(SQL)
	breakouts = await db.query(SQL);
	return {breakouts};
}

export async function importBreakoutAttendance(user, session_id, breakout_id, meetingNumber, breakoutNumber) {

	const options = {
		url: `https://imat.ieee.org/802.11/breakout-members?t=${breakoutNumber}&p=${meetingNumber}`,
		jar: user.ieeeCookieJar
	}

	const body = await rp.get(options);

	let attendance = parseBreakoutAttendance(body);

	await db.query('DELETE FROM attendance WHERE breakout_id=?; ', [breakout_id]);
	//console.log(breakouts)
	if (attendance.length) {
		const SQL =
			db.format('INSERT INTO attendance (session_id, breakout_id, ??) VALUES ', [Object.keys(attendance[0])]) +
			attendance.map(a => db.format('(?, ?, ?)', [session_id, breakout_id, Object.values(a)])).join(', ');
		await db.query(SQL);
	}
	//console.log(SQL)
}
