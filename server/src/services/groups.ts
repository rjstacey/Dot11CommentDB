
import { v4 as uuid } from 'uuid';

import db from '../utils/database';
import type { OkPacket } from 'mysql2';

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
			'o1.`symbol` ' +
		'FROM organization o1';
		
	if (constraints && Object.keys(constraints).length > 0) {
		if (constraints.parentName) {
			sql += db.format(' LEFT JOIN organization o2 ON o1.parent_id=o2.id WHERE o1.name=? OR o2.name=?', [constraints.parentName, constraints.parentName]);
			delete constraints.parentName;
		}
		else {
			sql += ' WHERE ' + Object.entries(constraints).map(
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
	const sets: string[] = [];
	for (const [key, value] of Object.entries(group)) {
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

	let setSql = groupSetSql(changes);
	if (setSql)
		await db.query('UPDATE organization SET ' + setSql + ' WHERE `id`=UUID_TO_BIN(?)', [id])

	id = changes.id || id;
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
