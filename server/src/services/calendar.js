const axios = require('axios');
const {google} = require('googleapis');
const db = require('../utils/database');

const calendarApiBaseUrl = 'https://www.googleapis.com/calendar/v3';
const calendarAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
const calendarTokenUrl = 'https://oauth2.googleapis.com/token';

const calendarAuthScope = 'https://www.googleapis.com/auth/calendar';	// string or array of strings

// Calendar account cache
const calendars = {};

async function createCalendar(id, authParams) {
	const oauth2Client = new google.auth.OAuth2(
		process.env.GOOGLE_CLIENT_ID,
		process.env.GOOGLE_CLIENT_SECRET,
		'http://localhost:3000/telecons/calendar/auth'
	);
	console.log('setCredentials: ', authParams);
	oauth2Client.setCredentials(authParams);
	oauth2Client.on('tokens', (authParams) => {
		// Listen for token updates and record the latest
		console.log('update received', authParams);
		db.query('UPDATE oauth_accounts SET authParams=JSON_MERGE_PATCH(authParams, ?), authDate=NOW() WHERE id=?', [JSON.stringify(authParams), id]);
	});
	const calendar = google.calendar({
		version: 'v3',
		auth: oauth2Client
	});
	calendars[id] = calendar;
	return calendar;
}

export async function init() {
	// Cache the active calendar accounts and create an api instance for each
	const accounts = await db.query('SELECT * FROM oauth_accounts WHERE type="calendar";');
	for (const account of accounts) {
		const {id, authParams} = account;
		if (authParams) {
			createCalendar(id, authParams);
		}
	}
}

async function getAccounts(constraints) {

	let sql = 'SELECT `id`, `name`, `type`, `groups`, `authDate` FROM oauth_accounts';
	if (constraints)
		sql += ' WHERE ' + Object.entries(constraints).map(([key, value]) => db.format(Array.isArray(value)? '?? IN (?)': '??=?', [key, value])).join(' AND ');
	const accounts = await db.query(sql);

	for (const account of accounts) {
		account.auth_url = calendarAuthUrl;
		account.auth_params = {
			client_id: process.env.GOOGLE_CLIENT_ID,
			response_type: 'code',
			access_type: 'offline',		// offline to get refresh_token
			scope: calendarAuthScope	// string or array of strings
		}
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
	createCalendar(id, authParams);

	const [account] = await getAccounts({id});
	return account;
}

export async function getCalendarAccounts(constraints) {
	const accounts = await getAccounts({type: "calendar", ...constraints});
	for (const account of accounts) {
		account.details = 
			getPrimaryCalendar(account.id)
			.catch(error => console.warn(`Can't get ${account.name} (id=${account.id}) details:`, error.toString()));
	}
	for (const account of accounts)
		account.details = await account.details;
	return accounts;
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
	const [account] = await getCalendarAccounts({id: insertId});
	return account;
}

export async function updateCalendarAccount(id, entry) {
	if (!id)
		throw 'Must provide id with update';
	entry = accountEntry(entry);
	if (Object.keys(entry).length)
		await db.query('UPDATE oauth_accounts SET ? WHERE id=?;', [entry, id]);
	const [account] = await getCalendarAccounts({id});
	return account;
}

export async function deleteCalendarAccount(id) {
	const {affectedRows} = await db.query('DELETE FROM oauth_accounts WHERE id=?', [id]);
	delete calendars[id];
	return affectedRows;
}

export async function getPrimaryCalendar(id) {
	const calendar = calendars[id];
	if (!calendar)
		throw `Invalid calendar account id=${id}`;
	console.log('getPrimaryCalendar', id)
	const response = await calendar.calendars.get({calendarId: 'primary'});
	return response.data;
}

function calendarApiError(data) {
	if (data) {
		const {error} = data;
		throw `calendar api error: code=${error.code} message=${error.message}`; 
	}
	throw 'unknown calendar api error';
}

export async function getCalendarEvent(id, eventId) {
	const calendar = calendars[id];
	if (!calendar)
		throw `Invalid calendar account id=${id}`;
	const response = await calendar.events.get({calendarId: 'primary', eventId});
	return response.data;
}

export async function addCalendarEvent(id, params) {
	const calendar = calendars[id];
	if (!calendar)
		throw `Invalid calendar account id=${id}`
	console.log('add event: ', params)
	const response = await calendar.events.insert({calendarId: 'primary', requestBody: params});
	return response.data;
}

export async function deleteCalendarEvent(id, eventId) {
	const calendar = calendars[id];
	if (!calendar)
		throw `Invalid calendar account id=${id}`
	console.log('delete event: ', eventId)
	const response = await calendar.events.delete({calendarId: 'primary', eventId});
	return response.data;
}

export async function updateCalendarEvent(id, eventId, changes) {
	const calendar = calendars[id];
	if (!calendar)
		throw `Invalid calendar account id=${id}`
	console.log('update event: ', changes)
	const response = await calendar.events.patch({calendarId: 'primary', eventId, requestBody: changes});
	return response.data;
}
