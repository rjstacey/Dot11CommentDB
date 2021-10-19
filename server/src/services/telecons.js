import {getWebexMeetings, getWebexMeeting, addWebexMeeting, updateWebexMeeting, deleteWebexMeeting} from './webex';

const db = require('../util/database');
const { DateTime } = require("luxon");

/*
 * Return a complete list of telecons
 */
export function getTelecons(group) {
	return db.query('SELECT * FROM telecons');
	//return getWebexMeetings(group);
}

function teleconEntry(e, webexEntry, calEntry) {
	const entry = {
		group: e.group,
		subgroup: e.subgroup,
		start: e.start,
		end: e.end,
		timezone: e.timezone,
		hasMotions: e.hasMotions,
		webex_id: e.webex_id,
		webex_meeting_id: webexEntry? webexEntry.id: undefined,
		calendar_id: e.calendar_id,
		calendar_event_id: calEntry? calEntry.id: undefined,
	};

	for (const key of Object.keys(entry)) {
		if (entry[key] === undefined)
			delete entry[key]
	}

	return entry;
}

async function addTelecon(user, entry) {
	//entry = teleconEntry(entry);
	const params = {
		title: entry.group + ' ' + entry.subgroup,
		start: entry.start,
		end: entry.end,
		timezone: 'America/New_York',
		password: 'wireless',
		enabledJoinBeforeHost: true,
		enableConnectAudioBeforeHost: true,
		joinBeforeHostMinutes: 5,
		integrationTags: [entry.group],
	}
	console.log(params)
	const response = await addWebexMeeting(entry.webex_id, params);
	console.log(response);
	entry.webex_meeting_id = response.id;
	const {insertId} = await db.query('INSERT INTO telecons (??) VALUES (?);', [Object.keys(entry), Object.values(entry)]);
	return insertId;
}

export async function addTelecons(user, entries) {
	const ids = await Promise.all(entries.map(e => addTelecon(user, e)));
	const insertedTelecons = await db.query('SELECT * FROM telecons WHERE id IN (?);', [ids]);
	return insertedTelecons;
}

async function updateTelecon(user, id, changes) {
	const entry = teleconEntry(changes);
	if (Object.keys(entry).length) {
		await db.query('UPDATE telecons SET ? WHERE id=?;', [entry, id]);
	}
	return id;
}

export async function updateTelecons(user, updates) {
	// Validate request
	for (const u of updates) {
		if (typeof u !== 'object' || !u.id || typeof u.changes !== 'object')
			throw 'Expected array of objects with shape {id, changes}'
	}
	await Promise.all(updates.map(u => db.query('UPDATE telecons SET ? WHERE id=?;', [u.changes, u.id])));
	const asUpdated = await Promise.all(updates.map(async u => {
		const [changes] = await db.query('SELECT ?? FROM telecons WHERE id=?;', [Object.keys(u.changes), u.id]);
		return {id: u.id, changes};
	}));
	return asUpdated;
}

export async function deleteTelecons(user, ids) {
	const entries = await db.query('SELECT webex_id, webex_meeting_id FROM telecons WHERE id IN (?);', [ids]);
	for (const entry of entries) {
		if (entry.webex_id && entry.webex_meeting_id)
			await deleteWebexMeeting(entry.webex_id, entry.webex_meeting_id);
	}
	const {affectedRows} = await db.query('DELETE FROM telecons WHERE id IN (?);', [ids]);
	return affectedRows;
}
