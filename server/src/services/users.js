
import {AccessLevel} from '../auth/access'
import {parseMyProjectRosterSpreadsheet} from './myProjectSpreadsheets'

const csvParse = require('csv-parse/lib/sync')
const db = require('../util/database')

function parseUsersCsv(usersCsv) {

	const p = csvParse(usersCsv, {columns: false})
	if (p.length === 0) {
		throw 'Got empty .csv file';
	}

	// Row 0 is the header
	expected = ['SA PIN', 'LastName', 'FirstName', 'MI', 'Email', 'Status']
	if (expected.reduce((r, v, i) => v !== p[0][i], false)) {
		throw `Unexpected column headings ${p[0].join()}. Expected ${expected.join()}.`
	}
	p.shift()

	return p.map(c => {
		return {
			SAPIN: c[0],
			Name: c[2] + ' ' + c[1],
			LastName: c[1],
			FirstName: c[2],
			MI: c[3],
			Email: c[4],
			Status: c[5],
		}
	})
}


const userCache = {};

export async function getUser(sapin, email) {

	let user = userCache[sapin];
	if (user)
		return user;

	const SQL = sapin > 0?
		db.format('SELECT * from users WHERE SAPIN=?', [sapin]):
		db.format('SELECT * from users WHERE Email=?', [email]);
	const [users] = await db.query2(SQL)

	user = users.length > 0? users[0]: null
	if (user)
		userCache[user.SAPIN] = user;

	return user
}

export function setUser(sapin, user) {
	userCache[sapin] = user;
}

export function delUser(sapin) {
	delete userCache[sapin];
}

/*
 * A list of users is available to any user with access level Member or higher (for
 * reassigning comments, etc.). However, only access level WG Admin gets sensitive 
 * information like email address and access level.
 */
export async function getUsers(user) {
	const fields = ['SAPIN', 'Name', 'LastName', 'FirstName', 'MI', 'Status'];

	/* Email and Access level are sensitive */
	if (user.Access >= AccessLevel.WGAdmin)
		fields.push('Email', 'Access')

	const users = await db.query('SELECT ?? FROM users', [fields]);
	return users;
}

export async function addUser(user) {
	let entry = {
		SAPIN: user.SAPIN,
		Name: user.Name,
		LastName: user.LastName,
		FirstName: user.FirstName,
		MI: user.MI,
		Email: user.Email,
		Status: user.Status,
		Access: user.Access
	}

	for (let key of Object.keys(entry)) {
		if (entry[key] === undefined) {
			delete entry[key]
		}
	}

	if (!entry.SAPIN)
		throw 'Must provide nonzero SAPIN';

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

export async function updateUser(userId, user) {
	let entry = {
		SAPIN: user.SAPIN,
		Name: user.Name,
		LastName: user.LastName,
		FirstName: user.FirstName,
		MI: user.MI,
		Email: user.Email,
		Status: user.Status,
		Access: user.Access
	}

	for (let key of Object.keys(entry)) {
		if (entry[key] === undefined) {
			delete entry[key]
		}
	}

	if (Object.keys(entry).length) {
		const SQL =
			db.format("UPDATE users SET ? WHERE SAPIN=?;",  [entry, userId]) +
			db.format("SELECT ?? from users WHERE SAPIN=?;", [Object.keys(entry), entry.SAPIN? entry.SAPIN: userId])
		const [noop, users] = await db.query(SQL)
		entry = users[0]
		if (entry.SAPIN === undefined) {
			entry.SAPIN = userId
		}
	}

	return {user: entry}
}

export async function deleteUsers(users) {
	const sapins = users.map(u => u.SAPIN);
	await db.query('DELETE FROM users WHERE SAPIN IN (?)', [sapins]);
	return true;
}

export async function uploadUsers(file) {
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
		//Affiliation: u.Affiliation,
		//Employer: u.Employer
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
