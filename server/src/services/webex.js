import { DateTime } from 'luxon';
import { AuthError, NotFoundError, isPlainObject } from '../utils';

import axios from 'axios';
import webex from 'webex';

import db from '../utils/database';

const webexApiBaseUrl = 'https://webexapis.com/v1';
const webexAuthUrl = 'https://webexapis.com/v1/authorize';
const webexTokenUrl = 'https://webexapis.com/v1/access_token';

const webexAuthScope = [
	"spark:kms",
	"meeting:controls_write",
	"meeting:schedules_read",
	"meeting:participants_read",
	"meeting:controls_read",
	"meeting:preferences_write",
	"meeting:preferences_read",
	"meeting:participants_write",
	"meeting:schedules_write"
].join(' ');

const webexAuthRedirectUri = process.env.NODE_ENV === 'development'?
//	'http://localhost:3000/telecons/webex/auth':
//	'https://802tools.org/telecons/webex/auth';
	'http://localhost:3000/oauth2/webex':
	'https://802tools.org/oauth2/webex';

const apis = {};	// Webex account APIs indexed by account ID.
const defaultTimezone = 'America/New_York';
let webexClientId;
let webexClientSecret;

function getWebexApi(id) {
	const api = apis[id];
	if (!api)
		throw new TypeError(`Invalid account id=${id}`);
	return api;
}

/*
 * Create Webex API.
 *
 * Instantiate an Axios instance to access a Webex account.
 * Create a response interceptor that will reaquire a token if the current token expires.
 * Keep the accounts database updated with the current tokens.
 */
function createWebexApi(id, authParams) {
	// Create axios instance with appropriate defaults
	const api = axios.create({
		headers: {
			'Authorization': `Bearer ${authParams.access_token}`,
			'Accept': 'application/json',
			'Timezone': defaultTimezone
		},
		baseURL: webexApiBaseUrl,
		refresh_token: authParams.refresh_token
	});

	if (process.env.NODE_ENV === 'development') {
		api.interceptors.request.use(
			config => {
				console.log(id, config.method, config.url)
				if (config.data)
					console.log('data=', config.data)
				return config;
			}
		);
	}

	// Add a response interceptor
	api.interceptors.response.use(
		(response) => response, 
		async (error) => {
			if (error.response && error.response.status === 401) {
				// If we get 'Unauthorized' then refresh the access token
				console.log('unauthorized')
				const request = error.config;
				const params = {
					grant_type: 'refresh_token',
					client_id: webexClientId,
					client_secret: webexClientSecret,
					refresh_token: api.defaults.refresh_token,
				};
				const response = await axios.post(webexTokenUrl, params);
				const authParams = response.data;
				await updateAuthParams(id, authParams);
				api.defaults.refresh_token = authParams.refresh_token;
				api.defaults.headers['Authorization'] = `Bearer ${authParams.access_token}`;

				// Resubmit request with updated access token
				request.headers['Authorization'] = api.defaults.headers['Authorization'];
				return axios(request);
			}
			return Promise.reject(error);
		}
	);

	apis[id] = api;
}

/*
 * Delete Webex API.
 */
function deleteWebexApi(id) {
	delete apis[id];
}

/*
 * Store autherization parameters in oauth_accounts table.
 */
function updateAuthParams(id, authParams) {
	return db.query('UPDATE oauth_accounts SET authParams=?, authDate=NOW() WHERE id=?', [JSON.stringify(authParams), id]);
}

/*
 * Init routine, run at startup.
 *
 * Instantiate an API for each of the configured Webex accounts.
 */
export async function init() {

	if (!process.env.WEBEX_CLIENT_ID)
		console.warn("Missing variable WEBEX_CLIENT_ID");
	if (!process.env.WEBEX_CLIENT_SECRET)
		console.warn("Missing variable WEBEX_CLIENT_SECRET");
	webexClientId = process.env.WEBEX_CLIENT_ID;
	webexClientSecret = process.env.WEBEX_CLIENT_SECRET;

	// Cache the active webex accounts and create an axios api for each
	const accounts = await db.query('SELECT * FROM oauth_accounts WHERE type="webex";');
	for (const account of accounts) {
		const {id, authParams} = account;
		if (authParams) {
			// Create and axios api for this account
			createWebexApi(id, authParams);
		}
	}
}

/*
 * Get a list of Webex accounts.
 * Set the autherization URL for each.
 * Try to get a list of templates for each.
 */
async function getAccounts(constraints) {
	let sql = 'SELECT `id`, `name`, `type`, `groups`, `authDate` FROM oauth_accounts';
	if (constraints)
		sql += ' WHERE ' + Object.entries(constraints).map(([key, value]) => db.format(Array.isArray(value)? '?? IN (?)': '??=?', [key, value])).join(' AND ');
	const accounts = await db.query(sql);

	for (const account of accounts) {
		account.authUrl = getAuthWebexAccount(account.id);
		try {
			account.templates = await getWebexTemplates(account.id);
		}
		catch (error) {
			console.log(error);
		}
	}

	return accounts;
}

/*
 * Get the URL for authorizing webex access
 * @id {number} Webex account identifier
 */
export function getAuthWebexAccount(id) {
	return webexAuthUrl +
		'?' + new URLSearchParams({
				client_id: webexClientId,
				response_type: 'code',
				scope: webexAuthScope,
				redirect_uri: webexAuthRedirectUri,
				state: id,
			});
}

/*
 * Callback for OAuth2 process.
 *
 * Completes mutual authentication for access to a Webex account.
 * Instantiate an API for accessing the Webex account.
 */
export async function completeAuthWebexAccount(params) {
	const {state, code} = params;
	const id = parseInt(state);
	params = {
		grant_type: 'authorization_code',
		client_id: webexClientId,
		client_secret: webexClientSecret,
		code: code,
		redirect_uri: webexAuthRedirectUri
	};

	const response = await axios.post(webexTokenUrl, params);
	const authParams = response.data;

	await updateAuthParams(id, authParams);

	// Create an axios instance for this account
	createWebexApi(id, authParams);
}


export function getWebexAccounts(constraints) {
	return getAccounts({type: "webex", ...constraints});
}

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
 * Add a Webex account.
 * Just creates a database entry. Instatiation occurs following OAuth2 process.
 *
 * @entry:object 	An account object.
 *
 * Returns an object that is the account as added.
 */
export async function addWebexAccount(entry) {
	entry = accountEntry(entry);
	entry.type = 'webex';
	const {insertId} = await db.query('INSERT INTO oauth_accounts (??) VALUES (?);', [Object.keys(entry), Object.values(entry)]);
	const [account] = await getAccounts({id: insertId});
	return account;
}

/*
 * Update a Webex account.
 *
 * @id:any 			The account ID.
 * @entry:object 	An object with paramter changes for the account.
 */
export async function updateWebexAccount(id, entry) {
	if (!id)
		throw new TypeError('Must provide id with update');
	entry = accountEntry(entry);
	if (Object.keys(entry).length)
		await db.query('UPDATE oauth_accounts SET ? WHERE id=?;', [entry, id]);
	const [account] = await getAccounts({id});
	return account;
}

/*
 * Delete a Webex account.
 * If an API has been instatiated, delete that too.
 *
 * @id:any 	The Webex account ID.
 *
 * Returns 1.
 */
export async function deleteWebexAccount(id) {
	const {affectedRows} = await db.query('DELETE FROM oauth_accounts WHERE id=?', [id]);
	deleteWebexApi(id);
	return affectedRows;
}

/*
 * Handle Webex API error.
 *
 * @error:object 	The error object returned by the Axios instance.
 */
function webexApiError(error) {
	const {response} = error;
	if (response && response.status >= 400 && response.status < 500) {
		const {message, errors} = response.data;
		console.error(message, errors);
		if (response.status === 404)
			throw new NotFoundError('Webex meeting not found');
		const description = `${message}\n` + errors.join('\n');
		throw new Error(`Webex API error ${response.status}`, {description});
	}
	throw new Error(error);
}

async function getWebexTemplates(id) {
	const api = getWebexApi(id);
	return api.get(`/meetings/templates`, {params: {templateType: "meeting"}})
		.then(response => response.data.items)
		.catch(webexApiError);
}

/*
 * Get Webex meetings.
 *
 * @groupId?:any 		If present, List meetings from Webex accounts associated with this groupId.
 * @fromDate?:string 	If present, Webex meetings scheduled for on or after this date (ISO date string)
 * @toDate?:string 		If present, Webex meetings scheduled before this date (ISO date string)
 * @timezone?:string 	If present, return Webex meetings with schedule in timezone specified.
 * @ids?:array 			If present, return Webex meetings with IDs in list.
 *
 * Returns an array of Webex meeting objects.
 */
export async function getWebexMeetings({groupId, fromDate, toDate, timezone, ids}) {
	let webexMeetings = [];
	const accounts = await getWebexAccounts();
	if (!timezone)
		timezone = defaultTimezone;
	for (const account of accounts) {
		if (groupId && account.groups && !account.groups.includes(groupId))
			continue;
		const api = getWebexApi(account.id);

		const from = fromDate? DateTime.fromISO(fromDate, {zone: timezone}): DateTime.now().setZone(timezone);
		const to = toDate? DateTime.fromISO(toDate, {zone: timezone}): from.plus({years: 1});
		const params = {
			meetingType: 'scheduledMeeting',
			scheduledType: 'meeting',
			from: from.toISO(),
			to: to.toISO(),
			max: 100,
		}
		const response = await api.get('/meetings', {params, headers: {timezone}}).catch(webexApiError);
		//console.log(account.name, params, response.data.items.length)

		let meetings = response.data.items;
		meetings = meetings.map(m => ({...m, groupId, accountId: account.id, accountName: account.name}));
		webexMeetings = webexMeetings.concat(meetings);
	}
	// Looking for specific meetings
	if (ids)
		webexMeetings = webexMeetings.filter(m => ids.includes(m.id));
	webexMeetings = webexMeetings.sort((a, b) => DateTime.fromISO(a.start) - DateTime.fromISO(b.start));
	return webexMeetings;
}

export function getWebexMeeting(accountId, id) {
	const api = getWebexApi(accountId);
	return api.get(`/meetings/${id}`)
		.then(response => response.data)
		.catch(webexApiError);
}

/*
 * Validate the @meetings parameter for addWebexMeetings(), updateWebexMeeting() and deleteWebexMeetings()
 *
 * @meetings:array 	The meetings array to validate. Each entry is expected to be an object with a
 *					a parameter @accountId that is a valid Webex account ID.
 */
function validateMeetingsArray(meetings) {
	for (const m of meetings) {
		if (!isPlainObject(m))
			throw new TypeError('Badly formed meetings array, expected array of objects');
		getWebexApi(m.accountId);
	}
}

/*
 * Add a Webex meeting.
 *
 * @accountId:any 	Webex account ID.
 * @params:object 	Webex meeting object.
 *
 * Returns an object that is the Webex meeting as added.
 */
export function addWebexMeeting({accountId, ...params}) {
	const api = getWebexApi(accountId);
	return api.post('/meetings', params)
		.then(response => response.data)
		.catch(webexApiError);
}

/*
 * Add Webex meetings.
 *
 * @meetings:array 	An array of Webex meeting objects.
 *
 * Returns and array of Webex meeting objects as added.
 */
export async function addWebexMeetings(meetings) {
	validateMeetingsArray(meetings);
	return Promise.all(meetings.map(addWebexMeeting));
}

/*
 * Update a Webex meeting.
 *
 * @accountId:any 	Webex account ID
 * @id:any 			Webex meeting ID
 * @params:object 	Webex meeting parameters to change
 *
 * Returns an object that is the Webex meeting as updated.
 */
export function updateWebexMeeting({accountId, id, ...params}) {
	const api = getWebexApi(accountId);
	return api.put(`/meetings/${id}`, params)
		.then(response => ({accountId, ...response.data}))
		.catch(webexApiError);
}

/*
 * Update Webex meetings.
 *
 * @meetings:array 	An array of Webex meeting objects.
 *
 * Returns an array of Webex meeting objects.
 */
export async function updateWebexMeetings(meetings) {
	validateMeetingsArray(meetings);
	return Promise.all(meetings.map(updateWebexMeeting));
}

/*
 * Delete a Webex meeting.
 *
 * @accountId:any 	Webex account ID
 * @id: any 		Webex meeting ID
 *
 */
export function deleteWebexMeeting({accountId, id}) {
	const api = getWebexApi(accountId);
	return api.delete(`/meetings/${id}`)
		.then(response => response.data)
		.catch(webexApiError);
}

/*
 * Delete Webex meetings.
 *
 * @meetings:array 	An array of objects with shape {accountId, id}.
 *
 * Returns the number of meetings deleted.
 */
export async function deleteWebexMeetings(meetings) {
	validateMeetingsArray(meetings);
	await Promise.all(meetings.map(deleteWebexMeeting));
	return meetings.length;
}