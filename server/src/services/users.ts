import db from "../utils/database";
import type { AxiosInstance } from "axios";

export type User = {
	SAPIN: number;
	Name: string;
	Email: string;
	//Status: string;
	//Access: number;
	Token: any;
	ieeeClient?: AxiosInstance;
};

export async function selectUser({
	SAPIN,
	Email,
}: {
	SAPIN?: number;
	Email?: string;
}) {
	// prettier-ignore
	const sql =
		'SELECT ' +
			'SAPIN, Name, Email, Null as Token ' +
		'FROM users ' +
		'WHERE ' + (SAPIN? `SAPIN=${db.escape(SAPIN)}`: `Email=${db.escape(Email)}`);
	let [user] = (await db.query(sql)) as User[];

	return user;
}

/*
 * Maintain users cache
 */
const userCache: Record<number, User> = {};

export async function getUser(sapin: number) {
	let user = userCache[sapin];
	if (!user) {
		user = await selectUser({ SAPIN: sapin });
		if (user) userCache[sapin] = user;
	}
	return user;
}

export function setUser(sapin: number, user: User) {
	userCache[sapin] = { ...userCache[sapin], ...user };
}

export const delUser = (sapin: number) => delete userCache[sapin];
