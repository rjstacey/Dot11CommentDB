const axios = require('axios');
const db = require('../util/database');

const webexApiBaseUrl = 'https://webexapis.com/v1';
const webexAuthUrl = 'https://webexapis.com/v1/authorize';
const webexTokenUrl = 'https://webexapis.com/v1/access_token';

const webexAuthScope =
			"spark:kms " + 
			"meeting:controls_write meeting:schedules_read meeting:participants_read meeting:controls_read " +
			"meeting:preferences_write meeting:preferences_read meeting:participants_write meeting:schedules_write";

axios.defaults.baseURL = webexApiBaseUrl;

// Webex account cache
const accounts = {};

export async function init() {
	// Cache the active webex accounts and create an axios api for each
	const rows = await db.query('SELECT * FROM oauth_accounts WHERE type="webex";');
	for (const account of rows) {
		const {authParams} = account;
		if (authParams) {
			// Create and axios api for this account
			const api = axios.create({
				headers: {
					'Authorization': `Bearer ${authParams.access_token}`,
					'Accept': 'application/json'
				}
			});
			// Cache the account details
			accounts[account.id] = {
				authParams,
				api,
			};
		}
	}
}

async function getAccounts(params) {
	let sql = 'SELECT `id`, `name`, `type`, `groups`, `authDate` FROM oauth_accounts';
	if (params)
		sql += ' WHERE ' + Object.entries(params).map(([key, value]) => db.format(' ??=?', [key, value])).join(' AND ');
	const accounts = await db.query(sql);
	for (const account of accounts) {
		account.client_id = process.env.WEBEX_CLIENT_ID;
		account.auth_url = webexAuthUrl;
		account.auth_scope = webexAuthScope;
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

	await db.query('UPDATE oauth_accounts SET authParams=?, authDate=NOW() WHERE id=?', [JSON.stringify(authParams), id]);

	// Create an axios instance for this account
	const api = axios.create({
		headers: {
			'Authorization': `Bearer ${authParams.access_token}`,
			'Accept': 'application/json'
		}
	});

	// Update the account cache
	accounts[id] = {
		authParams,
		api,
	};

	const [account] = await getAccounts({id});
	return account;
}

async function webexRefreshAccess() {
	const params = {
		grant_type: 'refresh_token',
		client_id: process.env.WEBEX_CLIENT_ID,
		client_secret: process.env.WEBEX_CLIENT_SECRET,
		refresh_token,
	};
	const {data} = await axios.post('/access_token', params);
	access_token = data.access_token;
	refresh_token = data.refresh_token;
	webexApi.headers['Authorization'] = `Bearer ${access_token}`;
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
	const [account] = await db.getAccounts({id});
	return account;
}

export async function deleteWebexAccount(id) {
	const {affectedRows} = await db.query('DELETE FROM oauth_accounts WHERE id=?', [id]);
	delete accounts[id];
	return affectedRows;
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

export async function getWebexMeeting(webex_id, meeting_id) {
	const account = accounts[webex_id];
	if (!account)
		throw `Invalid account id=${account_id}`;
	return await account.api.get(`/meetings/${meeting_id}`);
}

export async function addWebexMeeting(webex_id, params) {
	const account = accounts[webex_id];
	if (!account)
		throw `Invalid account id=${webex_id}`;
	try {
		const response = await account.api.post('/meetings', params);
		return response.data;
	}
	catch(error) {
		//console.log('Got error', error.response.data.errors)
		if (error.response && error.response.data && error.response.data.message)
			throw error.response.data.message;
		throw error;
	}
}

export async function updateWebexMeeting(webex_id, meeting_id, params) {
	const account = accounts[webex_id];
	if (!account)
		throw `Invalid account id=${webex_id}`;
	return await account.api.put(`/meetings/${meeting_id}`, params);
}

export async function deleteWebexMeeting(webex_id, meeting_id) {
	const account = accounts[webex_id];
	if (!account)
		throw `Invalid account id=${webex_id}`;
	return await account.api.delete(`/meetings/${meeting_id}`);
}