import db from "../utils/database.js";
import { RowDataPacket, type ResultSetHeader } from "mysql2";
import { isPlainObject } from "../utils/index.js";
import {
	OAuthAccount,
	OAuthAccountCreate,
	OAuthAccountChange,
	OAuthAccountsQuery,
	OAuthParams,
} from "@schemas/oauthAccounts.js";

type AuthState = {
	accountId: number;
	userId: number;
	host: string;
};

function validAuthState(o: unknown): o is AuthState {
	return (
		isPlainObject(o) &&
		typeof o.accountId === "number" &&
		typeof o.userId === "number" &&
		typeof o.host === "string"
	);
}

/** Helper function for generating OAuth state */
export function genOAuthState(obj: AuthState) {
	return JSON.stringify(obj);
}

/** Helper function for parsing OAuth state */
export function parseOAuthState(state: string): AuthState | undefined {
	let obj: AuthState | undefined;
	try {
		const output = JSON.parse(state);
		if (validAuthState(output)) obj = output;
	} catch {
		/* empty */
	}
	return obj;
}

/**
 * Update the auth parameters
 * We merge new auth parameters with existing perameters. We do this because the refresh token
 * is only return on the first authorization. Subsequent authorization just return an access token.
 * @param id OAuth account identifier
 * @param authParams New tokens. A null value clears the current paramters.
 * @param userId User indentifier (SAPIN)
 */
export function updateAuthParams(
	id: number,
	authParams: object | null,
	userId?: number
): Promise<ResultSetHeader> {
	const sets: string[] = [];

	sets.push(
		"authParams=" +
			(authParams
				? db.format(
						'JSON_MERGE_PATCH(COALESCE(authParams, "{}"), ?)',
						JSON.stringify(authParams)
					)
				: "NULL")
	);

	if (userId) {
		sets.push(db.format("authUserId=?", [userId]));
	}

	sets.push("authDate=UTC_TIMESTAMP()");

	const setsSql = sets.join(", ");

	return db.query<ResultSetHeader>(
		"UPDATE oauth_accounts SET " + setsSql + " WHERE id=?",
		[id]
	);
}

function getConstraintsWhereSql(constraints?: OAuthAccountsQuery) {
	if (!constraints) return "";

	const fields: string[] = [];
	if (constraints.groupId) fields.push("groupId");
	if (constraints.id) fields.push("id");
	if (constraints.name) fields.push("name");
	if (constraints.type) fields.push("type");

	if (fields.length === 0) return "";

	return (
		"WHERE " +
		fields
			.map((key) => {
				const value = constraints[key];
				if (key === "groupId")
					return db.format(
						Array.isArray(value)
							? "BIN_TO_UUID(??) IN (?)"
							: "??=UUID_TO_BIN(?)",
						[key, value]
					);
				else
					return db.format(
						Array.isArray(value) ? "?? IN (?)" : "??=?",
						[key, value]
					);
			})
			.join(" AND ")
	);
}

export function getOAuthAccounts(
	constraints?: OAuthAccountsQuery
): Promise<OAuthAccount[]> {
	// prettier-ignore
	const sql =
		"SELECT " +
			"id, " +
			"name, " +
			"type, " +
			"BIN_TO_UUID(groupId) as groupId, " +
			'DATE_FORMAT(authDate, "%Y-%m-%dT%TZ") AS authDate, ' +
			"authUserId, " +
			"authParams " +
		"FROM oauth_accounts " +
		getConstraintsWhereSql(constraints);
	return db.query<(RowDataPacket & OAuthAccount)[]>(sql);
}

export function getOAuthParams(
	constraints?: OAuthAccountsQuery
): Promise<OAuthParams[]> {
	// prettier-ignore
	const sql =
		"SELECT " +
			"id, " +
			"authParams " +
		"FROM oauth_accounts " +
		getConstraintsWhereSql(constraints);
	return db.query<(RowDataPacket & OAuthParams)[]>(sql);
}

export function validOAuthAccountCreate(
	account: unknown
): account is OAuthAccountCreate {
	return (
		isPlainObject(account) &&
		typeof account.type === "string" &&
		typeof account.name === "string" &&
		typeof account.groupId === "string"
	);
}

export function validOAuthAccountChanges(
	account: unknown
): account is OAuthAccountChange {
	return (
		isPlainObject(account) &&
		(typeof account.type === "undefined" ||
			typeof account.type === "string") &&
		(typeof account.name === "undefined" ||
			typeof account.name === "string") &&
		(typeof account.groupId === "undefined" ||
			typeof account.groupId === "string")
	);
}

/**
 * Add Oauth account
 * @param account OAuth account create object
 * @returns OAuth account object as added
 */
export async function addOAuthAccount(account: OAuthAccountCreate) {
	const sql = db.format(
		"INSERT INTO oauth_accounts SET " +
			"`name`=?, " +
			"`type`=?, " +
			"`groupId`=UUID_TO_BIN(?)",
		[account.name || "", account.type, account.groupId]
	);

	const { insertId } = await db.query<ResultSetHeader>(sql);
	return insertId;
}

/**
 * Update calendar account
 * @param id OAuth account identifier
 * @param changes Expects an OAuth account update object, throws otherwise
 * @returns OAuth account object as updated
 */
export async function updateOAuthAccount(
	groupId: string,
	id: number,
	changes: OAuthAccountChange
) {
	if (!id) throw new TypeError("Must provide id with update");
	if (!validOAuthAccountChanges(changes))
		throw new TypeError("Bad OAuth account changes object");
	if (Object.keys(changes).length)
		await db.query(
			"UPDATE oauth_accounts SET ? WHERE id=? AND groupId=UUID_TO_BIN(?);",
			[changes, id, groupId]
		);
	const [account] = await getOAuthAccounts({ id });
	return account;
}

/**
 * Delete calendar account
 * @param id OAuth account identifier
 */
export async function deleteOAuthAccount(groupId: string, id: number) {
	if (!id) throw new TypeError("Must provide id with delete");
	const { affectedRows } = await db.query<ResultSetHeader>(
		"DELETE FROM oauth_accounts WHERE id=? AND groupId=UUID_TO_BIN(?)",
		[id, groupId]
	);
	return affectedRows;
}
