import db from "../utils/database.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

import type { Group } from "@schemas/groups.js";
import {
	AffiliationMap,
	AffiliationMapCreate,
	AffiliationMapUpdate,
} from "@schemas/affiliationMap.js";

type AffiliationMapQuery = { id?: number | number[] };

export async function getAffiliationMaps(
	group: Group,
	query?: AffiliationMapQuery,
) {
	const wheres: string[] = [];
	if (query && query.id) {
		wheres.push(
			db.format(Array.isArray(query.id) ? "id IN (?)" : "id=?", [
				query.id,
			]),
		);
	}
	wheres.push(db.format("groupId=UUID_TO_BIN(?)", [group.id]));

	const sql =
		`
        SELECT
            id,
            BIN_TO_UUID(groupId) as groupId,
            \`match\`,
            shortAffiliation
        FROM affiliationMap WHERE ` + wheres.join(" AND ");
	return await db.query<(RowDataPacket & AffiliationMap)[]>(sql);
}

async function addAffiliationMap(group: Group, add: AffiliationMapCreate) {
	const sql = `INSERT INTO affiliationMap SET groupId=UUID_TO_BIN(${db.escape(group.id)}), ${db.escape(add)}`;
	const result = await db.query<ResultSetHeader>(sql);
	return result.insertId;
}

export async function addAffiliationMaps(
	group: Group,
	adds: AffiliationMapCreate[],
) {
	const ids = await Promise.all(
		adds.map((add) => addAffiliationMap(group, add)),
	);
	return getAffiliationMaps(group, { id: ids });
}

async function updateAffiliationMap(
	group: Group,
	update: AffiliationMapUpdate,
) {
	const { id, changes } = update;
	const sql = `UPDATE affiliationMap SET ${db.escape(changes)} WHERE groupId=UUID_TO_BIN(${db.escape(group.id)}) AND id=${db.escape(id)}`;
	await db.query<ResultSetHeader>(sql);
}

export async function updateAffiliationMaps(
	group: Group,
	updates: AffiliationMapUpdate[],
) {
	await Promise.all(updates.map((u) => updateAffiliationMap(group, u)));
	return getAffiliationMaps(group, { id: updates.map((u) => u.id) });
}

export async function removeAffiliationMaps(group: Group, ids: number[]) {
	const sql = `DELETE FROM affiliationMap WHERE groupId=UUID_TO_BIN(${db.escape(group.id)}) AND id IN (${db.escape(ids)})`;
	const result = await db.query<ResultSetHeader>(sql);
	return result.affectedRows;
}
