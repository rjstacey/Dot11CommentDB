import { v4 as uuid } from "uuid";

import db from "../utils/database";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import type { User } from "./users";
import { getGroupAndSubgroupIds } from "./groups";
import { Group } from "@schemas/groups";
import {
	Officer,
	OfficerQuery,
	OfficerCreate,
	OfficerUpdate,
} from "@schemas/officers";

export function getOfficers(constraints?: OfficerQuery): Promise<Officer[]> {
	// prettier-ignore
	let sql =
		'SELECT ' + 
			'BIN_TO_UUID(officers.id) AS `id`,' +
			'BIN_TO_UUID(officers.group_id) AS `group_id`, ' +
			'officers.sapin, ' +
			'officers.position ' +
		'FROM officers';

	if (constraints && Object.keys(constraints).length > 0) {
		if (constraints.parentGroupId) {
			sql += db.format(
				" " +
					"LEFT JOIN organization grp ON grp.id=officers.group_id " +
					"LEFT JOIN organization parentGrp ON parentGrp.id=grp.parent_id " +
					"WHERE UUID_TO_BIN(?) IN (grp.id, parentGrp.id, parentGrp.parent_id)",
				[constraints.parentGroupId]
			);
			delete constraints.parentGroupId;
			if (Object.keys(constraints).length > 1) sql += " AND ";
		} else {
			sql += " WHERE ";
		}
		sql += Object.entries(constraints)
			.map(([key, value]) =>
				key === "id" || key === "group_id"
					? db.format(
							Array.isArray(value)
								? "BIN_TO_UUID(??) IN (?)"
								: "BIN_TO_UUID(??)=?",
							[key, value]
					  )
					: db.format(Array.isArray(value) ? "?? IN (?)" : "??=?", [
							key,
							value,
					  ])
			)
			.join(" AND ");
	}

	return db.query<(RowDataPacket & Officer)[]>(sql);
}

/**
 * Add officer.
 *
 * @param officer An officer object
 * @returns An object representing the officer as added
 */
async function addOfficer({
	id,
	group_id,
	...rest
}: OfficerCreate): Promise<Officer> {
	if (!id) id = uuid();

	let sql = db.format("INSERT INTO officers SET id=UUID_TO_BIN(?)", [id]);
	if (group_id) sql += db.format(", group_id=UUID_TO_BIN(?)", [group_id]);
	if (Object.keys(rest).length > 0) sql += db.format(", ?", [rest]);

	await db.query(sql);

	const [officer] = await getOfficers({ id });
	return officer;
}

/**
 * Add officers.
 *
 * @param officers - An array of officer objects
 * @returns An array of officer objects as added
 */
export async function addOfficers(
	user: User,
	workingGroup: Group,
	officers: OfficerCreate[]
) {
	// Ensure that each officer has a valid groupId
	const groupIds = await getGroupAndSubgroupIds(workingGroup.id);
	officers.forEach((officer) => {
		if (!officer.group_id)
			throw new TypeError("Bad or missing group_id; must specify group");
		if (!groupIds.includes(officer.group_id))
			throw new TypeError(
				"Bad officer group_id; must be working group or one of its subgroups"
			);
	});

	return Promise.all(officers.map(addOfficer));
}

/**
 * Update officer.
 *
 * @param update Update object with shape {id, changes}
 * @param update.id Officer identifier
 * @param update.changes Partial officer object with parameters to change
 * @returns Updated officer object
 */
async function updateOfficer({ id, changes }: OfficerUpdate): Promise<Officer> {
	if (Object.keys(changes).length > 0)
		await db.query("UPDATE officers SET ? WHERE id=UUID_TO_BIN(?)", [
			changes,
			id,
		]);

	const [officer] = await getOfficers({ id });
	return officer;
}

/**
 * Update officers.
 *
 * @param updates An array of objects with shape {id, changes}
 * @returns An array of update officer objects
 */
export async function updateOfficers(
	user: User,
	workingGroup: Group,
	updates: OfficerUpdate[]
) {
	// Ensure that each officer has a valid groupId
	let groupIds: string[];
	updates.forEach(async ({ changes }) => {
		if (changes.group_id !== undefined && changes.group_id !== null) {
			if (!groupIds)
				groupIds = await getGroupAndSubgroupIds(workingGroup.id);
			if (!groupIds.includes(changes.group_id))
				throw new TypeError(
					"Bad officer group_id; must be the working group or one of its subgroups"
				);
		}
	});

	return Promise.all(updates.map(updateOfficer));
}

/**
 * Delete officers.
 *
 * @param ids An array of officer identifiers
 * @returns number of deleted officers
 */
export async function removeOfficers(
	user: User,
	workingGroup: Group,
	ids: string[]
): Promise<number> {
	const sql = db.format(
		// prettier-ignore
		"DELETE officers " +
		"FROM officers " +
			"LEFT JOIN organization org ON officers.group_id=org.id " +
		"WHERE BIN_TO_UUID(officers.id) IN (?) AND UUID_TO_BIN(?) IN (org.id, org.parent_id)",
		[ids, workingGroup.id]
	);
	const result = await db.query<ResultSetHeader>(sql);
	return result.affectedRows;
}
