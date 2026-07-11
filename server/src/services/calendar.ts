// Google Calendar: https://developers.google.com/calendar/api/v3/reference/calendars
import { google, calendar_v3, Auth } from "googleapis";
import { OAuth2Client } from "googleapis-common";
import qs from "node:querystring";
import type { Request } from "express";
import type { UserContext } from "./users.js";

import {
	genOAuthState,
	parseOAuthState,
	getOAuthAccounts,
	addOAuthAccount,
	updateOAuthAccount,
	deleteOAuthAccount,
	setAuthParams,
	updateAuthParams,
} from "./oauthAccounts.js";
import type {
	OAuthAccount,
	OAuthAccountCreate,
} from "@schemas/oauthAccounts.js";
import type {
	CalendarAccount,
	CalendarAccountCreate,
	CalendarAccountChange,
	CalendarAccountsQuery,
	GoogleCalendar,
} from "@schemas/calendar.js";
import { NotFoundError } from "../utils/index.js";

type CalendarAccountLocal = Omit<
	CalendarAccount,
	"authUrl" | "userName" | "displayName"
> & {
	api: calendar_v3.Calendar;
	auth: OAuth2Client;
	authParams: Auth.Credentials | null;
};

type ActivatedCalendarAccountLocal = Omit<
	CalendarAccountLocal,
	"primaryCalendar"
> & {
	primaryCalendar: GoogleCalendar;
};

const calendarRevokeUrl = "https://oauth2.googleapis.com/revoke";

const calendarAuthScope = "https://www.googleapis.com/auth/calendar"; // string or array of strings

/* const calendarAuthRedirectUri = process.env.NODE_ENV === 'development'?
	'http://localhost:3000/oauth2/calendar':
	'https://802tools.org/oauth2/calendar';*/

const calendarAuthRedirectPath = "/oauth2/calendar";

const calendarAccounts: Record<number, CalendarAccountLocal> = {};

let googleClientId = "Google client ID";
let googleClientSecret = "Google client secret";

export async function init() {
	// Check that we have CLIENT_ID and CLIENT_SECRET
	if (process.env.GOOGLE_CLIENT_ID)
		googleClientId = process.env.GOOGLE_CLIENT_ID;
	else console.warn("Calendar API: Missing GOOGLE_CLIENT_ID in .env");

	if (process.env.GOOGLE_CLIENT_SECRET)
		googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
	else console.warn("Calendar API: Missing GOOGLE_CLIENT_SECRET in .env");
}

function createCalendarApi(auth: OAuth2Client) {
	google.options({
		retryConfig: {
			currentRetryAttempt: 0,
			retry: 3,
			retryDelay: 100,
			httpMethodsToRetry: ["GET", "PATCH", "PUT", "POST", "DELETE"],
			noResponseRetries: 2,
			statusCodesToRetry: [
				[100, 199],
				[403, 403],
				[429, 429],
				[500, 599],
			],
		},
	});
	const calendar = google.calendar({
		version: "v3",
		auth,
	});
	return calendar;
}

function createAuth(id: number) {
	const auth = new google.auth.OAuth2(
		googleClientId,
		googleClientSecret,
		//calendarAuthRedirectUri
	).on("tokens", (tokens) => {
		console.log(`updateAuthParams for ${id}:`, tokens);
		// Listen for token updates. Store the refresh_token if we get one.
		const account = calendarAccounts[id];
		if (account) {
			// Update cached authParams with new tokens
			if (account.authParams)
				account.authParams = { ...account.authParams, ...tokens };
			else account.authParams = tokens;
		}
		updateAuthParams(id, tokens);
	});
	return auth;
}

function createCalendarAccount(oauthAccount: OAuthAccount) {
	const id = oauthAccount.id;
	const auth = createAuth(id);
	if (oauthAccount.authParams) auth.setCredentials(oauthAccount.authParams);
	const api = createCalendarApi(auth);
	calendarAccounts[id] = {
		...oauthAccount,
		auth,
		api,
		calendarList: [],
		lastAccessed: null,
	};
	return calendarAccounts[id];
}

function removeCalendarAccount(id: number) {
	delete calendarAccounts[id];
}

async function getCalendarAccount(id: number) {
	const account = calendarAccounts[id];
	if (account) return account;

	const [oauthAccount] = await getOAuthAccounts({
		id,
		type: "calendar",
	});
	if (oauthAccount) {
		const account = createCalendarAccount(oauthAccount);
		return account;
	}
	throw new NotFoundError(`Calendar account id=${id} not found`);
}

async function activateCalendarAccount(
	account: CalendarAccountLocal,
	authParams: Auth.Credentials,
) {
	account.authParams = authParams;
	account.auth.setCredentials(authParams);
	account.primaryCalendar = await getPrimaryCalendar(account.id);
	let calendarList = await getCalendarList(account.id);
	if (calendarList) {
		calendarList = calendarList.filter((cal) => cal.accessRole === "owner");
		account.calendarList = calendarList;
	}
}

function deactivateCalendarAccount(id: number) {
	const account = calendarAccounts[id];
	if (account) {
		account.authParams = null;
		account.auth.setCredentials({});
		delete account.primaryCalendar;
		account.calendarList = [];
	}
}

/** The account may have been reauthorized on another server.
 * If so, we might be able to recover with the stored refresh_token. */
async function tryReactivateAccount(account: CalendarAccountLocal) {
	try {
		const authParams = account.authParams;
		deactivateCalendarAccount(account.id);

		const [oauthAccount] = await getOAuthAccounts({
			id: account.id,
			type: "calendar",
		});
		if (!oauthAccount) {
			removeCalendarAccount(account.id);
		} else {
			if (
				oauthAccount.authParams &&
				oauthAccount.authParams.refresh_token &&
				authParams &&
				oauthAccount.authParams.refresh_token !==
					authParams.refresh_token
			) {
				await activateCalendarAccount(account, oauthAccount.authParams);
			}
		}
	} catch (error) {
		console.warn("tryReactivateAccount error:", error);
	}
}

async function getActivatedCalendarAccount(id: number) {
	const account = await getCalendarAccount(id);
	if (!account.primaryCalendar)
		throw new Error(`Calendar account id=${id} not activated`);
	return account as ActivatedCalendarAccountLocal;
}

/**
 * Get the URL for authorizing calendar access
 * @param user The user that will perform the auth
 * @param host host portion of URL
 * @param account Calendar account
 */
function getAuthUrl(
	user: UserContext,
	host: string,
	account: CalendarAccountLocal,
) {
	return account.auth.generateAuthUrl({
		access_type: "offline",
		scope: calendarAuthScope,
		state: genOAuthState({
			accountId: account.id,
			userId: user.SAPIN,
			host,
		}),
		include_granted_scopes: true,
		redirect_uri: host + calendarAuthRedirectPath,
		prompt: "consent",
	});
}

/**
 * Calendar OAuth2 completion callback.
 * Completes mutual authentication; instantiates an API for accessing the calendar account
 * @params The parameters returned by the OAuth completion redirect
 */
export async function completeAuthCalendarAccount({
	state = "",
	code = "",
}: {
	state?: string;
	code?: string;
}) {
	const stateObj = parseOAuthState(state);
	if (!stateObj) {
		console.warn("OAuth completion with bad state", state);
		return;
	}
	const { accountId, userId, host } = stateObj;
	let account = calendarAccounts[accountId];
	if (!account) {
		const [oauthAccount] = await getOAuthAccounts({
			type: "calendar",
			id: accountId,
		});
		if (!oauthAccount) return;
		account = createCalendarAccount(oauthAccount);
	}

	const redirect_uri = host + calendarAuthRedirectPath;
	const { tokens } = await account.auth.getToken({
		code,
		redirect_uri,
	});
	console.log("completeAuth: ", tokens);
	await setAuthParams(accountId, tokens, userId);

	// Activate google calendar api for this account
	await activateCalendarAccount(account, tokens);
}

async function cleanCalendarAccounts() {
	const oauthAccounts = await getOAuthAccounts({
		type: "calendar",
	});
	const oauthIds = oauthAccounts.map((oauthAccount) => oauthAccount.id);

	for (const id of Object.keys(calendarAccounts)) {
		if (!oauthIds.includes(Number(id))) delete calendarAccounts[id];
	}
}

export async function getCalendarAccounts(
	req: Request,
	user: UserContext,
	query?: CalendarAccountsQuery,
) {
	const proxyHost = req.headers["x-forwarded-host"] as string;
	const m = /(http[s]?:\/\/[^/]+)\//.exec(req.headers["referer"] || "");
	const host = m ? m[1] : proxyHost || req.headers.host || "";

	// Use "get" as a way to clean stale entries in the cache
	await cleanCalendarAccounts();

	const oauthAccounts = await getOAuthAccounts({
		...query,
		type: "calendar",
	});

	const accounts: CalendarAccount[] = [];
	for (const oauthAccount of oauthAccounts) {
		const id = oauthAccount.id;
		let account = calendarAccounts[id];
		if (!account) account = createCalendarAccount(oauthAccount);

		if (account.authParams && !account.primaryCalendar) {
			try {
				await activateCalendarAccount(account, account.authParams);
			} catch (error) {
				console.warn(error);
			}
		}

		let authUrl: string = "";
		try {
			authUrl = getAuthUrl(user, host, account);
		} catch (error) {
			console.warn(error);
		}
		const { authParams, ...rest } = oauthAccount;
		const accountOut: CalendarAccount = {
			...rest,
			authUrl,
			displayName: account.primaryCalendar?.summary || "",
			userName: account.primaryCalendar?.id || "",
			primaryCalendar: account.primaryCalendar,
			calendarList: account.calendarList,
			lastAccessed: account.lastAccessed,
		};
		accounts.push(accountOut);
	}

	return accounts;
}

/**
 * Add calendar account
 * @param req The express request
 * @param user User executing the add
 * @param groupId Working group identifier
 * @param accountIn Expects calendar account create object
 * @returns Calendar account object as added
 */
export async function addCalendarAccount(
	req: Request,
	user: UserContext,
	groupId: string,
	accountIn: CalendarAccountCreate,
) {
	const oauthAccountIn: OAuthAccountCreate = {
		...accountIn,
		type: "calendar",
		groupId,
	};
	const id = await addOAuthAccount(oauthAccountIn);
	const [account] = await getCalendarAccounts(req, user, { id });
	return account;
}

/**
 * Update calendar account
 * @param req The express request
 * @param user User executing the update
 * @param groupId Working group identifier
 * @param id Calendar account identifier
 * @param changes Calendar account change object
 */
export async function updateCalendarAccount(
	req: Request,
	user: UserContext,
	groupId: string,
	id: number,
	changes: CalendarAccountChange,
) {
	const [oauthAccount] = await getOAuthAccounts({
		id,
		groupId,
		type: "calendar",
	});
	if (!oauthAccount)
		throw new NotFoundError(`Calendar account id=${id} not found`);
	await updateOAuthAccount(groupId, id, changes);
	const [account] = await getCalendarAccounts(req, user, { id });
	return account;
}

/**
 * Delete calendar account
 * @param groupId Working group identifier
 * @param id Calendar account identifier
 */
export async function deleteCalendarAccount(groupId: string, id: number) {
	const affectedRows = await deleteOAuthAccount(groupId, id);
	removeCalendarAccount(id);
	return affectedRows;
}

/**
 * Revoke calendar account authorization
 * @param req The express request
 * @param user User revoking authorization
 * @param groupId Working group identifier
 * @param id Calendar account identifier
 */
export async function revokeAuthCalendarAccount(
	req: Request,
	user: UserContext,
	groupId: string,
	id: number,
) {
	const [oauthAccount] = await getOAuthAccounts({
		id,
		groupId,
		type: "calendar",
	});
	if (!oauthAccount)
		throw new NotFoundError(`Calendar account id=${id} not found`);
	if (oauthAccount.authParams) {
		const token = oauthAccount.authParams.access_token;
		try {
			const options = {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: qs.stringify({ token }),
			};
			// Revoke token
			await fetch(calendarRevokeUrl, options);
		} catch (error) {
			console.log("revoke calendar token error:", error);
		}
	}
	await setAuthParams(id, null, user.SAPIN);
	deactivateCalendarAccount(id);

	const [accountOut] = await getCalendarAccounts(req, user, { id });
	return accountOut;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calendarApiError(account: CalendarAccountLocal, error: any): never {
	const status = error?.status;
	const data = error?.response?.data;
	if (data && status >= 400 && status < 500) {
		if (data.error && data.error_description) {
			if (data.error === "invalid_grant") {
				tryReactivateAccount(account);
			}
			const message = `${data.error} - ${data.error_description}`;
			throw new Error(`calendar api: ${message}`);
		}
		throw new Error(`calendar api: ${status} ${JSON.stringify(data)}`);
	}
	console.log(error);
	throw error;
}

function touchAccount(account: CalendarAccountLocal) {
	account.lastAccessed = new Date().toISOString();
}

export async function getPrimaryCalendar(id: number) {
	const account = await getCalendarAccount(id);
	return account.api.calendars
		.get({ calendarId: "primary" })
		.then((response) => {
			touchAccount(account);
			return response.data as GoogleCalendar;
		})
		.catch((error) => calendarApiError(account, error));
}

export async function getCalendarList(
	id: number,
): Promise<calendar_v3.Schema$CalendarListEntry[] | void> {
	const account = await getCalendarAccount(id);
	return account.api.calendarList
		.list({ showHidden: true })
		.then((response) => {
			touchAccount(account);
			return response.data.items;
		})
		.catch((error) => calendarApiError(account, error));
}

export type CalendarEvent = calendar_v3.Schema$Event;
// Hack!! for now hard code the id so that I can use my own calendar account
const calendarId = "802.11calendar@gmail.com"; // 'primary'

export async function getCalendarEvent(
	id: number,
	eventId: string,
): Promise<CalendarEvent | void> {
	const account = await getActivatedCalendarAccount(id);
	return account.api.events
		.get({ calendarId, eventId })
		.then((response) => {
			touchAccount(account);
			return response.data;
		})
		.catch((error) => calendarApiError(account, error));
}

export async function addCalendarEvent(
	id: number,
	params: object,
): Promise<CalendarEvent | void> {
	const account = await getActivatedCalendarAccount(id);
	return account.api.events
		.insert({ calendarId, requestBody: params })
		.then((response) => {
			touchAccount(account);
			return response.data;
		})
		.catch((error) => calendarApiError(account, error));
}

export async function deleteCalendarEvent(
	id: number,
	eventId: string,
): Promise<CalendarEvent | void> {
	const account = await getActivatedCalendarAccount(id);
	return account.api.events
		.delete({ calendarId, eventId })
		.then((response) => {
			touchAccount(account);
			return response.data;
		})
		.catch((error) => calendarApiError(account, error));
}

export async function updateCalendarEvent(
	id: number,
	eventId: string,
	changes: object,
): Promise<CalendarEvent | void> {
	const account = await getActivatedCalendarAccount(id);
	return account.api.events
		.patch({ calendarId, eventId, requestBody: changes })
		.then((response) => {
			touchAccount(account);
			return response.data;
		})
		.catch((error) => calendarApiError(account, error));
}
