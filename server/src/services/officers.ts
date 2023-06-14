import { v4 as uuid } from 'uuid';
import { isPlainObject } from '../utils';

import db from '../utils/database';
import type { OkPacket } from 'mysql2';
import type { User } from './users';
import { Group, getGroups } from './groups';

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
	parentGroupId?: string;
	id?: string | string[];
	group_id?: string | string[];
	sapin?: number | number[];
	position?: string | string[];
};

export function getOfficers(constraints?: OfficerQueryConstraints) {
	let sql =
		'SELECT ' + 
			'BIN_TO_UUID(officers.id) AS `id`,' +
			'BIN_TO_UUID(officers.group_id) AS `group_id`, ' +
			'officers.sapin, ' +
			'officers.position ' +
		'FROM officers';

	if (constraints && Object.keys(constraints).length > 0) {
		if (constraints.parentGroupId) {
			sql += db.format(' LEFT JOIN organization org ON org.id=officers.group_id WHERE BIN_TO_UUID(org.parent_id)=?', [constraints.parentGroupId]);
			delete constraints.parentGroupId;
			if (Object.keys(constraints).length > 1)
				sql += ' AND ';
		}
		else {
			sql += ' WHERE ';
		}
		sql += Object.entries(constraints).map(
			([key, value]) => 
				(key === 'id' || key === 'group_id')?
					db.format(Array.isArray(value)? 'BIN_TO_UUID(??) IN (?)': 'BIN_TO_UUID(??)=?', [key, value]):
					db.format(Array.isArray(value)? '?? IN (?)': '??=?', [key, value])
		).join(' AND ');
	}

	return db.query(sql) as Promise<Officer[]>;
}

function validateOfficer(officer: any): asserts officer is Officer {
	if (!isPlainObject(officer))
		throw new TypeError("Invalid officer; expected object");
	if (!officer.group_id || typeof officer.group_id !== 'string')
		throw new TypeError("Invlid group_id field in officer object; must specify group");
	if (typeof officer.sapin !== 'number')
		throw new TypeError("Invlid sapin field in officer object; must provide integer");
}

export function validateOfficers(officers: any): asserts officers is Officer[] {
	if (!Array.isArray(officers))
		throw TypeError("Bad or missing body; expected an array of officer objects");
	officers.every(validateOfficer);
}

/**
 * Add officer.
 * 
 * @param officer An officer object
 * @returns An object representing the officer as added
 */
async function addOfficer({id, group_id, ...rest}: Officer): Promise<Officer> {

	if (!id)
		id = uuid();

	let sql = db.format('INSERT INTO officers SET id=UUID_TO_BIN(?)', [id]);
	if (group_id)
		sql += db.format(', group_id=UUID_TO_BIN(?)', [group_id]);
	if (Object.keys(rest).length > 0)
		sql += db.format(', ?', [rest]);

	await db.query(sql);

	const [officer] = await getOfficers({id});
	return officer;
}

async function validateGroupIds(user: User, workingGroupId: string, groupIds: string[]) {
	console.log(groupIds)
	const groups = await getGroups(user, {id: groupIds});
	if (groups.length !== groupIds.length)
		throw new TypeError("Invalid group_id; group not found");
	if (!groups.every(group => group.id === workingGroupId || group.parent_id === workingGroupId))
		throw new TypeError("Invalid group_id; must be working group or subgroup of working group");
}

/**
 * Add officers.
 * 
 * @param officers - An array of officer objects
 * @returns An array of officer objects as added
 */
export async function addOfficers(user: User, workingGroup: Group, officers: Officer[]) {

	// Valid the groupId for each officer
	const groupIds = new Set<string>();
	officers.forEach(officer => {
		if (!officer.group_id)
			throw new TypeError("Bad or missing group_id; must specify group");
		groupIds.add(officer.group_id);
	});
	validateGroupIds(user, workingGroup.id, [...groupIds]);

	return Promise.all(officers.map(addOfficer));
}

/**
 * Update officer.
 * 
 * @param update Update object with shape {id, changes}
 * @param update.id Officer identifier
 * @param update.changes Partial officer object with parameters to change
 * @returns Officer object as updated
 */
async function updateOfficer({id, changes}: Update<Officer>): Promise<Officer> {

	if (Object.keys(changes).length > 0)
		await db.query('UPDATE officers SET ? WHERE id=UUID_TO_BIN(?)', [changes, id]);

	const [officer] = await getOfficers({id});
	return officer;
}

function validOfficerUpdate(update: any): update is Update<Officer> {
	return isPlainObject(update) &&
		update.id && typeof update.id === 'string' &&
		isPlainObject(update);
}

export function validateOfficerUpdates(updates: any): asserts updates is Update<Officer>[] {
	if (!Array.isArray(updates) || !updates.every(validOfficerUpdate))
		throw new TypeError("Invalid updates; expect and array of objects with shape {id: string, changes: object}");
}

/**
 * Update officers.
 * 
 * @param updates An array of objects with shape {id, changes}
 * @returns An array of officer objects as updated
 */
export function updateOfficers(user: User, workingGroup: Group, updates: Update<Officer>[]) {

	const groupIds = new Set<string>();
	updates.forEach(({changes}) => {
		if (changes.group_id)
			groupIds.add(changes.group_id);
	})
	if (groupIds.size > 0)
		validateGroupIds(user, workingGroup.id, [...groupIds]);

	return Promise.all(updates.map(updateOfficer));
}

export function validateOfficerIds(ids: any): asserts ids is string[] {
	if (!Array.isArray(ids) || ids.every(id => typeof id !== 'string'))
		throw new TypeError("Invalid array of officer identifiers; expected string[]");
}

/**
 * Delete officers.
 * 
 * @param ids An array of officer identifiers
 * @returns number of deleted officers
 */
export async function removeOfficers(user: User, workingGroup: Group, ids: string[]): Promise<number> {
	const result = await db.query(
		'DELETE officers FROM officers LEFT JOIN organization org ON officers.group_id=org.id WHERE BIN_TO_UUID(officers.id) IN (?) AND UUID_TO_BIN(?) IN (org.id, org.parent_id)',
		[ids, workingGroup.id]
	) as OkPacket;
	return result.affectedRows;
}
