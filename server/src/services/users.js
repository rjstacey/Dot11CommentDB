/*
 * Maintain users cache
 */
const db = require('../util/database')

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

export const setUser = (sapin, user) => userCache[sapin] = user;

export const delUser = (sapin) => delete userCache[sapin];
