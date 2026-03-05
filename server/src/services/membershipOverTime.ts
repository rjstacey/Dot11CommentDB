import db from "../utils/database.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Response } from "express";

import type { Group } from "@schemas/groups.js";
import {
	MembershipEvent,
	MembershipEventCreate,
	MembershipEventUpdate,
} from "@schemas/membershipOverTime.js";
import { UserContext } from "./users.js";

import {
	parseMembershipOverTimeSpreadsheet,
	genMembershipOverTimeSpreadsheet,
} from "./membershipOverTimeSpreadsheet.js";

export async function init() {
	const sql = `
		CREATE TABLE IF NOT EXISTS membershipOverTime (
			id INT AUTO_INCREMENT PRIMARY KEY,
			groupId BINARY(16) NOT NULL,
			date DATE NOT NULL,
			count INT NOT NULL DEFAULT 0,
			note TEXT,
			FOREIGN KEY (groupId) REFERENCES organization(id)
		)
	`;
	await db.query(sql);
}
type MembershipOverTimeQuery = { id?: number | number[]; groupId?: string };

export async function getMembershipOverTime(query?: MembershipOverTimeQuery) {
	let sql = `SELECT
			id,
			BIN_TO_UUID(groupId) as groupId,
			date,
			count,
			note
		FROM membershipOverTime`;

	if (query) {
		const wheres: string[] = [];
		Object.entries(query).forEach(([key, value]) => {
			wheres.push(
				key === "groupId"
					? db.format(
							Array.isArray(value)
								? "BIN_TO_UUID(??) IN (?)"
								: "BIN_TO_UUID(??)=?",
							[key, value],
						)
					: db.format(Array.isArray(value) ? "?? IN (?)" : "??=?", [
							key,
							value,
						]),
			);
		});
		if (wheres.length > 0) sql += " WHERE " + wheres.join(" AND ");
	}

	sql += " ORDER BY date ASC";

	return await db.query<(RowDataPacket & MembershipEvent)[]>(sql);
}

function membershipEvent(changes: Partial<MembershipEvent>) {
	const entry: Partial<MembershipEvent> = {
		groupId: changes.groupId,
		date: changes.date,
		count: changes.count,
		note: changes.note,
	};

	for (const key of Object.keys(entry)) {
		if (entry[key] === undefined) delete entry[key];
	}

	return entry;
}

async function addMembershipOverTimeEvent(
	group: Group,
	add: MembershipEventCreate,
) {
	const sql = db.format(
		`INSERT INTO membershipOverTime SET groupId=UUID_TO_BIN(?), ?`,
		[group.id, membershipEvent(add)],
	);
	const result = await db.query<ResultSetHeader>(sql);
	return result.insertId;
}

export async function addMembershipOverTimeEvents(
	group: Group,
	adds: MembershipEventCreate[],
) {
	const ids = await Promise.all(
		adds.map((add) => addMembershipOverTimeEvent(group, add)),
	);
	return getMembershipOverTime({ id: ids });
}

async function updateMembershipOverTimeEvent(
	group: Group,
	update: MembershipEventUpdate,
) {
	const { id, changes } = update;
	const sql = db.format(
		"UPDATE membershipOverTime SET ? WHERE groupId=UUID_TO_BIN(?) AND id=?",
		[membershipEvent(changes), group.id, id],
	);
	await db.query<ResultSetHeader>(sql);
}

export async function updateMembershipOverTimeEvents(
	group: Group,
	updates: MembershipEventUpdate[],
) {
	await Promise.all(
		updates.map((u) => updateMembershipOverTimeEvent(group, u)),
	);
	return getMembershipOverTime({ id: updates.map((u) => u.id) });
}

export async function removeMembershipOverTimeEvents(
	group: Group,
	ids: number[],
) {
	const sql = db.format(
		"DELETE FROM membershipOverTime WHERE groupId=UUID_TO_BIN(?) AND id IN (?)",
		[group.id, ids],
	);
	const result = await db.query<ResultSetHeader>(sql);
	return result.affectedRows;
}

export async function uploadMembershipOverTime(group: Group, buffer: Buffer) {
	const events = await parseMembershipOverTimeSpreadsheet(buffer);

	const sql = db.format(
		"DELETE FROM membershipOverTime WHERE groupId=UUID_TO_BIN(?)",
		[group.id],
	);
	await db.query(sql);

	return addMembershipOverTimeEvents(group, events);
}

export async function exportMembershipOverTime(
	user: UserContext,
	group: Group,
	res: Response,
) {
	const events = await getMembershipOverTime({ groupId: group.id });

	res.attachment(`${group.name}_membership_over_time.xlsx`);
	return genMembershipOverTimeSpreadsheet(user, events, res);
}
