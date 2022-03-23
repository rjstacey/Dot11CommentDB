
import { v4 as uuid } from 'uuid';

const db = require('../util/database');

export function getGroups(constraints) {
	let sql =
		'SELECT ' + 
			'BIN_TO_UUID(`id`) AS `id`,' +
			'BIN_TO_UUID(`parent_id`) AS `parent_id`, ' +
			'`name` ' +
		'FROM `groups`';
	if (constraints) {
		sql += ' WHERE ' + Object.entries(constraints).map(
			([key, value]) => db.format(Array.isArray(value)? '?? IN (?)': '??=?', [key, value])
		).join(' AND ');
	}
	return db.query(sql);
}

async function addGroup({id, parent_id, ...rest}) {
	if (!id)
		id = uuid();

	let sql = db.format('INSERT INTO `groups` SET `id`=UUID_TO_BIN(?)', [id]);
	if (parent_id)
		sql += db.format(', `parent_id`=UUID_TO_BIN(?)', [parent_id]);
	if (Object.keys(rest).length > 0)
		sql += db.format(', ?', [rest]);

	await db.query(sql);

	return getGroups({id});
}

export function addGroups(groups) {
	return Promise.all(groups.map(addGroup));
}

async function updateGroup(update) {
	const {id, changes} = update;
	if (!id)
		throw TypeError('Missing id in update');
	await db.query('UPDATE `groups` SET ? WHERE `id`=UUID_TO_BIN(?)', [changes, id]);
	return getGroups({id});
}

export function updateGroups(updates) {
	return Promise.all(updates.map(updateGroup));
}

export async function removeGroups(ids) {
	const result = await db.query('DELETE FROM `groups` WHERE BIN_TO_UUID(`id`) IN (?)', [ids]);
	return result.affectedRows;
}
