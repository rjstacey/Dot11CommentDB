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
	userId?: number,
): Promise<ResultSetHeader> {
	const sets: string[] = [];

	sets.push(
		"authParams=" +
			(authParams
				? `JSON_MERGE_PATCH(COALESCE(authParams, "{}"), ${db.escape(JSON.stringify(authParams))})`
				: "NULL"),
	);

	if (userId) {
		sets.push(`authUserId=${db.escape(userId)}`);
	}

	sets.push("authDate=UTC_TIMESTAMP()");

	const sql = `
		UPDATE oauth_accounts 
		SET ${sets.join(", ")} 
		WHERE id=${db.escape(id)}
	`;
	return db.query<ResultSetHeader>(sql);
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
					return Array.isArray(value)
						? `BIN_TO_UUID(\`${key}\`) IN (${db.escape(value)})`
						: `BIN_TO_UUID(\`${key}\`) = ${db.escape(value)}`;
				else
					return Array.isArray(value)
						? `\`${key}\` IN (${db.escape(value)})`
						: `\`${key}\` = ${db.escape(value)}`;
			})
			.join(" AND ")
	);
}

export function getOAuthAccounts(
	constraints?: OAuthAccountsQuery,
): Promise<OAuthAccount[]> {
	const sql =
		`
		SELECT
			id,
			name,
			type,
			BIN_TO_UUID(groupId) as groupId,
			DATE_FORMAT(authDate, "%Y-%m-%dT%TZ") AS authDate,
			authUserId,
			authParams
		FROM oauth_accounts ` + getConstraintsWhereSql(constraints);
	return db.query<(RowDataPacket & OAuthAccount)[]>(sql);
}

export function getOAuthParams(
	constraints?: OAuthAccountsQuery,
): Promise<OAuthParams[]> {
	// prettier-ignore
	const sql = `
		SELECT
			id,
			authParams
		FROM oauth_accounts ` + getConstraintsWhereSql(constraints);
	return db.query<(RowDataPacket & OAuthParams)[]>(sql);
}

export function validOAuthAccountCreate(
	account: unknown,
): account is OAuthAccountCreate {
	return (
		isPlainObject(account) &&
		typeof account.type === "string" &&
		typeof account.name === "string" &&
		typeof account.groupId === "string"
	);
}

export function validOAuthAccountChanges(
	account: unknown,
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
	// prettier-ignore
	const sql = `
		INSERT INTO oauth_accounts
		SET
			\`name\`=${db.escape(account.name || "")},
			\`type\`=${db.escape(account.type)},
			\`groupId\`=UUID_TO_BIN(${db.escape(account.groupId)})
	`;

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
	changes: OAuthAccountChange,
) {
	if (!id) throw new TypeError("Must provide id with update");
	if (!validOAuthAccountChanges(changes))
		throw new TypeError("Bad OAuth account changes object");
	if (Object.keys(changes).length) {
		const sql = `
			UPDATE oauth_accounts SET ${db.escape(changes)}
			WHERE id=${db.escape(id)} AND groupId=UUID_TO_BIN(${db.escape(groupId)})
		`;
		await db.query(sql);
	}
	const [account] = await getOAuthAccounts({ id });
	return account;
}

/**
 * Delete calendar account
 * @param id OAuth account identifier
 */
export async function deleteOAuthAccount(groupId: string, id: number) {
	if (!id) throw new TypeError("Must provide id with delete");
	const sql = `
		DELETE FROM oauth_accounts
		WHERE id=${db.escape(id)} AND groupId=UUID_TO_BIN(${db.escape(groupId)})
	`;
	const { affectedRows } = await db.query<ResultSetHeader>(sql);
	return affectedRows;
}
