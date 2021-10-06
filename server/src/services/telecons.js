import {getWebexMeetings, getWebexMeeting, addWebexMeeting, updateWebexMeeting, deleteWebexMeeting} from './webex';

const db = require('../util/database');
const moment = require('moment-timezone')


/*
 * Return a complete list of telecons
 */
export function getTelecons(group) {
	//return db.query('SELECT * FROM telecons');
	return getWebexMeetings(group);
}

function teleconEntry(s) {
	const entry = {
		Group: s.Group,
		Subgroup: s.Subgroup,
		Start: s.Start !== undefined? new Date(s.Start): undefined,
		Duration: s.Duration,
		Location: s.Location,
		HasMotions: s.HasMotions,
		webex_id: s.webex_id,
	};

	for (const key of Object.keys(entry)) {
		if (entry[key] === undefined)
			delete entry[key]
	}

	return entry;
}

async function addTelecon(user, entry) {
	entry = teleconEntry(entry);
	const end = new Date(entry.Start);
	end.setHours(end.getHours(), entry.Duration*60);
	const params = {
		title: entry.Group + ' ' + entry.Subgroup,
		start: moment(entry.Start).tz('America/New_York').format(),
		end: moment(end).tz('America/New_York').format(),
		timezone: 'America/New_York',
		password: 'wireless',
		enabledJoinBeforeHost: true,
		enableConnectAudioBeforeHost: true,
		joinBeforeHostMinutes: 5
	}
	console.log(params)
	const response = await addWebexMeeting(entry.webex_id, params);
	console.log(response);
	entry.webexMeetingID = response.id;
	const {insertId} = await db.query('INSERT INTO telecons (??) VALUES (?);', [Object.keys(entry), Object.values(entry)]);
	return insertId;
}

export async function addTelecons(user, telecons) {
	const ids = await Promise.all(telecons.map(e => addTelecon(user, e)));
	const insertedTelecons = await db.query('SELECT * FROM telecons WHERE id IN (?);', [ids]);
	return insertedTelecons;
}

async function updateTelecon(user, entry) {
	const id = entry.id;
	if (!id)
		throw 'Must provide id with update';
	entry = teleconEntry(entry);
	if (Object.keys(entry).length) {
		await db.query('UPDATE telecons SET ? WHERE id=?;', [entry, id]);
	}
	return id;
}

export async function updateTelecons(user, changes) {
	ids = await Promise.all(changes.map(c => updateTelecon(user, c)));
	const [updatedTelecons] = await db.query('SELECT * FROM telecons WHERE id IN (?);', [ids]);
	return updatedTelecons;
}

export async function deleteTelecons(user, ids) {
	const telecons = await db.query('SELECT webex_id, webexMeetingID FROM telecons WHERE id IN (?);', [ids]);
	for (const telecon of telecons) {
		if (telecon.webexMeetingID)
			await deleteWebexMeeting(telecon.webex_id, telecon.webexMeetingID);
	}
	const {affectedRows} = await db.query('DELETE FROM telecons WHERE id IN (?);', [ids]);
	return affectedRows;
}
