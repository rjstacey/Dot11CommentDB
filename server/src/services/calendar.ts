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
	authParams: Record<string, any> | null;
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

function createCalendarApi(id: number, auth: OAuth2Client) {
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

function activateCalendarAccount(id: number, authParams: Credentials) {
	const account = calendarAccounts[id];
	const { access_token, ...tokens } = authParams;
	account.auth.setCredentials(tokens);
	account.calendar = createCalendarApi(id, account.auth);

	getPrimaryCalendar(account.id)
		.then((details) => {
			if (details) {
				account.details = details;
			}
		})
		.catch((error) => console.warn(error));
	getCalendarList(account.id)
		.then((calendarList: calendar_v3.Schema$CalendarListEntry[] | void) => {
			if (calendarList) {
				calendarList = calendarList.filter(
					(cal) => cal.accessRole === "owner"
				);
				account.calendarList = calendarList;
			}
		})
		.catch((error) => console.warn(error));
}

function createCalendarAccount(account: OAuthAccount) {
	const id = account.id;
	calendarAccounts[id] = {
		...account,
		auth: createAuth(id),
		calendarList: [],
		lastAccessed: null,
	};
	if (account.authParams)
		activateCalendarAccount(id, account.authParams as Credentials);
}

export function getCalendarAccount(id: number) {
	const account = calendarAccounts[id];
	if (!account) throw new NotFoundError(`Invalid account id=${id}`);
	return account;
}

function removeCalendarAccount(id: number) {
	delete calendarAccounts[id];
}

function getCalendarApi(id: number) {
	const api = getCalendarAccount(id).calendar;
	if (!api) throw new TypeError(`Inactive calendar account id=${id}`);
	return api;
}

function createAuth(id: number) {
	const auth = new google.auth.OAuth2(
		googleClientId,
		googleClientSecret
		//calendarAuthRedirectUri
	).on("tokens", (tokens) => {
		//console.log(`updateAuthParams for ${id}:`, tokens);
		// Listen for token updates. Store the refresh_token if we get one.
		if (tokens.refresh_token) {
			updateAuthParams(id, tokens);
		}
	});
	return auth;
}

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

	// Cache the active calendar accounts and create an api instance for each
	const accounts = await getOAuthAccounts({ type: "calendar" });
	accounts.forEach(createCalendarAccount);
}

/**
 * Get the URL for authorizing calendar access
 * @param user The user that will perform the auth
 * @param id Calendar account identifier
 */
function getAuthUrl(user: User, host: string, id: number) {
	const auth = getCalendarAccount(id).auth;
	return auth.generateAuthUrl({
		access_type: "offline",
		scope: calendarAuthScope,
		state: genOAuthState({ accountId: id, userId: user.SAPIN, host }),
		include_granted_scopes: true,
		redirect_uri: host + calendarAuthRedirectPath,
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
	const auth = getCalendarAccount(accountId).auth;

	const { tokens } = await auth.getToken({
		code,
		redirect_uri: host + calendarAuthRedirectPath,
	});
	console.log("comppleteAuth: ", tokens);
	auth.setCredentials(tokens);
	await updateAuthParams(accountId, tokens, userId);

	// Create a google calendar api for this account
	activateCalendarAccount(accountId, tokens);
}

function getCalendarAccountsLocal(constraints?: CalendarAccountsQuery) {
	let accounts = Object.values(calendarAccounts).filter(
		(account) => account.calendar
	);
	if (constraints) {
		if (constraints.groupId) {
			accounts = accounts.filter(
				(account) => account.groupId === constraints.groupId
			);
		}
		if (constraints.id) {
			accounts = accounts.filter(
				(account) => account.id === constraints.id
			);
		}
		if (constraints.isActive) {
			accounts = accounts.filter((account) => account.calendar);
		}
	}
	return accounts;
}

export async function getCalendarAccounts(
	req: Request,
	user: User,
	constraints?: CalendarAccountsQuery
) {
	const m = /(https{0,1}:\/\/[^\/]+)/i.exec(req.headers.referer || "");
	const host = m ? m[1] : "";

	const accounts = getCalendarAccountsLocal(constraints);
	const accountsOut: CalendarAccount[] = accounts.map((account) => {
		const { authParams, auth, calendar, ...rest } = account;
		let authUrl: string = "";
		try {
			authUrl = getAuthUrl(user, host, account.id);
		} catch (error) {
			console.warn(error);
		}
		const accountOut: CalendarAccount = {
			...rest,
			authUrl,
			displayName: account.details?.summary || "",
			userName: account.details?.id || "",
		};
		return accountOut;
	});
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
	let oauthAccount: OAuthAccountCreate = {
		...accountIn,
		type: "calendar",
		groupId,
	};
	const id = await addOAuthAccount(oauthAccount);
	const [account] = await getOAuthAccounts({ id });
	createCalendarAccount(account);
	const accounts = await getCalendarAccounts(req, user, { id: account.id });
	return accounts[0];
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
	if (!id) throw new TypeError("Must provide id with update");
	await updateOAuthAccount(groupId, id, changes);
	let account = getCalendarAccountsLocal({ id })[0];
	if (changes.name) account.name = changes.name;
	const accounts = await getCalendarAccounts(req, user, { id: account.id });
	return accounts[0];
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
	const account = getCalendarAccount(id);
	const auth = account.auth;
	axios
		.post(calendarRevokeUrl, { token: auth.credentials.access_token })
		.then((response) =>
			console.log("revoke calendar token success:", response.data)
		)
		.catch((error) => console.log("revoke calendar token error:", error));
	await updateAuthParams(id, null, user.SAPIN);
	delete account.calendar;
	account.auth = createAuth(id); // replace current auth context with clean one

	const [accountOut] = await getCalendarAccounts(req, user, { id });
	return accountOut;
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

function calendarApiError(error: any) {
	const { response, code } = error;
	if (response && code >= 400 && code < 500) {
		//console.log(response.config)
		const { error } = response.data;
		console.log(response.data);
		let message = "";
		if (typeof error === "string") message = error;
		if (typeof error === "object") message = error.message;
		throw new Error(`calendar api: code=${code} ${message}`);
	}
	throw new Error(error);
}

function touchAccount(account: CalendarAccountLocal) {
	account.lastAccessed = new Date().toISOString();
}

export async function getPrimaryCalendar(
	id: number
): Promise<calendar_v3.Schema$Calendar | void> {
	const account = getCalendarAccount(id);
	const calendar = getCalendarApi(id);
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
	const account = getCalendarAccount(id);
	const calendar = getCalendarApi(id);
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
	const account = getCalendarAccount(id);
	const calendar = getCalendarApi(id);
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
	const account = getCalendarAccount(id);
	const calendar = getCalendarApi(id);
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
	const account = getCalendarAccount(id);
	const calendar = getCalendarApi(id);
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
	const account = getCalendarAccount(id);
	const calendar = getCalendarApi(id);
	return calendar.events
		.patch({ calendarId, eventId, requestBody: changes })
		.then((response) => {
			touchAccount(account);
			return response.data;
		})
		.catch(calendarApiError);
}
