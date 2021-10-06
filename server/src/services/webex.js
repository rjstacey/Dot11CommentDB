const axios = require('axios');
const db = require('../util/database');

axios.defaults.baseURL = 'https://webexapis.com/v1';

// Webex account cache
const webex = {};

export async function init() {
	// Cache the active webex accounts and create an axios api for each
	const rows = await db.query('SELECT * FROM webex;');
	const now = new Date();
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
			webex[account.id] = {
				id: account.id,
				group: account.group,
				...account.authParams,
				api,
			};
		}
	}
}

export async function webexInitAccess(code, state) {
	const params = {
		grant_type: 'authorization_code',
		client_id: process.env.WEBEX_CLIENT_ID,
		client_secret: process.env.WEBEX_CLIENT_SECRET,
		code,
		redirect_uri: 'http://localhost:3000/telecons/webex/auth'
	};

	const {data} = await axios.post('/access_token', params);
	access_token = data.access_token;
	refresh_token = data.refresh_token;

	//console.log(access_token)

	await db.query('UPDATE webex SET authParams=?, lastAuth=NOW() WHERE id=?', [JSON.stringify(data), state]);

	// Create and axios api for this account
	const api = axios.create({
		headers: {
			'Authorization': `Bearer ${access_token}`,
			'Accept': 'application/json'
		}
	});

	// Cache the account details
	webex[account.id] = {
		...data,
		api,
	};

	const [account] = await db.query('SELECT * FROM webex WHERE id=?', [state]);
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
	const accounts = await db.query('SELECT * FROM webex;');
	/* Indicate whether or not the account is (still) active */
	const now = new Date();
	for (let account of accounts) {
		let {lastAuth, authParams} = account;
		account.isActive = false;
		if (lastAuth && authParams) {
			lastAuth = new Date(lastAuth);
			const expires = lastAuth.setSeconds(lastAuth.getSeconds() + authParams.expires_in);
			if (expires > now)
				account.isActive = true;
		}
	}
	return accounts;
}

function webexAccountEntry(s) {
	const entry = {
		group: s.group,
		shortName: s.shortName,
		template: s.template,
		authParams: s.authParams
	};

	for (const key of Object.keys(entry)) {
		if (entry[key] === undefined)
			delete entry[key];
	}

	return entry;
}

export async function addWebexAccount(entry) {
	entry = webexAccountEntry(entry);
	const {insertId} = await db.query('INSERT INTO webex (??) VALUES (?);', [Object.keys(entry), Object.values(entry)]);
	const [account] = await db.query('SELECT * FROM webex WHERE id=?;', [insertId]);
	return account;
}

export async function updateWebexAccount(entry) {
	const id = entry.id;
	if (!id)
		throw 'Must provide id with update';
	entry = webexAccountEntry(entry);
	if (Object.keys(entry).length)
		await db.query('UPDATE webex SET ? WHERE id=?;', [entry, id]);
	const [account] = await db.query('SELECT * FROM webex WHERE id=?;', [id]);
	return account;
}

export async function deleteWebexAccount(id) {
	const {affectedRows} = await db.query('DELETE FROM webex WHERE id=?', [id]);
	return affectedRows;
}

export async function getWebexMeetings(group) {
	let allMeetings = [];
	for (const [webex_id, account] of Object.entries(webex)) {
		if (account.group !== group)
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
	const account = webex[id];
	if (!account)
		throw `Invalid webex id=${id}`;
	return await account.api.get(`/meetings/${meeting_id}`);
}

export async function addWebexMeeting(id, params) {
	const account = webex[id];
	if (!account)
		throw `Invalid webex id=${id}`;
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

export async function updateWebexMeeting(id, meeting_id, params) {
	const account = webex[id];
	if (!account)
		throw `Invalid webex id=${id}`;
	return await account.api.put(`/meetings/${meeting_id}`, params);
}

export async function deleteWebexMeeting(id, meeting_id) {
	const account = webex[id];
	if (!account)
		throw `Invalid webex id=${id}`;
	return await account.api.delete(`/meetings/${meeting_id}`);
}