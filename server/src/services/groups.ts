import { v4 as uuid } from "uuid";

import db from "../utils/database.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { ForbiddenError, NotFoundError } from "../utils/index.js";
import type { UserContext } from "./users.js";
import { AccessLevel } from "../auth/access.js";
import { getBallots } from "./ballots.js";
import { getSessions } from "./sessions.js";
import {
	Group,
	GroupsQuery,
	GroupCreate,
	GroupUpdate,
} from "@schemas/groups.js";

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
	return (await db.query<(RowDataPacket & { id: string })[]>(sql)).map(
		(g) => g.id
	);
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

	return (await db.query<(RowDataPacket & { id: string })[]>(sql)).map(
		(g) => g.id
	);
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
 *
const groupTypes = Object.keys(GroupTypeLabels);
function groupCmp(g1: Group, g2: Group) {
	const n =
		groupTypes.indexOf(g1.type || "") - groupTypes.indexOf(g2.type || "");
	if (n === 0) return g1.name ? g1.name.localeCompare(g2.name) : 0;
	return n;
}*/

/**
 * Rollup user permissions for a group
 * (parent permissions are inherited by its children)
 * @param user User for which the permissions apply
 * @param group Group for which the permissions apply
 * @param groupEntities Group entity record that includes all parents (ancestors) of the group
 * @returns The rolled up permissions for the group
 */
function rollupGroupUserPermissions(
	user: UserContext,
	group: Group,
	groupEntities: Record<string, Group>
) {
	const permissions = { ...getGroupUserPermissions(user, group) };
	const parent = group.parent_id ? groupEntities[group.parent_id] : undefined;
	if (parent) {
		const parentPermissions = rollupGroupUserPermissions(
			user,
			parent,
			groupEntities
		);
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
export async function getGroups(user: UserContext, query?: GroupsQuery) {
	let sql = selectGroupsSql;

	if (query) {
		const { parentName, ...rest } = query;
		const wheres: string[] = [];
		if (parentName) {
			const ids = await getGroupAndSubgroupIdsByName(parentName);
			if (ids.length === 0) return []; // No group with that name
			wheres.push(db.format("BIN_TO_UUID(org.id) IN (?)", [ids]));
		}
		Object.entries(rest).forEach(([key, value]) => {
			let sql: string;
			if (key === "id" || key === "parent_id") {
				sql = db.format(
					Array.isArray(value)
						? "BIN_TO_UUID(org.??) IN (?)"
						: "BIN_TO_UUID(org.??)=?",
					[key, value]
				);
			} else {
				sql = db.format(
					Array.isArray(value) ? "org.?? IN (?)" : "org.??=?",
					[key, value]
				);
			}
			wheres.push(sql);
		});
		if (wheres.length > 0) sql += " WHERE " + wheres.join(" AND ");
	}

	let groups: Group[] = await db.query<(RowDataPacket & Group)[]>(sql);

	// Normalize
	const groupEntities: Record<string, Group> = {};
	for (const group of groups) groupEntities[group.id] = group;

	// Get a list of parents that are missing
	const ids = groups
		.map((group) => group.parent_id)
		.filter(
			(parent_id) => parent_id !== null && !groupEntities[parent_id]
		) as string[];

	// If any parents are missing, add them and their ancestors
	// (we need this to correctly roll up permissions)
	if (ids.length > 0) {
		const parentGroups = await getGroupsAndParentGroups(ids);
		for (const group of parentGroups) groupEntities[group.id] = group;

		groups = groups.concat(parentGroups);
	}

	// Roll up group user permissions
	for (const group of groups) {
		group.permissionsRaw = getGroupUserPermissions(user, group);
		group.permissions = rollupGroupUserPermissions(
			user,
			group,
			groupEntities
		);
	}

	return groups;
}

/**
 * Get group and subgroups
 * @param user - The user executing the query
 * @param id - The group identifier
 * @returns An array of groups where the first entry is the group and successive entries the parents
 */
export async function getGroupHierarchy(
	user: UserContext,
	id: string
): Promise<Group[]> {
	let groups = await getGroupsAndParentGroups([id]);
	if (groups.length === 0)
		throw new NotFoundError(`Group id=${id} not found`);

	// Normalize
	const groupEntities: Record<string, Group> = {};
	for (const group of groups) groupEntities[group.id] = group;

	// The order is import here; make sure the first entry is the identified group
	groups = [];
	let group: Group | undefined = groupEntities[id];
	do {
		group.permissionsRaw = getGroupUserPermissions(user, group);
		// Roll up group user permissions
		group.permissions = rollupGroupUserPermissions(
			user,
			group,
			groupEntities
		);
		groups.push(group);
		group = group.parent_id ? groupEntities[group.parent_id] : undefined;
	} while (group);

	return groups;
}

export async function getGroupByName(
	user: UserContext,
	name: string
): Promise<Group | undefined> {
	const [group] = await getGroups(user, { name });
	return group;
}

export function selectWorkingGroup(groups: Group[]) {
	return groups.find((group) => group.type === "wg");
}

export async function getWorkingGroup(
	user: UserContext,
	group_id: string
): Promise<Group | undefined> {
	const groups = await getGroupHierarchy(user, group_id);
	return groups.find((group) => group.type === "wg");
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
	comments: AccessLevel.admin,
	polling: AccessLevel.admin,
};

const wgOfficerPermissions: Record<string, number> = {
	users: AccessLevel.admin,
	members: AccessLevel.admin,
	meetings: AccessLevel.admin,
	groups: AccessLevel.admin,
	ballots: AccessLevel.admin,
	voters: AccessLevel.admin,
	results: AccessLevel.admin,
	comments: AccessLevel.admin,
	polling: AccessLevel.admin,
};

const tgOfficerPermissions: Record<string, number> = {
	users: AccessLevel.ro,
	members: AccessLevel.ro,
	groups: AccessLevel.ro,
	ballots: AccessLevel.ro,
	voters: AccessLevel.ro,
	results: AccessLevel.rw,
	comments: AccessLevel.rw,
	polling: AccessLevel.rw,
};

const memberPermissions: Record<string, number> = {
	users: AccessLevel.ro,
	members: AccessLevel.ro,
	groups: AccessLevel.ro,
	ballots: AccessLevel.ro,
	comments: AccessLevel.ro,
	polling: AccessLevel.ro,
};

function getGroupUserPermissions(user: UserContext, group: Group) {
	if (group.type === "r" && group.officerSAPINs.includes(user.SAPIN))
		return rootPermissions;
	else if (
		["wg", "c"].includes(group.type!) &&
		group.officerSAPINs.includes(user.SAPIN)
	)
		return wgOfficerPermissions;
	else if (
		["tg", "sg", "sc", "ah"].includes(group.type!) &&
		group.officerSAPINs.includes(user.SAPIN)
	)
		return tgOfficerPermissions;
	return memberPermissions;
}

function groupSetSql(group: Partial<Group>) {
	// Only parameters that exist in database
	const {
		id,
		parent_id,
		name,
		type,
		status,
		color,
		symbol,
		project,
		...rest
	} = group;
	if (Object.keys(rest).length)
		console.warn("Superfluous parameters: ", rest);
	const groupDB = {
		id,
		parent_id,
		name,
		type,
		status,
		color,
		symbol,
		project,
	};
	for (const key of Object.keys(groupDB)) {
		if (typeof groupDB[key] === "undefined") delete groupDB[key];
	}

	const sets: string[] = [];
	for (const [key, value] of Object.entries(groupDB)) {
		let sql: string;
		if (key === "id" || key === "parent_id")
			sql = db.format("??=UUID_TO_BIN(?)", [key, value]);
		else sql = db.format("??=?", [key, value]);
		sets.push(sql);
	}

	return sets.join(", ");
}

async function addGroup(
	user: UserContext,
	{ id, ...rest }: GroupCreate
): Promise<Group> {
	if (!id) id = uuid();

	const sql = "INSERT INTO organization SET " + groupSetSql({ id, ...rest });
	await db.query(sql);

	const groups = await getGroups(user, { id });
	return groups[0];
}

export function addGroups(user: UserContext, groups: GroupCreate[]) {
	return Promise.all(groups.map((g) => addGroup(user, g)));
}

async function updateGroup(
	user: UserContext,
	{ id, changes }: GroupUpdate
): Promise<Group> {
	const setSql = groupSetSql(changes);
	if (setSql)
		await db.query(
			"UPDATE organization SET " + setSql + " WHERE `id`=UUID_TO_BIN(?)",
			[id]
		);

	id = changes.id || id;
	const groups = await getGroups(user, { id });
	return groups[0];
}

export function updateGroups(user: UserContext, updates: GroupUpdate[]) {
	if (updates.find((u) => u.id === "00000000-0000-0000-0000-000000000000")) {
		throw new ForbiddenError("Can't update root entry");
	}
	return Promise.all(updates.map((u) => updateGroup(user, u)));
}

export async function removeGroups(
	user: UserContext,
	ids: string[]
): Promise<number> {
	if (ids.includes("00000000-0000-0000-0000-000000000000")) {
		throw new ForbiddenError("Can't delete root entry");
	}

	// Can't delete if the group has subgroups that are not also being deleted
	const undeletedChildIds: string[] = [];
	for (const id of ids) {
		const childIds = await getGroupAndSubgroupIds(id);
		for (const childId of childIds) {
			if (!ids.includes(childId)) undeletedChildIds.push(childId);
		}
	}
	if (undeletedChildIds.length > 0) {
		throw new TypeError(
			"One or more of the groups has a subgroup that would be orphaned"
		);
	}

	// Can't delete if the group is referenced
	const ballots = await getBallots({ groupId: ids });
	if (ballots.length) {
		throw new TypeError(
			"One or more of the groups has a ballot associated with it. These need to be deleted first."
		);
	}
	const seesions = await getSessions({ groupId: ids });
	if (seesions.length > 0) {
		throw new TypeError(
			"One or more of the groups has a session associated with it. These need to be deleted first."
		);
	}

	const result1 = await db.query<ResultSetHeader>(
		"DELETE FROM officers WHERE BIN_TO_UUID(group_id) IN (?)",
		[ids]
	);
	const result2 = await db.query<ResultSetHeader>(
		"DELETE FROM organization WHERE BIN_TO_UUID(id) IN (?)",
		[ids]
	);
	return result1.affectedRows + result2.affectedRows;
}
