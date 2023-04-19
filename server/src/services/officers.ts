import { v4 as uuid } from 'uuid';
import { isPlainObject } from '../utils';

import db from '../utils/database';
import type { OkPacket } from 'mysql2';

interface Officer {
	id: string;
	group_id: string;
	sapin: number;
	position: string;
}

interface Update<T> {
	id: string;
	changes: Partial<T>;
}

interface OfficerQueryConstraints {
	id?: string | string[];
	group_id?: string | string[];
	sapin?: number | number[];
	position?: string | string[];
};

export function getOfficers(constraints?: OfficerQueryConstraints) {
	let sql =
		'SELECT ' + 
			'BIN_TO_UUID(`id`) AS `id`,' +
			'BIN_TO_UUID(`group_id`) AS `group_id`, ' +
			'sapin, ' +
			'position ' +
		'FROM `officers`';

	if (constraints) {
		sql += ' WHERE ' + Object.entries(constraints).map(
			([key, value]) => 
				(key === 'id' || key === 'group_id')?
					db.format(Array.isArray(value)? 'BIN_TO_UUID(??) IN (?)': 'BIN_TO_UUID(??)=?', [key, value]):
					db.format(Array.isArray(value)? '?? IN (?)': '??=?', [key, value])
		).join(' AND ');
	}

	return db.query(sql) as Promise<Officer[]>;
}

async function addOfficer({id, group_id, ...rest}: Officer): Promise<Officer> {
	if (!id)
		id = uuid();

	let sql = db.format('INSERT INTO `officers` SET `id`=UUID_TO_BIN(?)', [id]);
	if (group_id)
		sql += db.format(', `group_id`=UUID_TO_BIN(?)', [group_id]);
	if (Object.keys(rest).length > 0)
		sql += db.format(', ?', [rest]);

	await db.query(sql);

	const [officer] = await getOfficers({id});
	return officer;
}

export function addOfficers(officers: Officer[]) {
	return Promise.all(officers.map(addOfficer));
}

async function updateOfficer({id, changes}: Update<Officer>): Promise<Officer> {
	if (!id)
		throw new TypeError('Missing id in update');
	if (!isPlainObject(changes))
		throw new TypeError('Missing or bad changes object in update');

	if (Object.keys(changes).length > 0)
		await db.query('UPDATE `officers` SET ? WHERE `id`=UUID_TO_BIN(?)', [changes, id]);

	const [officer] = await getOfficers({id});
	return officer;
}

export function updateOfficers(updates: Update<Officer>[]) {
	return Promise.all(updates.map(updateOfficer));
}

export async function removeOfficers(ids: string[]): Promise<number> {
	const result = await db.query('DELETE FROM `officers` WHERE BIN_TO_UUID(`id`) IN (?)', [ids]) as OkPacket;
	return result.affectedRows;
}
