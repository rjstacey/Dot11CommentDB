const db = require('../util/database')
const csvParse = require('csv-parse/lib/sync')

function parseUsersCsv(usersCsv) {

	const p = csvParse(usersCsv, {columns: false})
	if (p.length === 0) {
		throw 'Got empty membership.csv';
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

function getUsers() {
	return db.query('SELECT * FROM users')
}

async function getAccessLevel(sapin, email) {
	var SQL
	if (sapin > 0) {
		SQL = db.format('SELECT * from users WHERE SAPIN=?', [sapin]);
	}
	else {
		SQL = db.format('SELECT * from users WHERE Email=?', [email]);
	}
	console.log(SQL)
	const results = await db.query(SQL)
	return results.length > 0? results[0].Access: 0
}

async function addUser(user) {
	let entry = {
		SAPIN: user.SAPIN,
		Name: user.Name,
		LastName: user.LastName,
		FirstName: user.FirstName,
		MI: user.MI,
		Email: user.Email,
		Access: user.Access
	}

	Object.keys(entry).forEach(key => {
		if (entry[key] === undefined) {
			delete entry[key]
		}
	})

	if (!entry.SAPIN) {
		throw 'Must provide SAPIN'
	}

	const SQL = 
		db.format('INSERT INTO users (??) VALUES (?);', [Object.keys(entry), Object.values(entry)]) +
		db.format('SELECT * FROM users WHERE SAPIN=?;', [entry.SAPIN])
	const results = await db.query(SQL)
	return results[1][0]
}

async function updateUser(userId, user) {
	let entry = {
		SAPIN: user.SAPIN,
		Name: user.Name,
		LastName: user.LastName,
		FirstName: user.FirstName,
		MI: user.MI,
		Email: user.Email,
		Access: user.Access
	}

	Object.keys(entry).forEach(key => {
		if (entry[key] === undefined) {
			delete entry[key]
		}
	})

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

function deleteUsers(userIds) {
	return db.query('DELETE FROM users WHERE SAPIN IN (?)', [userIds])
}

async function uploadUsers(file) {
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

module.exports = {
	getUsers,
	getAccessLevel,
	addUser,
	updateUser,
	deleteUsers,
	uploadUsers
}
