const axios = require('axios');
const db = require('../util/database');
const {google} = require('googleapis');

const calendarApiBaseUrl = '';
const calendarAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
const calendarTokenUrl = 'https://oauth2.googleapis.com/token';

const calendarAuthScope = "https://www.googleapis.com/auth/calendar";

// Calendar account cache
const accounts = {};

export async function init() {
	// Cache the active calendar accounts and create an axios api for each
	const rows = await db.query('SELECT * FROM oauth_accounts WHERE type="calendar";');
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
		account.client_id = process.env.GOOGLE_CLIENT_ID;
		account.auth_url = calendarAuthUrl;
		account.auth_scope = calendarAuthScope;
	}
	return accounts;
}

export async function authCalendarAccount(id, entry) {
	const params = {
		grant_type: 'authorization_code',
		client_id: process.env.GOOGLE_CLIENT_ID,
		client_secret: process.env.GOOGLE_CLIENT_SECRET,
		code: entry.code,
		redirect_uri: entry.redirect_uri
	};

	const response = await axios.post(calendarTokenUrl, params);
	const authParams = response.data;

	await db.query('UPDATE oauth_accounts SET authParams=?, authDate=NOW() WHERE id=?', [JSON.stringify(authParams), id]);

	// Create and axios api for this account
	const api = axios.create({
		headers: {
			'Authorization': `Bearer ${authParams.access_token}`,
			'Accept': 'application/json'
		}
	});

	// Cache the account details
	accounts[id] = {
		authParams,
		api,
	};

	const [account] = await getAccounts({id});
	return account;
}

export async function getCalendarAccounts() {
	return await getAccounts({type: "calendar"});
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

export async function addCalendarAccount(entry) {
	entry = accountEntry(entry);
	entry.type = 'calendar';
	const {insertId} = await db.query('INSERT INTO oauth_accounts (??) VALUES (?);', [Object.keys(entry), Object.values(entry)]);
	const [account] = await getAccounts({id: insertId});
	return account;
}

export async function updateCalendarAccount(id, entry) {
	if (!id)
		throw 'Must provide id with update';
	entry = accountEntry(entry);
	if (Object.keys(entry).length)
		await db.query('UPDATE oauth_accounts SET ? WHERE id=?;', [entry, id]);
	const [account] = await getAccounts({id});
	return account;
}

export async function deleteCalendarAccount(id) {
	const {affectedRows} = await db.query('DELETE FROM oauth_accounts WHERE id=?', [id]);
	delete accounts[id];
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
