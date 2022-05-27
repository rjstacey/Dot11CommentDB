const axios = require('axios');
const db = require('../util/database');
const Webex = require('webex');

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

// Webex account apis
const apis = {};

function createWebexApi(id, authParams) {
	// Create axios instance with appropriate defaults
	const api = axios.create({
		headers: {
			'Authorization': `Bearer ${authParams.access_token}`,
			'Accept': 'application/json'
		},
		baseURL: webexApiBaseUrl,
		refresh_token: authParams.refresh_token
	});

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
				await updateWebexAccountAuthParams(id, authParams);
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

function updateWebexAccountAuthParams(id, authParams) {
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
		account.auth_url = webexAuthUrl;
		account.auth_params = {
			client_id: process.env.WEBEX_CLIENT_ID,
			response_type: 'code',
			scope: webexAuthScope
		};
		try {
			account.templates = await getWebexTemplates(account.id);
		}
		catch (error) {
			console.log(error);
		}
	}

	return accounts;
}

export async function authWebexAccount(id, entry) {
	const params = {
		grant_type: 'authorization_code',
		client_id: process.env.WEBEX_CLIENT_ID,
		client_secret: process.env.WEBEX_CLIENT_SECRET,
		code: entry.code,
		redirect_uri: entry.redirect_uri
	};

	const response = await axios.post(webexTokenUrl, params);
	const authParams = response.data;

	await updateWebexAccountAuthParams(id, authParams);

	// Create an axios instance for this account
	createWebexApi(id, authParams);

	const [account] = await getAccounts({id});
	return account;
}


export async function getWebexAccounts() {
	return await getAccounts({type: "webex"});
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
	delete apis[id];
	return affectedRows;
}

async function getWebexTemplates(id) {
	const api = apis[id];
	if (!api)
		throw new Error(`Invalid account id=${id}`);
	let response = await api.get(`/meetings/templates`, {params: {templateType: "meeting"}});
	console.log(response.data)
	let templates = response.data.items;
	return templates;
}

export async function getWebexMeetings(group) {
	let allMeetings = [];
	for (const [webex_id, account] of Object.entries(accounts)) {
		if (account.groups && !accounts.groups.includes(group))
			continue;
		console.log('got', group)
		const response = await account.api.get(`/meetings`, {params: {integrationTag: group}});
		console.log(response)
		let meetings = response.data.items;
		meetings = meetings.map(m => ({...m, group, webex_id}));
		allMeetings = allMeetings.concat(meetings);
	}
	console.log(allMeetings);
	return allMeetings;
}

export async function getWebexMeeting(id, meeting_id) {
	const api = apis[id];
	if (!api)
		throw new Error(`Invalid account id=${id}`);
	let response = await api.get(`/meetings/${meeting_id}`)
	return response.data;
}

export async function addWebexMeeting(id, params) {
	const api = apis[id];
	if (!api)
		throw new Error(`Invalid account id=${id}`);
	const response = await api.post('/meetings', params);
	return response.data;
}

export async function updateWebexMeeting(id, meeting_id, params) {
	const api = apis[id];
	if (!api)
		throw new Error(`Invalid account id=${id}`);
	const response = await api.put(`/meetings/${meeting_id}`, params);
	return response.data;
}

export async function deleteWebexMeeting(id, meeting_id) {
	const api = apis[id];
	if (!api)
		throw new Error(`Invalid account id=${id}`);
	const response = await api.delete(`/meetings/${meeting_id}`);
	return response.data;
}