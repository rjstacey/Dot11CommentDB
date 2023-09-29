
import { v4 as uuid } from 'uuid';

import db from '../utils/database';
import type { OkPacket } from 'mysql2';
import { isPlainObject } from '../utils';
import { User } from './users';
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

/** Group entry */
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
	officerSAPINs: number[];
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

/**
 * Get group identifiers
 * @param parent_id - Parent group identifier
 * @returns An array of group identifiers that includes the group and all its subgroups
 */
export async function getGroupIds(parent_id: string) {
	let ids = [parent_id];
	const sql = db.format(`
		with recursive r_org (id) as (
			select	id
			from	organization
			where	parent_id = UUID_TO_BIN(?)
			union all
			select	o.id
			from	organization o
			inner join r_org on o.parent_id = r_org.id
		)
		select BIN_TO_UUID(id) as id from r_org;
	`, [parent_id]);
	ids = ids.concat(((await db.query(sql)) as {id: string}[]).map(g => g.id));
	return ids;
}

/**
 * Get group and subgroup identifiers
 * @param groupName - The name of the group
 * @returns An array of group identifiers that includes the group and all its subgroups
 */
export async function getGroupAndSubgroupIds(groupName: string) {
	let ids = (await db.query('SELECT BIN_TO_UUID(id) as id FROM organization WHERE name=?', [groupName]) as {id: string}[]).map(g => g.id);
	if (ids.length > 0)
		ids = ids.concat(await getGroupIds(ids[0]));
	return ids;
}

const selectGroupsSql =
	'SELECT ' + 
		'BIN_TO_UUID(org.id) AS id, ' +
		'BIN_TO_UUID(org.parent_id) AS parent_id, ' +
		'org.`name`, ' +
		'org.`type`, ' +
		'org.`status`, ' +
		'org.`color`, ' +
		'org.`symbol`, ' +
		'org.`project`, ' +
		'COALESCE(off.`officerSAPINs`, JSON_ARRAY()) as officerSAPINs ' +
	'FROM organization org ' +
		'LEFT JOIN (SELECT group_id, JSON_ARRAYAGG(SAPIN) AS officerSAPINs FROM officers GROUP BY group_id) AS off ON org.id=off.group_id';


/**
 * Compare function to sort groups by type and then by name
 */
const groupTypes = Object.keys(GroupTypeLabels);
function groupCmp(g1: Group, g2: Group) {
	const n = groupTypes.indexOf(g1.type || '') - groupTypes.indexOf(g2.type || '');
	if (n === 0)
		return g1.name? g1.name.localeCompare(g2.name): 0;
	return n;
}

export async function getGroups(user: User, constraints?: OrganizationQueryConstraints) {
	let sql = selectGroupsSql;

	if (constraints) {
		const {parentName, ...rest} = constraints;
		const wheres: string[] = [];
		if (parentName) {
			const ids = await getGroupAndSubgroupIds(parentName);
			if (ids.length === 0)
				return [];	// No group with that name
			wheres.push(db.format('BIN_TO_UUID(org.id) IN (?)', [ids]));
		}
		Object.entries(rest).forEach(([key, value]) => {
			wheres.push(
				(key === 'id' || key === 'parent_id')?
					db.format(Array.isArray(value)? 'BIN_TO_UUID(org.??) IN (?)': 'BIN_TO_UUID(org.??)=?', [key, value]):
					db.format(Array.isArray(value)? 'org.?? IN (?)': 'org.??=?', [key, value])
			);
		});
		if (wheres.length > 0)
			sql += ' WHERE ' + wheres.join(' AND ');
	}

	let groups = (await db.query(sql) as Group[])
		.sort(groupCmp);
	groups.forEach(group => group.permissions = getGroupUserPermissions(user, group));
	return groups;
}

/**
 * Get group hierarchy 
 * @param user - The user executing the get
 * @param group_id - The group identifier
 * @returns An array of groups where the first entry is the group and successive entries the parents
 */
export async function getGroupHierarchy(user: User, group_id: string): Promise<Group[]> {
	const groups = await db.query(selectGroupsSql + ' WHERE BIN_TO_UUID(org.id)=?', [group_id]) as Group[];
	const group = groups[0];
	if (group) {
		group.permissions = getGroupUserPermissions(user, group);
		if (group.parent_id)
			return groups.concat(await getGroupHierarchy(user, group.parent_id));
	}
	return groups;
}

export async function getGroupByName(user: User, name: string): Promise<Group | undefined> {
	const [group] = await getGroups(user, {name});
	return group;
}

export async function getWorkingGroup(user: User, group_id: string): Promise<Group | undefined> {
	const groups = await getGroupHierarchy(user, group_id);
	return groups.find(group => group.type === "wg");
}

/**
 * Get group rolled up permissions.
 * @param user - The user executing the get
 * @param group_id - The group for which permissions are sought
 * @returns The rolled-up permissions for the group, i.e., the highest permission for each scope from the group or its parents
 */
export async function getGroupRollUpPermissions(user: User, group_id: string): Promise<Record<string, number>> {
	const groups = await getGroupHierarchy(user, group_id);
	const permissions = {};
	groups.forEach(group => {
		Object.entries(group.permissions).forEach(([scope, access]) => {
			if (!permissions[scope] || permissions[scope] < access)
				permissions[scope] = access;
		})
	});
	return permissions;
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
	comments: AccessLevel.ro
};

function getGroupUserPermissions(user: User, group: Group) {
	if (["wg", "c"].includes(group.type!) && group.officerSAPINs.includes(user.SAPIN))
		return permWgOfficer;
	else if (["tg", "sg", "sc", "ah"].includes(group.type!) && group.officerSAPINs.includes(user.SAPIN))
		return permTgOfficer;
	return permMember;
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
	if ('parent_id' in group && group.parent_id !== null && typeof group.parent_id !== 'string')
		return false;
	if ('name' in group && group.name !== null && typeof group.name !== 'string')
		return false;
	return true;
}

export function validateGroups(groups: any): asserts groups is Group[] {
	if (!Array.isArray(groups) || !groups.every(validGroup))
		throw new TypeError('Bad or missing array of group objects');
}

export function addGroups(user: User, groups: Group[]) {
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

function validGroupUpdate(update: any): update is Update<Group> {
	return isPlainObject(update) &&
		update.id && typeof update.id === 'string' &&
		isPlainObject(update.changes);
}

export function validateGroupUpdates(updates: any): asserts updates is Update<Group>[] {
	if (!Array.isArray(updates) || !updates.every(validGroupUpdate))
		throw new TypeError('Bad or missing array of group updates; expected array of objects with shape {id: string, changes: object}');
}

export function updateGroups(user: User, updates: Update<Group>[]) {
	return Promise.all(updates.map(u => updateGroup(user, u)));
}

export function validateGroupIds(ids: any): asserts ids is string[] {
	if (!Array.isArray(ids) || !ids.every(id => typeof id === 'string'))
		throw new TypeError('Bad or missing array of group identifiers; expected string[]');
}

export async function removeGroups(user: User, ids: string[]): Promise<number> {
	const result1 = await db.query('DELETE FROM officers WHERE BIN_TO_UUID(group_id) IN (?)', [ids]) as OkPacket;
	const result2 = await db.query('DELETE FROM organization WHERE BIN_TO_UUID(id) IN (?)', [ids]) as OkPacket;
	return result1.affectedRows + result2.affectedRows;
}
