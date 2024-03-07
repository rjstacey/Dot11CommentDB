
import { v4 as uuid } from 'uuid';

import db from '../utils/database';
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { ForbiddenError, NotFoundError, isPlainObject } from '../utils';
import { User } from './users';
import { AccessLevel } from '../auth/access';
import { getBallots } from './ballots';
import { getSessions } from './sessions';

const GroupTypeLabels = {
	r: 'Root',
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

// prettier-ignore
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
 * Get group and subgroup identifiers
 * @param id - The group identifier
 * @returns An array of group identifiers that includes the group and all its subgroups
 */
export async function getGroupAndSubgroupIds(id: string) {
	const sql = `
		WITH RECURSIVE cte (id, parent_id) AS (
			SELECT id, parent_id
				FROM organization
				WHERE id=UUID_TO_BIN(${db.escape(id)})
			UNION ALL
			SELECT org.id, org.parent_id
				FROM organization org
				INNER JOIN cte on cte.id=org.parent_id
		)
		SELECT BIN_TO_UUID(id) as id FROM cte`;
	return (await db.query<(RowDataPacket & {id: string})[]>(sql)).map(g => g.id);
}

/**
 * Get group and subgroup identifiers
 * @param groupName - The name of the group
 * @returns An array of group identifiers that includes the group and all its subgroups
 */
export async function getGroupAndSubgroupIdsByName(groupName: string) {
	const sql = `
		WITH RECURSIVE cte (id, parent_id) AS (
			SELECT id, parent_id
				FROM organization
				WHERE name=${db.escape(groupName)}
			UNION ALL
			SELECT org.id, org.parent_id
				FROM organization org
				INNER JOIN cte on cte.id=org.parent_id
		)
		SELECT BIN_TO_UUID(id) as id FROM cte`;

	return (await db.query<(RowDataPacket & {id: string})[]>(sql)).map(g => g.id);
}

/**
 * Get identified groups and their parents
 * @param ids A list of group indentifiers
 * @returns An array of group objects (without user permissions)
 */
function getGroupsAndParentGroups(ids: string[]): Promise<Group[]> {

	const sql = `
		WITH RECURSIVE cte AS (
			SELECT id, parent_id
				FROM organization
				WHERE BIN_TO_UUID(id) IN (${db.escape(ids)})
			UNION ALL
			SELECT org.id, org.parent_id
				FROM organization org
				INNER JOIN cte ON org.id=cte.parent_id
		)
		${selectGroupsSql} WHERE org.id IN (SELECT id FROM cte)`;

	return db.query<(RowDataPacket & Group)[]>(sql);
}


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

/**
 * Rollup user permissions for a group
 * (parent permissions are inherited by its children)
 * @param user User for which the permissions apply
 * @param group Group for which the permissions apply
 * @param groupEntities Group entity record that includes all parents (ancestors) of the group
 * @returns The rolled up permissions for the group
 */
function rollupGroupUserPermissions(user: User, group: Group, groupEntities: Record<string, Group>) {
	const permissions = {...getGroupUserPermissions(user, group)};
	const parent = group.parent_id? groupEntities[group.parent_id]: undefined;
	if (parent) {
		const parentPermissions = rollupGroupUserPermissions(user, parent, groupEntities);
		Object.entries(parentPermissions).forEach(([scope, access]) => {
			if (!permissions[scope] || permissions[scope] < access)
				permissions[scope] = access;
		});
	}
	return permissions;
}

/**
 * Get a list of groups for the provided constraints.
 * 
 * @param user The user executing the query
 * @param constraints (Optional) Constraints on the query
 * @param constraints.parentName (Optional) Group and subgroups with the parent with this name
 * @returns An array of group objects that includes the user permissions for each group
 */
export async function getGroups(user: User, constraints?: OrganizationQueryConstraints) {
	let sql = selectGroupsSql;

	if (constraints) {
		const {parentName, ...rest} = constraints;
		const wheres: string[] = [];
		if (parentName) {
			const ids = await getGroupAndSubgroupIdsByName(parentName);
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

	let groups: Group[] = await db.query<(RowDataPacket & Group)[]>(sql);

	// Normalize
	const groupEntities: Record<string, Group> = {};
	for (const group of groups)
		groupEntities[group.id] = group;

	// Get a list of parents that are missing
	const ids = groups
		.map(group => group.parent_id)
		.filter(parent_id => parent_id !== null && !groupEntities[parent_id]) as string[];

	// If any parents are missing, add them and their ancestors
	// (we need this to correctly roll up permissions)
	if (ids.length > 0) {
		let parentGroups = await getGroupsAndParentGroups(ids);
		for (const group of parentGroups)
			groupEntities[group.id] = group;

		groups = groups.concat(parentGroups);
	}

	// Roll up group user permissions
	for (const group of groups)
		group.permissions = rollupGroupUserPermissions(user, group, groupEntities);

	return groups;
}

/**
 * Get group and subgroups 
 * @param user - The user executing the query
 * @param id - The group identifier
 * @returns An array of groups where the first entry is the group and successive entries the parents
 */
export async function getGroupHierarchy(user: User, id: string): Promise<Group[]> {

	let groups = await getGroupsAndParentGroups([id]);
	if (groups.length === 0)
		throw new NotFoundError(`Group id=${id} not found`);

	// Normalize
	const groupEntities: Record<string, Group> = {};
	for (const group of groups)
		groupEntities[group.id] = group;

	// The order is import here; make sure the first entry is the identified group
	groups = [];
	let group: Group | undefined = groupEntities[id];
	do {
		// Roll up group user permissions
		group.permissions = rollupGroupUserPermissions(user, group, groupEntities);
		groups.push(group);
		group = group.parent_id? groupEntities[group.parent_id]: undefined;
	} while (group);

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

/* Permission sets */
const rootPermissions: Record<string, number> = {
	users: AccessLevel.admin,
	members: AccessLevel.admin,
	meetings: AccessLevel.admin,
	groups: AccessLevel.admin,
	ballots: AccessLevel.admin,
	voters: AccessLevel.admin,
	results: AccessLevel.admin,
	comments: AccessLevel.admin
};

const wgOfficerPermissions: Record<string, number> = {
	users: AccessLevel.admin,
	members: AccessLevel.admin,
	meetings: AccessLevel.admin,
	groups: AccessLevel.admin,
	ballots: AccessLevel.admin,
	voters: AccessLevel.admin,
	results: AccessLevel.admin,
	comments: AccessLevel.admin
};

const tgOfficerPermissions: Record<string, number> = {
	users: AccessLevel.ro,
	groups: AccessLevel.ro,
	ballots: AccessLevel.ro,
	voters: AccessLevel.ro,
	results: AccessLevel.rw,
	comments: AccessLevel.rw
};

const memberPermissions: Record<string, number> = {
	users: AccessLevel.ro,
	groups: AccessLevel.ro,
	ballots: AccessLevel.ro,
	comments: AccessLevel.ro
};

function getGroupUserPermissions(user: User, group: Group) {
	if (group.type === 'r' && group.officerSAPINs.includes(user.SAPIN))
		return rootPermissions;
	else if (["wg", "c"].includes(group.type!) && group.officerSAPINs.includes(user.SAPIN))
		return wgOfficerPermissions;
	else if (["tg", "sg", "sc", "ah"].includes(group.type!) && group.officerSAPINs.includes(user.SAPIN))
		return tgOfficerPermissions;
	return memberPermissions;
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
	if (updates.find(u => u.id === "00000000-0000-0000-0000-000000000000")) {
		throw new ForbiddenError("Can't update root entry");
	}
	return Promise.all(updates.map(u => updateGroup(user, u)));
}

export function validateGroupIds(ids: any): asserts ids is string[] {
	if (!Array.isArray(ids) || !ids.every(id => typeof id === 'string'))
		throw new TypeError('Bad or missing array of group identifiers; expected string[]');
}

export async function removeGroups(user: User, ids: string[]): Promise<number> {
	if (ids.includes("00000000-0000-0000-0000-000000000000")) {
		throw new ForbiddenError("Can't delete root entry");
	}

	// Can't delete if the group has subgroups that are not also being deleted
	let undeletedChildIds: string[] = [];
	for (const id of ids) {
		const childIds = await getGroupAndSubgroupIds(id);
		for (const childId of childIds) {
			if (!ids.includes(childId))
				undeletedChildIds.push(childId);
		}
	}
	if (undeletedChildIds.length > 0) {
		throw new TypeError("One or more of the groups has a subgroup that would be orphaned");
	}

	// Can't delete if the group is referenced
	const ballots = await getBallots({groupId: ids});
	if (ballots.length) {
		throw new TypeError("One or more of the groups has a ballot associated with it. These need to be deleted first.")
	}
	const seesions = await getSessions({groupId: ids});
	if (seesions.length > 0) {
		throw new TypeError("One or more of the groups has a session associated with it. These need to be deleted first.")
	}

	const result1 = await db.query<ResultSetHeader>('DELETE FROM officers WHERE BIN_TO_UUID(group_id) IN (?)', [ids]);
	const result2 = await db.query<ResultSetHeader>('DELETE FROM organization WHERE BIN_TO_UUID(id) IN (?)', [ids]);
	return result1.affectedRows + result2.affectedRows;
}
