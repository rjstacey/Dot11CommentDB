
import {AccessLevel} from '../auth/access'
import {parseMyProjectRosterSpreadsheet} from './myProjectSpreadsheets'
import {getSessions, getSessionAttendees} from './sessions'

const db = require('../util/database')
const moment = require('moment-timezone')

/*
 * A list of members is available to any user with access level Member or higher (for
 * reassigning comments, etc.). However, only access level WG Admin gets sensitive 
 * information like email address and access level.
 */
export async function getMembers(user) {
	const fields = ['SAPIN', 'Name', 'LastName', 'FirstName', 'MI', 'Status', 'StatusChangeOverride'];

	/* Email and Access level are sensitive */
	if (user.Access >= AccessLevel.WGAdmin)
		fields.push('Email', 'Access')

	const members = await db.query('SELECT ?? FROM users', [fields]);
	return {members};
}

export async function getMembersWithAttendance(user) {
	let sessions = await getSessions();
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

export async function addMember(user) {

	let entry = memberEntry(user);

	if (!entry.SAPIN)
		throw 'Must provide SAPIN';

	const SQL = 
		db.format('INSERT INTO users (??) VALUES (?);', [Object.keys(entry), Object.values(entry)]) +
		db.format('SELECT * FROM users WHERE SAPIN=?;', [entry.SAPIN])
	try {
		const [noop, users] = await db.query(SQL);
		return {user: users[0]}
	}
	catch (err) {
		throw err.code === 'ER_DUP_ENTRY'? `A user with SAPIN ${entry.SAPIN} already exists`: err
	}
}

export async function updateMember(id, user) {

	let entry = memberEntry(user);

	if (Object.keys(entry).length) {
		const SQL =
			db.format("UPDATE users SET ? WHERE SAPIN=?;",  [entry, id]) +
			db.format("SELECT ?? from users WHERE SAPIN=?;", [Object.keys(entry), entry.SAPIN? entry.SAPIN: id])
		const [noop, users] = await db.query(SQL)
		entry = users[0]
		if (entry.SAPIN === undefined)
			entry.SAPIN = id	
	}

	return {user: entry}
}

export async function upsertMembers(users) {

	const sapins = Object.keys(users);
	const existingUsers = await db.query('SELECT * FROM users WHERE SAPIN IN (?)', [Object.keys(users)]);
	console.log(existingUsers)
	const insertUsers = {...users};
	const updateUsers = {};
	for (const u of existingUsers) {
		if (insertUsers[u.SAPIN]) {
			updateUsers[u.SAPIN] = users[u.SAPIN];
			delete insertUsers[u.SAPIN];
		}
	}

	const SQL = 
		Object.values(updateUsers).map(u => db.format('UPDATE users SET ? WHERE SAPIN=?;', [memberEntry(u), u.SAPIN])).join('') +
		Object.values(insertUsers).map(u => db.format('INSERT users SET ?;', [memberEntry(u)])).join('') +
		db.format('SELECT * FROM users WHERE SAPIN IN (?);', [sapins]);

	const results = await db.query(SQL);

	return {users: results[results.length-1]}
}

export async function deleteMembers(ids) {
	if (ids.length > 0)
		await db.query('DELETE FROM users WHERE SAPIN IN (?)', [ids]);
	return null;
}

export async function uploadMembers(file) {
	//let users = parseUsersCsv(file.buffer)
	let users = await parseMyProjectRosterSpreadsheet(file.buffer);
	users = users.filter(u => !u.Status.search(/^Voter|^Potential|^Aspirant/g))
	users = users.map(u => ({
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

	let SQL = '';
	if (users.length) {
		SQL =
			`INSERT INTO users (${Object.keys(users[0])}) VALUES ` +
			users.map(u => {return '(' + db.escape(Object.values(u)) + ')'}).join(',') +
			' ON DUPLICATE KEY UPDATE ' +
			'Name=VALUES(Name), LastName=VALUES(LastName), FirstName=VALUES(FirstName), MI=VALUES(MI), Email=VALUES(Email), Status=VALUES(Status);'
	}
	SQL += 'SELECT * FROM users;';
	const results = await db.query(SQL);
	users = results[results.length - 1];
	return users;
}
