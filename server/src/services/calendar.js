const axios = require('axios');
const {google} = require('googleapis');
const db = require('../utils/database');

const calendarRevokeUrl = 'https://oauth2.googleapis.com/revoke';

const calendarAuthScope = 'https://www.googleapis.com/auth/calendar';	// string or array of strings

const calendarAuthRedirectUri = process.env.NODE_ENV === 'development'?
	'http://localhost:3000/oauth2/calendar':
	'https://802tools.org/oauth2/calendar';

// Calendar account cache
const calendars = {};
const auths = {};

function getCalendarApi(id) {
	const calendar = calendars[id];
	if (!calendar)
		throw new Error(`Invalid calendar context id=${id}`);
	return calendar;
}

function hasCalendarApi(id) {
	return !!calendars[id];
}

function createCalendarApi(id, auth) {
	google.options({
		http2: true,
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

function deleteCalendarApi(id) {
	delete calendars[id];
}

function getAuthApi(id) {
	const auth = auths[id];
	if (!auth)
		throw new Error(`Invalid calendar auth context id=${id}`);
	return auth;
}

function createAuthApi(id) {
	const auth = new google.auth.OAuth2(
		process.env.GOOGLE_CLIENT_ID,
		process.env.GOOGLE_CLIENT_SECRET,
		calendarAuthRedirectUri
	).on('tokens', (tokens) => {
		// Listen for token updates and record the latest
		//console.log(`update credentials for ${id}:`, tokens);
		updateAuthParams(id, tokens);
	});
	auths[id] = auth;
	return auth;
}

function deleteAuthApi(id) {
	delete auths[id];
}

/*
 * Update the auth parameters
 * We merge new auth parameters with existing perameters. We do this because the refresh token
 * is only return on the first authorization. Subsequent authorization just return an access token.
 * @id {number} Calendar account identifier
 * @authParams {object} New tokens. A null value clears the current paramters.
 */
const updateAuthParams = (id, authParams) => {
	const updates = authParams?
		db.format('authParams=JSON_MERGE_PATCH(COALESCE(authParams, "{}"), ?), authDate=NOW()', JSON.stringify(authParams)):
		'authParams=NULL, authDate=NULL';

	return db.query('UPDATE oauth_accounts SET ' + updates + ' WHERE id=?', [id]);
}

export async function init() {
	// Cache the active calendar accounts and create an api instance for each
	const accounts = await db.query('SELECT * FROM oauth_accounts WHERE type="calendar";');
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

/*
 * Get the URL for authorizing calendar access
 * @id {number} Calendar account identifier
 */
function getAuthUrl(id) {
	const auth = getAuthApi(id);
	return auth.generateAuthUrl({
		access_type: 'offline',
		scope: calendarAuthScope,
		state: id,	// Calendar account id
		include_granted_scopes: true
	});
}

/*
 * Complete calendar authorization.
 * @params {object} The parameters returned by the OAuth completion redirect
 */
export async function completeAuthCalendarAccount(params) {

	const id = params.state;	// Calendar account id
	const auth = getAuthApi(id);
	
	const {tokens} = await auth.getToken(params.code);
	auth.setCredentials(tokens);
	await updateAuthParams(id, tokens);
	
	// Create a google calendar api for this account
	createCalendarApi(id, auth);

	const [account] = await getAccounts({id});
	return account;
}

async function getAccounts(constraints) {

	let sql = 'SELECT `id`, `name`, `type`, `groups`, `authDate` FROM oauth_accounts';
	if (constraints)
		sql += ' WHERE ' + Object.entries(constraints).map(([key, value]) => db.format(Array.isArray(value)? '?? IN (?)': '??=?', [key, value])).join(' AND ');
	const accounts = await db.query(sql);

	for (const account of accounts) {
		try {
			account.authUrl = getAuthUrl(account.id);
		}
		catch (error) {
			console.warn(error);
			account.authUrl = null;
		}
	}

	return accounts;
}

export async function getCalendarAccounts(constraints) {
	const accounts = await getAccounts({type: "calendar", ...constraints});
	const p = [];
	for (const account of accounts) {
		if (hasCalendarApi(account.id)) {
			p.push(
				getPrimaryCalendar(account.id)
					.then(details => account.details = details)
					.catch(error => console.warn(error /*`Can't get ${account.name} (id=${account.id}) details:`, error.toString()*/))
			);
		}
	}
	await Promise.all(p);
	return accounts;
}

/*
 * Convert calendar account object into a form sutable for database storage
 * @s {object} Calendar account object
 */
function accountEntry(s) {
	const entry = {
		name: s.name,
	};

	if (Array.isArray(s.groups))
		entry.groups = JSON.stringify(s.groups);

	for (const key of Object.keys(entry)) {
		if (entry[key] === undefined)
			delete entry[key];
	}

	return entry;
}

/*
 * Update calendar account
 * @entry {object} Calendar account object
 */
export async function addCalendarAccount(entry) {
	entry = accountEntry(entry);
	entry.type = 'calendar';
	const {insertId} = await db.query('INSERT INTO oauth_accounts (??) VALUES (?);', [Object.keys(entry), Object.values(entry)]);
	const [account] = await getCalendarAccounts({id: insertId});
	return account;
}

/*
 * Update calendar account
 * @id {number} Calendar account identifier
 * @entry {object} Calendar account object with fields to be updated
 */
export async function updateCalendarAccount(id, entry) {
	if (!id)
		throw new Error('Must provide id with update');
	entry = accountEntry(entry);
	if (Object.keys(entry).length)
		await db.query('UPDATE oauth_accounts SET ? WHERE id=?;', [entry, id]);
	const [account] = await getCalendarAccounts({id});
	return account;
}

/*
 * Revoke calendar account authorization
 * @id {number} Calendar account identifier
 */
export async function revokeAuthCalendarAccount(id) {
	const auth = getAuthApi(id);

	axios.post(calendarRevokeUrl, {token: auth.credentials.access_token})
		.then(response => console.log('revoke calendar token success:', response.data))
		.catch(error => console.log('revoke calendar token error:', error));
	await updateAuthParams(id, null);
	deleteCalendarApi(id);
	createAuthApi(id);		// replace current auth context with clean one

	const [account] = await getAccounts({id});
	return account;
}

/*
 * Delete calendar account
 * @id {number} Calendar account identifier
 */
export async function deleteCalendarAccount(id) {
	const {affectedRows} = await db.query('DELETE FROM oauth_accounts WHERE id=?', [id]);
	deleteCalendarApi(id);
	deleteAuthApi(id);
	return affectedRows;
}

function calendarApiError(error) {
	const {response, code} = error;
	if (response && code >= 400 && code < 500) {
		//console.log(response.config)
		const {error} = response.data;
		const message = error?.message;
		throw new Error(`calendar api: code=${code} ${message}`); 
	}
	throw new Error(error);
}

export async function getPrimaryCalendar(id) {
	const calendar = getCalendarApi(id);
	return calendar.calendars.get({calendarId: 'primary'})
		.then(response => response.data)
		.catch(calendarApiError);
}

export async function getCalendarEvent(id, eventId) {
	const calendar = getCalendarApi(id);
	return calendar.events.get({calendarId: 'primary', eventId})
		.then(response => response.data)
		.catch(calendarApiError);
}

export async function addCalendarEvent(id, params) {
	const calendar = getCalendarApi(id);
	return calendar.events.insert({calendarId: 'primary', requestBody: params})
		.then(response => response.data)
		.catch(calendarApiError)
}

export async function deleteCalendarEvent(id, eventId) {
	const calendar = getCalendarApi(id);
	return calendar.events.delete({calendarId: 'primary', eventId})
		.then(response => response.data)
		.catch(calendarApiError)
}

export async function updateCalendarEvent(id, eventId, changes) {
	const calendar = getCalendarApi(id);
	return calendar.events.patch({calendarId: 'primary', eventId, requestBody: changes})
		.then(response => response.data)
		.catch(calendarApiError)
}
