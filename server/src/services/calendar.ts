import axios from "axios";
import { OAuth2Client, Credentials } from "google-auth-library";
// Google Calendar: https://developers.google.com/calendar/api/v3/reference/calendars
import { google, calendar_v3 } from "googleapis";
import { Request } from "express";
import { User } from "./users";

import {
	genOAuthState,
	parseOAuthState,
	getOAuthAccounts,
	addOAuthAccount,
	updateOAuthAccount,
	deleteOAuthAccount,
	updateAuthParams,
} from "./oauthAccounts";
import { OAuthAccount, OAuthAccountCreate } from "../schemas/oauthAccounts";
import {
	CalendarAccount,
	CalendarAccountCreate,
	CalendarAccountChange,
	CalendarAccountsQuery,
} from "../schemas/calendar";
import { NotFoundError } from "../utils";

type CalendarAccountLocal = Omit<
	CalendarAccount,
	"authUrl" | "userName" | "displayName"
> & {
	calendar?: calendar_v3.Calendar;
	auth: OAuth2Client;
	authParams: Credentials | null;
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
	// Ensure that we have CLIENT_ID and CLIENT_SECRET
	if (process.env.GOOGLE_CLIENT_ID)
		googleClientId = process.env.GOOGLE_CLIENT_ID;
	else console.warn("Calendar API: Missing .env variable GOOGLE_CLIENT_ID");

	if (process.env.GOOGLE_CLIENT_SECRET)
		googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
	else
		console.warn(
			"Calendar API: Missing .env variable GOOGLE_CLIENT_SECRET"
		);
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
		googleClientSecret
		//calendarAuthRedirectUri
	).on("tokens", (tokens) => {
		console.log(`updateAuthParams for ${id}:`, tokens);
		// Listen for token updates. Store the refresh_token if we get one.
		updateAuthParams(id, tokens);
	});
	return auth;
}

function createCalendarAccount(account: OAuthAccount) {
	const id = account.id;
	calendarAccounts[id] = {
		...account,
		auth: createAuth(id),
		calendarList: [],
		lastAccessed: null,
	};
	return calendarAccounts[id];
}

async function activateCalendarAccount(id: number, authParams: Credentials) {
	const account = calendarAccounts[id];
	account.authParams = authParams;
	account.auth.setCredentials(authParams);
	account.calendar = createCalendarApi(account.auth);
	account.details = await getPrimaryCalendar(account.id);
	let calendarList = await getCalendarList(account.id);
	if (calendarList) {
		calendarList = calendarList.filter((cal) => cal.accessRole === "owner");
		account.calendarList = calendarList;
	}
}

async function deactivateCalendarAccount(id: number) {
	const account = calendarAccounts[id];
	if (account) {
		account.authParams = null;
		account.auth = createAuth(id); // replace current auth context with clean one
		delete account.calendar;
		delete account.details;
		account.calendarList = [];
	}
}

function removeCalendarAccount(id: number) {
	delete calendarAccounts[id];
}

function getCalendarApi(account: CalendarAccountLocal) {
	if (!account.calendar)
		throw new TypeError(`Inactive calendar account id=${account.id}`);
	return account.calendar;
}

/**
 * Get the URL for authorizing calendar access
 * @param user The user that will perform the auth
 * @param host host portion of URL
 * @param account Calendar account
 */
function getAuthUrl(user: User, host: string, account: CalendarAccountLocal) {
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

	const { tokens } = await account.auth.getToken({
		code,
		redirect_uri: host + calendarAuthRedirectPath,
	});
	console.log("completeAuth: ", tokens);
	await updateAuthParams(accountId, tokens, userId);

	// Activate google calendar api for this account
	await activateCalendarAccount(accountId, tokens);
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

async function getActiveCalendarAccounts(query?: CalendarAccountsQuery) {
	let oauthAccounts = await getOAuthAccounts({
		...query,
		type: "calendar",
	});

	const accountsOut: CalendarAccountLocal[] = [];
	for (const oauthAccount of oauthAccounts) {
		const id = oauthAccount.id;
		let account = calendarAccounts[id];
		if (!account) account = createCalendarAccount(oauthAccount);
		if (account.authParams) accountsOut.push(account);
	}

	return accountsOut;
}

async function getActiveCalendarAccount(id: number) {
	const [account] = await getActiveCalendarAccounts({ id });
	if (!account)
		throw new NotFoundError(`Calendar account (id=${id}) not found`);
	if (!account.calendar) {
		await activateCalendarAccount(id, account.authParams!);
	}
	return account;
}

export async function getCalendarAccounts(
	req: Request,
	user: User,
	query?: CalendarAccountsQuery
) {
	const proxyHost = req.headers["x-forwarded-host"] as string;
	const m = /(http[s]?:\/\/[^\/]+)\//.exec(req.headers["referer"] || "");
	const host = m ? m[1] : proxyHost || req.headers.host || "";

	// Use "get" as a way to clean stale entries in the cache
	await cleanCalendarAccounts();

	let oauthAccounts = await getOAuthAccounts({
		...query,
		type: "calendar",
	});

	const accountsOut: CalendarAccount[] = [];
	for (const oauthAccount of oauthAccounts) {
		const id = oauthAccount.id;
		let account = calendarAccounts[id];
		if (!account) account = createCalendarAccount(oauthAccount);

		if (account.authParams && !account.calendar) {
			try {
				await activateCalendarAccount(id, account.authParams);
			} catch (error) {
				console.warn(error);
			}
		}

		let accountOut: CalendarAccount;
		let authUrl: string = "";
		try {
			authUrl = getAuthUrl(user, host, account);
		} catch (error) {
			console.warn(error);
		}
		const { authParams, ...rest } = oauthAccount;
		accountOut = {
			...rest,
			authUrl,
			displayName: account.details?.summary || "",
			userName: account.details?.id || "",
			calendarList: account.calendarList,
			lastAccessed: account.lastAccessed,
		};
		accountsOut.push(accountOut);
	}

	return accountsOut;
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
	user: User,
	groupId: string,
	accountIn: CalendarAccountCreate
) {
	let oauthAccountIn: OAuthAccountCreate = {
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
	user: User,
	groupId: string,
	id: number,
	changes: CalendarAccountChange
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
	user: User,
	groupId: string,
	id: number
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
			await axios.post(calendarRevokeUrl, {
				token,
			});
		} catch (error) {
			console.log("revoke calendar token error:", error);
		}
	}
	await updateAuthParams(id, null, user.SAPIN);
	await deactivateCalendarAccount(id);

	const [accountOut] = await getCalendarAccounts(req, user, { id });
	return accountOut;
}

function calendarApiError(error: any) {
	const { response, status } = error;
	if (response && status >= 400 && status < 500) {
		//console.log(response.config)
		const { error } = response.data;
		console.log(response);
		let message = "";
		if (typeof error === "string") message = error;
		if (typeof error === "object") message = error.message;
		throw new Error(`calendar api: status=${status} ${message}`);
	}
	console.log(error);
	throw new Error(error);
}

function touchAccount(account: CalendarAccountLocal) {
	account.lastAccessed = new Date().toISOString();
}

export async function getPrimaryCalendar(
	id: number
): Promise<calendar_v3.Schema$Calendar | void> {
	const account = await getActiveCalendarAccount(id);
	const calendar = getCalendarApi(account);
	return calendar.calendars
		.get({ calendarId: "primary" })
		.then((response) => {
			touchAccount(account);
			return response.data;
		})
		.catch(calendarApiError);
}

export async function getCalendarList(
	id: number
): Promise<calendar_v3.Schema$CalendarListEntry[] | void> {
	const account = await getActiveCalendarAccount(id);
	const calendar = getCalendarApi(account);
	return calendar.calendarList
		.list({ showHidden: true })
		.then((response) => {
			touchAccount(account);
			return response.data.items;
		})
		.catch(calendarApiError);
}

export type CalendarEvent = calendar_v3.Schema$Event;
// Hack!! for now hard code the id so that I can use my own calendar account
const calendarId = "802.11calendar@gmail.com"; // 'primary'

export async function getCalendarEvent(
	id: number,
	eventId: string
): Promise<CalendarEvent | void> {
	const account = await getActiveCalendarAccount(id);
	const calendar = getCalendarApi(account);
	return calendar.events
		.get({ calendarId, eventId })
		.then((response) => {
			touchAccount(account);
			return response.data;
		})
		.catch(calendarApiError);
}

export async function addCalendarEvent(
	id: number,
	params: object
): Promise<CalendarEvent | void> {
	const account = await getActiveCalendarAccount(id);
	const calendar = getCalendarApi(account);
	return calendar.events
		.insert({ calendarId, requestBody: params })
		.then((response) => {
			touchAccount(account);
			return response.data;
		})
		.catch(calendarApiError);
}

export async function deleteCalendarEvent(
	id: number,
	eventId: string
): Promise<CalendarEvent | void> {
	const account = await getActiveCalendarAccount(id);
	const calendar = getCalendarApi(account);
	return calendar.events
		.delete({ calendarId, eventId })
		.then((response) => {
			touchAccount(account);
			return response.data;
		})
		.catch(calendarApiError);
}

export async function updateCalendarEvent(
	id: number,
	eventId: string,
	changes: object
): Promise<CalendarEvent | void> {
	const account = await getActiveCalendarAccount(id);
	const calendar = getCalendarApi(account);
	return calendar.events
		.patch({ calendarId, eventId, requestBody: changes })
		.then((response) => {
			touchAccount(account);
			return response.data;
		})
		.catch(calendarApiError);
}
