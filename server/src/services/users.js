
import {AccessLevel} from '../auth/access'

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

export function getUsers(user) {
	const fields = ['SAPIN', 'Name', 'LastName', 'FirstName', 'MI', 'Status'];

	/* Email and Access level are sensitive */
	if (user.Access >= AccessLevel.WGAdmin)
		fields.push('Email', 'Access')

	return db.query('SELECT ?? FROM users', [fields]);
}

export async function getUser(sapin, email) {
	let SQL
	if (sapin > 0) {
		SQL = db.format('SELECT * from users WHERE SAPIN=?', [sapin]);
	}
	else {
		SQL = db.format('SELECT * from users WHERE Email=?', [email]);
	}
	console.log(SQL)
	const [rows] = await db.query2(SQL)
	console.log(rows)
	const user = rows.length > 0? rows[0]: null
	return user
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

	if (!entry.hasOwnProperty('SAPIN')) {
		throw 'Must provide SAPIN'
	}

	const SQL = 
		db.format('INSERT INTO users (??) VALUES (?);', [Object.keys(entry), Object.values(entry)]) +
		db.format('SELECT * FROM users WHERE SAPIN=?;', [entry.SAPIN])
	const results = await db.query(SQL)
	return results[1][0]
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
		const results = await db.query(SQL)
		entry = results[1][0]
		if (entry.SAPIN === undefined) {
			entry.SAPIN = userId
		}
	}

	return entry
}

export function deleteUsers(userIds) {
	return db.query('DELETE FROM users WHERE SAPIN IN (?)', [userIds])
}

export async function uploadUsers(file) {
	const users = parseUsersCsv(file.buffer)
	//console.log(users)

	let SQL = ''
	if (users.length) {
		SQL =
			`INSERT INTO users (${Object.keys(users[0])}) VALUES ` +
			users.map(u => {return '(' + db.escape(Object.values(u)) + ')'}).join(',') +
			' ON DUPLICATE KEY UPDATE ' +
			'Name=VALUES(Name), LastName=VALUES(LastName), FirstName=VALUES(FirstName), MI=VALUES(MI), Email=VALUES(Email), Status=VALUES(Status);'
	}
	SQL += 'SELECT * FROM users;'
	const results = await db.query(SQL)
	return results[results.length - 1]
}
