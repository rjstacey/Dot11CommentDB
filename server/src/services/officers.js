
import { v4 as uuid } from 'uuid';

const db = require('../util/database');

export function getOfficers(constraints) {
	let sql =
		'SELECT ' + 
			'BIN_TO_UUID(`id`) AS `id`,' +
			'BIN_TO_UUID(`group_id`) AS `group_id`, ' +
			'sapin, ' +
			'position ' +
		'FROM `officers`';
	if (constraints) {
		sql += ' WHERE ' + Object.entries(constraints).map(
			([key, value]) => db.format(Array.isArray(value)? '?? IN (?)': '??=?', [key, value])
		).join(' AND ');
	}
	return db.query(sql);
}

async function addOfficer({id, group_id, ...rest}) {
	if (!id)
		id = uuid();

	let sql = db.format('INSERT INTO `officers` SET `id`=UUID_TO_BIN(?)', [id]);
	if (group_id)
		sql += db.format(', `group_id`=UUID_TO_BIN(?)', [group_id]);
	if (Object.keys(rest).length > 0)
		sql += db.format(', ?', [rest]);

	await db.query(sql);

	return getOfficers({id});
}

export function addOfficers(officers) {
	return Promise.all(officers.map(addOfficer));
}

async function updateOfficer({id, changes}) {
	if (!id)
		throw TypeError('Missing id in update');
	await db.query('UPDATE `officers` SET ? WHERE `id`=UUID_TO_BIN(?)', [changes, id]);
	return getOfficers({id});
}

export function updateOfficers(updates) {
	return Promise.all(updates.map(updateOfficer));
}

export async function removeOfficers(ids) {
	const result = await db.query('DELETE FROM `officers` WHERE BIN_TO_UUID(`id`) IN (?)', [ids]);
	return result.affectedRows;
}
