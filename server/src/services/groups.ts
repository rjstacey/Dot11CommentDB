
import { v4 as uuid } from 'uuid';

import db from '../utils/database';
import type { OkPacket } from 'mysql2';
import { isPlainObject } from '../utils';
import { User } from './users';
import { getOfficers } from './officers';
import { AccessLevel } from '../auth/access';

const GroupTypeLabels = {
	c: 'Committee',
	wg: 'Working Group',
	tg: 'Task Group',
	sg: 'Study Group',
	sc: 'Standing Committee',
	ah: 'Ad-hoc Group'
};

export type GroupType = keyof typeof GroupTypeLabels;

export interface Group {
	id: string;
	parent_id: string | null;
	name: string;
	type: GroupType | null;
	status: string;
	color: string;
	symbol: string | null;
	project: string | null;
	permissions: Record<string, number>;
}

interface Update<T> {
	id: string;
	changes: Partial<T>;
}

interface OrganizationQueryConstraints {
	parentName?: string;
	id?: string | string[];
	parent_id?: string | string[];
	name?: string | string[];
	type?: string | string[];
	status?: string | string[];
	color?: string | string[];
	symbol?: string | string[];
};

export async function getGroups(user: User, constraints?: OrganizationQueryConstraints) {
	let sql =
		'SELECT ' + 
			'BIN_TO_UUID(o1.id) AS id,' +
			'BIN_TO_UUID(o1.parent_id) AS parent_id, ' +
			'o1.`name`, ' +
			'o1.`type`, ' +
			'o1.`status`, ' +
			'o1.`color`, ' +
			'o1.`symbol`, ' +
			'o1.`project` ' +
		'FROM organization o1';
		
	if (constraints) {
		const {parentName, ...rest} = constraints;
		const wheres: string[] = [];
		if (parentName) {
			sql += ' LEFT JOIN organization o2 ON o1.parent_id=o2.id';
			wheres.push(db.format('(o1.name=? OR o2.name=?)', [parentName, parentName]));
		}
		Object.entries(rest).forEach(([key, value]) => {
			wheres.push(
				(key === 'id' || key === 'parent_id')?
					db.format(Array.isArray(value)? 'BIN_TO_UUID(o1.??) IN (?)': 'BIN_TO_UUID(o1.??)=?', [key, value]):
					db.format(Array.isArray(value)? 'o1.?? IN (?)': 'o1.??=?', [key, value])
			);
		});
		if (wheres.length > 0)
			sql += ' WHERE ' + wheres.join(' AND ');
	}

	const groupTypes = Object.keys(GroupTypeLabels);
	let groups = await db.query(sql) as Group[];
	groups = await Promise.all(
			groups.map(async (group) => {
				const permissions = await getUserGroupPermissions(user, group);
				return {...group, permissions};
			})
		);
	groups = groups
		.sort((g1, g2) => {
			const n = groupTypes.indexOf(g1.type || '') - groupTypes.indexOf(g2.type || '');
			if (n === 0)
				return g1.name? g1.name.localeCompare(g2.name): 0;
			return n;
		});
	return groups;
}

export async function getGroup(user: User, name: string): Promise<Group | undefined> {
	const groups = await getGroups(user, {name});
	return groups[0];
}

export async function getWorkingGroup(user: User, groupId: string): Promise<Group | undefined> {
	const group = await getGroup(user, groupId);
	if (group &&
		group.type &&
		group.type.search(/^(tg|sg|sc|ah)/) !== -1 &&
		group.parent_id) {
		return getGroup(user, group.parent_id);
	}
	return group;
}

/* Permission sets */
const permWgOfficer: Record<string, number> = {
	users: AccessLevel.admin,
	members: AccessLevel.admin,
	meetings: AccessLevel.admin,
	groups: AccessLevel.admin,
	ballots: AccessLevel.admin,
	voters: AccessLevel.admin,
	results: AccessLevel.admin,
	comments: AccessLevel.admin
};

const permTgOfficer: Record<string, number> = {
	users: AccessLevel.ro,
	groups: AccessLevel.ro,
	ballots: AccessLevel.ro,
	voters: AccessLevel.ro,
	results: AccessLevel.rw,
	comments: AccessLevel.rw
};

const permMember: Record<string, number> = {
	users: AccessLevel.ro,
	groups: AccessLevel.ro,
	ballots: AccessLevel.ro,
	voters: AccessLevel.none,
	results: AccessLevel.none,
	comments: AccessLevel.ro
};

export async function getUserGroupPermissions(user: User, group: Group) {
	let permissions: Record<string, number> = permMember;
	if (group.type === "wg") {
		const officers = await getOfficers({group_id: group.id});
		if (officers.find(officer => officer.sapin === user.SAPIN))
			permissions = permWgOfficer;
	}
	else if (["tg", "sg", "sc", "ah"].includes(group.type!) && group.parent_id) {
		let officers = await getOfficers({group_id: group.id});
		if (officers.find(officer => officer.sapin === user.SAPIN))
			permissions = permTgOfficer;
		officers = await getOfficers({group_id: group.parent_id});
		if (officers.find(officer => officer.sapin === user.SAPIN))
			permissions = permWgOfficer;
	}
	//console.log(group.name, permissions)
	return permissions;
}

function groupSetSql(group: Partial<Group>) {

	// Only parameters that exist in database
	const {id, parent_id, name, type, status, color, symbol, project, ...rest} = group;
	if (Object.keys(rest).length)
		console.warn("Superfluous parameters: ", rest);
	const groupDB = {id, parent_id, name, type, status, color, symbol, project};
	for (const key of Object.keys(groupDB)) {
		if (typeof groupDB[key] === 'undefined')
			delete groupDB[key];
	}

	const sets: string[] = [];
	for (const [key, value] of Object.entries(groupDB)) {
		let sql: string;
		if (key === 'id' || key === 'parent_id')
			sql = db.format('??=UUID_TO_BIN(?)', [key, value]);
		else
			sql = db.format('??=?', [key, value]);
		sets.push(sql);
	}

	return sets.join(', ');
}

async function addGroup(user: User, {id, ...rest}: Group): Promise<Group> {
	if (!id)
		id = uuid();

	let sql = 'INSERT INTO organization SET ' + groupSetSql({id, ...rest});
	console.log(sql)
	await db.query(sql);

	const groups = await getGroups(user, {id});
	return groups[0];
}

function validGroup(group: any): group is Group {
	if (!isPlainObject(group))
		return false;
	if ('id' in group && typeof group.id !== 'string')
		return false;
	if ('parent_id' in group && (group.parent_id !== null || typeof group.parent_id !== 'string'))
		return false;
	if ('name' in group && (group.name !== null || typeof group.name !== 'string'))
		return false;
	return true;
}

function validGroups(groups: any): groups is Group[] {
	return Array.isArray(groups) && groups.every(validGroup);
}

export function addGroups(user: User, groups: any) {

	if (!validGroups(groups))
		throw new TypeError('Bad or missing array of group objects');

	return Promise.all(groups.map(g => addGroup(user, g)));
}

async function updateGroup(user: User, {id, changes}: Update<Group>): Promise<Group> {

	let setSql = groupSetSql(changes);
	if (setSql)
		await db.query('UPDATE organization SET ' + setSql + ' WHERE `id`=UUID_TO_BIN(?)', [id])

	id = changes.id || id;
	const groups = await getGroups(user, {id});
	return groups[0];
}

function validUpdate(update: any): update is Update<Group> {
	return isPlainObject(update) &&
		update.id && typeof update.id === 'string' &&
		isPlainObject(update.changes);
}

function validUpdates(updates: any): updates is Update<Group>[] {
	return Array.isArray(updates) && updates.every(validUpdate);
}

export function updateGroups(user: User, updates: Update<Group>[]) {

	if (!validUpdates(updates))
		throw new TypeError('Bad or missing array of group updates; expected array of objects with shape {id: string, changes: object}');

	return Promise.all(updates.map(u => updateGroup(user, u)));
}

function validIds(ids: any): ids is string[] {
	return Array.isArray(ids) && ids.every(id => typeof id === 'string');
}

export async function removeGroups(user: User, ids: any): Promise<number> {

	if (!validIds(ids))
		throw new TypeError('Bad or missing array of group identifiers; expected string[]');

	const result1 = await db.query('DELETE FROM officers WHERE BIN_TO_UUID(group_id) IN (?)', [ids]) as OkPacket;
	const result2 = await db.query('DELETE FROM organization WHERE BIN_TO_UUID(id) IN (?)', [ids]) as OkPacket;
	return result1.affectedRows + result2.affectedRows;
}
