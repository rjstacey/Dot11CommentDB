import { DateTime } from 'luxon';
import { AuthError, NotFoundError } from '../utils';

const axios = require('axios');
const Webex = require('webex');
const db = require('../utils/database');

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

// Webex account apis
const apis = {};

const defaultTimezone = 'America/New_York';

function getWebexApi(id) {
	const api = apis[id];
	if (!api)
		throw new Error(`Invalid account id=${id}`);
	return api;
}

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
					client_id: process.env.WEBEX_CLIENT_ID,
					client_secret: process.env.WEBEX_CLIENT_SECRET,
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

function deleteWebexApi(id) {
	delete apis[id];
}

function updateAuthParams(id, authParams) {
	return db.query('UPDATE oauth_accounts SET authParams=?, authDate=NOW() WHERE id=?', [JSON.stringify(authParams), id]);
}

export async function init() {
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
				client_id: process.env.WEBEX_CLIENT_ID,
				response_type: 'code',
				scope: webexAuthScope,
				redirect_uri: webexAuthRedirectUri,
				state: id,
			});
}

export async function completeAuthWebexAccount(params) {
	const {state, code} = params;
	const id = parseInt(state);
	params = {
		grant_type: 'authorization_code',
		client_id: process.env.WEBEX_CLIENT_ID,
		client_secret: process.env.WEBEX_CLIENT_SECRET,
		code: code,
		redirect_uri: webexAuthRedirectUri
	};

	const response = await axios.post(webexTokenUrl, params);
	const authParams = response.data;

	await updateAuthParams(id, authParams);

	// Create an axios instance for this account
	createWebexApi(id, authParams);

//	const [account] = await getAccounts({id});
//	return account;
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

export async function addWebexAccount(entry) {
	entry = accountEntry(entry);
	entry.type = 'webex';
	const {insertId} = await db.query('INSERT INTO oauth_accounts (??) VALUES (?);', [Object.keys(entry), Object.values(entry)]);
	const [account] = await getAccounts({id: insertId});
	return account;
}

export async function updateWebexAccount(id, entry) {
	if (!id)
		throw 'Must provide id with update';
	entry = accountEntry(entry);
	if (Object.keys(entry).length)
		await db.query('UPDATE oauth_accounts SET ? WHERE id=?;', [entry, id]);
	const [account] = await getAccounts({id});
	return account;
}

export async function deleteWebexAccount(id) {
	const {affectedRows} = await db.query('DELETE FROM oauth_accounts WHERE id=?', [id]);
	deleteWebexApi(id);
	return affectedRows;
}

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
		meetings = meetings.map(m => ({...m, groupId, webexAccountId: account.id, webexAccountName: account.name}));
		webexMeetings = webexMeetings.concat(meetings);
	}
	// Looking for specific meetings
	if (ids)
		webexMeetings = webexMeetings.filter(m => ids.includes(m.id));
	webexMeetings = webexMeetings.sort((a, b) => DateTime.fromISO(a.start) - DateTime.fromISO(b.start));
	return webexMeetings;
}

export async function getWebexMeeting(id, meetingId) {
	const api = getWebexApi(id);
	return api.get(`/meetings/${meetingId}`)
		.then(response => response.data)
		.catch(webexApiError);
}

export async function addWebexMeeting(id, params) {
	const api = getWebexApi(id);
	return api.post('/meetings', params)
		.then(response => response.data)
		.catch(webexApiError);
}

export async function addWebexMeetings(meetings) {
	for (const m of meetings) {
		getWebexApi(m.accountId);
		if (typeof m.webexMeeting !== 'object')
			throw new Error('Missing webexMeeting');
	}
	return meetings.map(m => addWebexMeeting(m.accountId, m.webexMeeting));
}

export async function updateWebexMeeting(id, meetingId, params) {
	const api = getWebexApi(id);
	return api.put(`/meetings/${meetingId}`, params)
		.then(response => response.data)
		.catch(webexApiError);
}

export async function deleteWebexMeeting(id, meetingId) {
	const api = getWebexApi(id);
	return api.delete(`/meetings/${meetingId}`)
		.then(response => response.data)
		.catch(webexApiError);
}

export async function deleteWebexMeetings(meetings) {
	for (const m of meetings) {
		getWebexApi(m.accountId);
		if (!m.meetingId)
			throw new Error('Missing meetingId');
	}
	return meetings.map(m => deleteWebexMeeting(m.accountId, m.meetingId));
}