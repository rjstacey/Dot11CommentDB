
import { v4 as uuid } from 'uuid';

import db from '../utils/database';
import type { OkPacket } from 'mysql2';

export interface Group {
	id: string;
	parent_id: string;
	name: string;
	type: string;
	status: string;
	color: string;
	symbol: string;
}

interface Update<T> {
	id: string;
	changes: Partial<T>;
}

interface OrganizationQueryConstraints {
	id?: string | string[];
	parent_id?: string | string[];
	name?: string | string[];
	type?: string | string[];
	status?: string | string[];
	color?: string | string[];
	symbol?: string | string[];
};

export function getGroups(constraints?: OrganizationQueryConstraints) {
	let sql =
		'SELECT ' + 
			'BIN_TO_UUID(`id`) AS `id`,' +
			'BIN_TO_UUID(`parent_id`) AS `parent_id`, ' +
			'`name`, ' +
			'`type`, ' +
			'`status`, ' +
			'`color`, ' +
			'`symbol` ' +
		'FROM `organization`';

	if (constraints) {
		sql += ' WHERE ' + Object.entries(constraints).map(
			([key, value]) => 
				(key === 'id' || key === 'parent_id')?
					db.format(Array.isArray(value)? 'BIN_TO_UUID(??) IN (?)': 'BIN_TO_UUID(??)=?', [key, value]):
					db.format(Array.isArray(value)? '?? IN (?)': '??=?', [key, value])
		).join(' AND ');
	}

	return db.query(sql) as Promise<Group[]>;
}

export async function getGroup(groupId: string): Promise<Group | undefined> {
	const groups = await getGroups({id: groupId});
	return groups[0];
}

export async function getWorkingGroup(groupId: string): Promise<Group | undefined> {
	const group = await getGroup(groupId);
	if (group &&
		group.type.search(/^(tg|sg|sc|ah)/) !== -1 &&
		group.parent_id) {
		return getGroup(group.parent_id);
	}
	return group;
}

async function addGroup({id, parent_id, ...rest}: Group): Promise<Group> {
	if (!id)
		id = uuid();

	let sql = db.format('INSERT INTO organization SET `id`=UUID_TO_BIN(?)', [id]);
	if (parent_id)
		sql += db.format(', `parent_id`=UUID_TO_BIN(?)', [parent_id]);
	if (Object.keys(rest).length > 0)
		sql += db.format(', ?', [rest]);

	await db.query(sql);

	const groups = await getGroups({id});

	return groups[0];
}

export function addGroups(groups: Group[]) {
	return Promise.all(groups.map(addGroup));
}

async function updateGroup({id, changes}: Update<Group>): Promise<Group> {

	if (!id)
		throw TypeError('Missing id in update');

	const sets: string[] = [];
	for (const [key, value] of Object.entries(changes)) {
		let sql: string;
		if (key === 'parent_id')
			sql = db.format('??=UUID_TO_BIN(?)', [key, value]);
		else
			sql = db.format('??=?', [key, value]);
		sets.push(sql);
	}

	if (sets.length !== 0)
		await db.query('UPDATE organization SET ' + sets.join(', ') + ' WHERE `id`=UUID_TO_BIN(?)', [id])

	const groups = await getGroups({id});

	return groups[0];
}

export function updateGroups(updates: Update<Group>[]) {
	return Promise.all(updates.map(updateGroup));
}

export async function removeGroups(ids: string[]): Promise<number> {
	const result1 = await db.query('DELETE FROM officers WHERE BIN_TO_UUID(group_id) IN (?)', [ids]) as OkPacket;
	const result2 = await db.query('DELETE FROM organization WHERE BIN_TO_UUID(id) IN (?)', [ids]) as OkPacket;
	return result1.affectedRows + result2.affectedRows;
}
