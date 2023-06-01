
import { v4 as uuid } from 'uuid';

import db from '../utils/database';
import type { OkPacket } from 'mysql2';
import { isPlainObject } from '../utils';

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

export async function getGroups(constraints?: OrganizationQueryConstraints) {
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
		
	if (constraints && Object.keys(constraints).length > 0) {
		const {parentName, ...rest} = constraints;
		if (parentName) {
			sql += db.format(' LEFT JOIN organization o2 ON o1.parent_id=o2.id WHERE o1.name=? OR o2.name=?', [parentName, parentName]);
		}
		else if (Object.keys(rest).length > 0) {
			sql += ' WHERE ' + Object.entries(rest).map(
				([key, value]) => 
					(key === 'id' || key === 'parent_id')?
						db.format(Array.isArray(value)? 'BIN_TO_UUID(??) IN (?)': 'BIN_TO_UUID(??)=?', [key, value]):
						db.format(Array.isArray(value)? '?? IN (?)': '??=?', [key, value])
			).join(' AND ');
		}
	}

	const groupTypes = Object.keys(GroupTypeLabels);
	return (await db.query(sql) as Group[])
		.sort((g1, g2) => {
			const n = groupTypes.indexOf(g1.type || '') - groupTypes.indexOf(g2.type || '');
			if (n === 0)
				return g1.name? g1.name.localeCompare(g2.name): 0;
			return n;
		})
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

export async function getGroup(groupId: string): Promise<Group | undefined> {
	const groups = await getGroups({id: groupId});
	return groups[0];
}

export async function getWorkingGroup(groupId: string): Promise<Group | undefined> {
	const group = await getGroup(groupId);
	if (group &&
		group.type &&
		group.type.search(/^(tg|sg|sc|ah)/) !== -1 &&
		group.parent_id) {
		return getGroup(group.parent_id);
	}
	return group;
}

async function addGroup({id, ...rest}: Group): Promise<Group> {
	if (!id)
		id = uuid();

	let sql = 'INSERT INTO organization SET ' + groupSetSql({id, ...rest});
	console.log(sql)
	await db.query(sql);

	const groups = await getGroups({id});
	return groups[0];
}

export function addGroups(groups: Group[]) {
	return Promise.all(groups.map(addGroup));
}

async function updateGroup({id, changes}: Update<Group>): Promise<Group> {

	let setSql = groupSetSql(changes);
	if (setSql)
		await db.query('UPDATE organization SET ' + setSql + ' WHERE `id`=UUID_TO_BIN(?)', [id])

	id = changes.id || id;
	const groups = await getGroups({id});
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

export function updateGroups(updates: Update<Group>[]) {
	if (!validUpdates(updates))
		throw new TypeError('Bad or missing array of group updates; expected array of objects with shape {id: string, changes: object}');

	return Promise.all(updates.map(updateGroup));
}

export async function removeGroups(ids: string[]): Promise<number> {
	const result1 = await db.query('DELETE FROM officers WHERE BIN_TO_UUID(group_id) IN (?)', [ids]) as OkPacket;
	const result2 = await db.query('DELETE FROM organization WHERE BIN_TO_UUID(id) IN (?)', [ids]) as OkPacket;
	return result1.affectedRows + result2.affectedRows;
}


type ProjectEntry = {
    id: string;
    parent_id: string;
    taskGroupName: string;
    project: string;
}

type GetProjectsConstraints = {
    id?: string | string[];
    parent_id?: string;
    groupName?: string;
}

export async function getProjects(constraints?: GetProjectsConstraints) {
    let sql = 'SELECT id, parent_id, name as taskGroupName, symbol as project FROM organization WHERE type="tg" AND symbol <> NULL';
    if (constraints) {
        const wheres: string[] = [];
        if (Array.isArray(constraints.id))
            wheres.push(db.format('BIN_TO_UUID(id) IN (?)', [constraints.id]));
        else if (constraints.id)
            wheres.push(db.format('(id=UUID_TO_BIN(?)', [constraints.id]));
        if (constraints.parent_id)
            wheres.push(db.format('(parent_id=UUID_TO_BIN(?)', [constraints.parent_id]));
        if (constraints.groupName)
            wheres.push(db.format('name=?', [constraints.groupName]));
        if (wheres.length > 0)
            sql += ' AND ' + wheres.join(' AND ');
    }
    const projects = (await db.query(sql) as ProjectEntry[])
        .map(p => {
            const s = p.project.split('/');
            const project = 'P' + (s? s[s.length - 1]: p.project);
            return {...p, project};
        });
    return projects;
}
