import axios from 'axios';
import { OAuth2Client } from 'google-auth-library';
// Google Calendar: https://developers.google.com/calendar/api/v3/reference/calendars
import { google, calendar_v3 } from 'googleapis';
import { User } from './users';

import {
	genOAuthState,
	parseOAuthState,
	getOAuthAccounts,
	getOAuthParams,
	validOAuthAccountChanges,
	addOAuthAccount,
	updateOAuthAccount,
	deleteOAuthAccount,
	updateAuthParams,
	OAuthAccount,
	OAuthAccountCreate
} from './oauthAccounts';
import { isPlainObject } from '../utils';

type CalendarAccount = OAuthAccount & {
	authUrl?: string;
	details?: calendar_v3.Schema$Calendar;
	displayName?: string;
	userName?: string;
}

const calendarRevokeUrl = 'https://oauth2.googleapis.com/revoke';

const calendarAuthScope = 'https://www.googleapis.com/auth/calendar';	// string or array of strings

const calendarAuthRedirectUri = process.env.NODE_ENV === 'development'?
	'http://localhost:3000/oauth2/calendar':
	'https://802tools.org/oauth2/calendar';

// Calendar account cache
const calendars: Record<number, calendar_v3.Calendar> = {};
const auths: Record<number, OAuth2Client> = {};

let googleClientId = 'Google client ID';
let googleClientSecret = 'Google client secret';

function getCalendarApi(id: number) {
	const calendar = calendars[id];
	if (!calendar)
		throw new Error(`Invalid calendar context id=${id}`);
	return calendar;
}

function hasCalendarApi(id: number) {
	return !!calendars[id];
}

function createCalendarApi(id: number, auth: OAuth2Client) {
	google.options({
		retryConfig: {
			currentRetryAttempt: 0,
			retry: 3,
			retryDelay: 100,
			httpMethodsToRetry: ['GET', 'PATCH', 'PUT', 'POST', 'DELETE'],
			noResponseRetries: 2,
			statusCodesToRetry: [[100, 199], [403, 403], [429, 429], [500, 599]],
		},
	});
	const calendar = google.calendar({
		version: 'v3',
		auth,
	});
	calendars[id] = calendar;
	return calendar;
}

function deleteCalendarApi(id: number) {
	delete calendars[id];
}

function getAuthApi(id: number) {
	const auth = auths[id];
	if (!auth)
		throw new Error(`Invalid calendar auth context id=${id}`);
	return auth;
}

function createAuthApi(id: number) {
	const auth = new google.auth.OAuth2(
		googleClientId,
		googleClientSecret,
		calendarAuthRedirectUri
	).on('tokens', (tokens) => {
		// Listen for token updates and record the latest
		//console.log(`update credentials for ${id}:`, tokens);
		updateAuthParams(id, tokens);
	});
	auths[id] = auth;
	return auth;
}

function deleteAuthApi(id: number) {
	delete auths[id];
}

export async function init() {
	// Ensure that we have CLIENT_ID and CLIENT_SECRET
	if (process.env.GOOGLE_CLIENT_ID)
		googleClientId = process.env.GOOGLE_CLIENT_ID;
	else
		console.warn("Missing variable GOOGLE_CLIENT_ID");

	if (process.env.GOOGLE_CLIENT_SECRET)
		googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
	else
		console.warn("Missing variable GOOGLE_CLIENT_SECRET");

	// Cache the active calendar accounts and create an api instance for each
	const accounts = await getOAuthParams({type: "calendar"});
	for (const account of accounts) {
		const {id, authParams} = account;
		const auth = createAuthApi(id);
		if (authParams) {
			//console.log(`create calendar context ${id}:`, authParams);
			auth.setCredentials(authParams);
			createCalendarApi(id, auth);
		}
	}
}


/**
 * Get the URL for authorizing calendar access
 * @param user The user that will perform the auth
 * @param id Calendar account identifier
 */
function getAuthUrl(user: User, id: number) {
	const auth = getAuthApi(id);
	return auth.generateAuthUrl({
		access_type: 'offline',
		scope: calendarAuthScope,
		state: genOAuthState({accountId: id, userId: user.SAPIN, host: ''}),
		include_granted_scopes: true
	});
}

/**
 * Calendar OAuth2 completion callback.
 * Completes mutual authentication; instantiates an API for accessing the calendar account
 * @params The parameters returned by the OAuth completion redirect
 */
export async function completeAuthCalendarAccount({
	state = '',
	code = ''
}: {
	state?: string;
	code?: string
}) {

	const stateObj = parseOAuthState(state);
	if (!stateObj) {
		console.warn('OAuth completion with bad state', state);
		return;
	}
	const {accountId, userId} = stateObj;
	const auth = getAuthApi(accountId);
	
	const {tokens} = await auth.getToken(code);
	auth.setCredentials(tokens);
	await updateAuthParams(accountId, tokens, userId);
	
	// Create a google calendar api for this account
	createCalendarApi(accountId, auth);
}

export async function getCalendarAccounts(
	user: User,
	constraints?: {
		id?: number | number[];
		name?: string | string[];
		groupId?: string | string[];
	}
) {
	const accountsDB = await getOAuthAccounts({type: "calendar", ...constraints});
	const p: Promise<any>[] = [];
	const accounts = accountsDB.map(accountDB => {
		const account: CalendarAccount = {...accountDB};
		try {
			account.authUrl = getAuthUrl(user, account.id);
		}
		catch (error) {
			console.warn(error);
		}
		if (hasCalendarApi(account.id)) {
			p.push(
				getPrimaryCalendar(account.id)
					.then(details => {
						if (details) {
							account.details = details;
							if (details.summary)
								account.displayName = details.summary;
							if (details.id)
								account.userName = details.id;
						}
					})
					.catch(error => console.warn(error /*`Can't get ${account.name} (id=${account.id}) details:`, error.toString()*/))
			);
		}
		return account;
	});
	await Promise.all(p);
	return accounts;
}

/**
 * Add calendar account
 * @param user The user executing the add
 * @param accountIn Expects calendar account create object, throws otherwise
 * @returns Calendar account object as added
 */
export async function addCalendarAccount(user: User, groupId: string, accountIn: any) {
	if (!isPlainObject(accountIn))
		throw new TypeError("Bad body; expected calendar account create object");
	let account: OAuthAccountCreate = {
		name: '',
		...(accountIn as object),
		type: "calendar",
		groupId
	}
	const id = await addOAuthAccount(account);
	createAuthApi(id);
	const [accountUpdated] = await getCalendarAccounts(user, {id});
	return accountUpdated;
}

/**
 * Update calendar account
 * @param user The user executing the update
 * @param id Calendar account identifier
 * @param changes Expects calendar account update object, throws otherwise
 */
export async function updateCalendarAccount(user: User, groupId: string, id: number, changes: any) {
	if (!id)
		throw new TypeError('Must provide id with update');
	if (!validOAuthAccountChanges(changes))
		throw new TypeError("Bad body; expected calendar account changes object");
	await updateOAuthAccount(groupId, id, changes);
	const [account] = await getCalendarAccounts(user, {id});
	return account;
}

/**
 * Revoke calendar account authorization
 * @param user The user revoking the authorization
 * @param id Calendar account identifier
 */
export async function revokeAuthCalendarAccount(user: User, groupId: string, id: number) {
	const auth = getAuthApi(id);

	axios.post(calendarRevokeUrl, {token: auth.credentials.access_token})
		.then(response => console.log('revoke calendar token success:', response.data))
		.catch(error => console.log('revoke calendar token error:', error));
	await updateAuthParams(id, null, user.SAPIN);
	deleteCalendarApi(id);
	createAuthApi(id);		// replace current auth context with clean one

	const [account] = await getCalendarAccounts(user, {id});
	return account;
}

/**
 * Delete calendar account
 * @param id Calendar account identifier
 */
export async function deleteCalendarAccount(groupId: string, id: number) {
	const affectedRows = await deleteOAuthAccount(groupId, id);
	deleteCalendarApi(id);
	deleteAuthApi(id);
	return affectedRows;
}

function calendarApiError(error: any) {
	const {response, code} = error;
	if (response && code >= 400 && code < 500) {
		//console.log(response.config)
		const {error} = response.data;
		console.log(response.data)
		let message = '';
		if (typeof error === 'string')
			message = error;
		if (typeof error === 'object')
			message = error.message;
		throw new Error(`calendar api: code=${code} ${message}`); 
	}
	throw new Error(error);
}

export async function getPrimaryCalendar(id: number): Promise<calendar_v3.Schema$Calendar | void> {
	const calendar = getCalendarApi(id);
	return calendar.calendars.get({calendarId: 'primary'})
		.then(response => response.data)
		.catch(calendarApiError);
}

export type CalendarEvent = calendar_v3.Schema$Event;

export async function getCalendarEvent(id: number, eventId: string): Promise<CalendarEvent | void> {
	const calendar = getCalendarApi(id);
	return calendar.events.get({calendarId: 'primary', eventId})
		.then(response => response.data)
		.catch(calendarApiError);
}

export async function addCalendarEvent(id: number, params: object): Promise<CalendarEvent | void> {
	const calendar = getCalendarApi(id);
	return calendar.events.insert({calendarId: 'primary', requestBody: params})
		.then(response => response.data)
		.catch(calendarApiError)
}

export async function deleteCalendarEvent(id: number, eventId: string): Promise<CalendarEvent | void> {
	const calendar = getCalendarApi(id);
	return calendar.events.delete({calendarId: 'primary', eventId})
		.then(response => response.data)
		.catch(calendarApiError)
}

export async function updateCalendarEvent(id: number, eventId: string, changes: object): Promise<CalendarEvent | void> {
	const calendar = getCalendarApi(id);
	return calendar.events.patch({calendarId: 'primary', eventId, requestBody: changes})
		.then(response => response.data)
		.catch(calendarApiError)
}
