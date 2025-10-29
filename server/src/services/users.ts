import { IeeeClient } from "../utils/ieeeClient.js";
import db from "../utils/database.js";
import type { User } from "@schemas/user.js";
import { RowDataPacket } from "mysql2";

/** Context for user performing access. Includes IEEE client API. */
export type UserContext = User & {
	ieeeClient?: IeeeClient;
};

export async function selectUser({
	SAPIN,
	Email,
}: {
	SAPIN?: number;
	Email?: string;
}): Promise<User | undefined> {
	// prettier-ignore
	const sql =
		'SELECT ' +
			'SAPIN, Name, Email, Null as Token ' +
		'FROM users ' +
		'WHERE ' + (SAPIN? `SAPIN=${db.escape(SAPIN)}`: `Email=${db.escape(Email)}`);
	const [user] = await db.query<(RowDataPacket & User)[]>(sql);
	return user;
}

/*
 * Maintain users cache
 */
const userCache: Record<number, UserContext> = {};

export async function getUser(sapin: number) {
	let user: UserContext | undefined = userCache[sapin];
	if (!user) {
		user = await selectUser({ SAPIN: sapin });
		if (user) userCache[sapin] = user;
	}
	return user;
}

export function setUser(sapin: number, user: UserContext) {
	userCache[sapin] = { ...userCache[sapin], ...user };
}

export const delUser = (sapin: number) => delete userCache[sapin];
