import { DateTime } from 'luxon';

import {
	getWebexMeetings,
	getWebexMeeting,
	addWebexMeeting,
	updateWebexMeeting,
	deleteWebexMeeting
} from './webex';

import {
	getCalendarEvent,
	addCalendarEvent,
	updateCalendarEvent,
	deleteCalendarEvent
} from './calendar';

const db = require('../util/database');

async function selectTelecons(constraints) {
	let sql = 'SELECT * FROM telecons';
	if (constraints)
		sql += ' WHERE ' + Object.entries(constraints).map(([key, value]) => db.format(Array.isArray(value)? '?? IN (?)': '??=?', [key, value])).join(' AND ');
	console.log(sql)
	const telecons = await db.query(sql);
	for (const entry of telecons) {
		entry.start = DateTime.fromJSDate(entry.start, {zone: entry.timezone}).toISO();
		entry.end = DateTime.fromJSDate(entry.end, {zone: entry.timezone}).toISO();
	}
	return telecons;
}

/*
 * Return a complete list of telecons
 */
export async function getTelecons(constraints) {
	const telecons = await selectTelecons(constraints);
	let webexMeetings = [], calendarEvents = [];
	for (const telecon of telecons) {
		if (telecon.webex_id && telecon.webex_meeting_id) {
			telecon.webexMeeting = 
				getWebexMeeting(telecon.webex_id, telecon.webex_meeting_id)
				.catch(error => {
					console.warn(`Can't get webex meeting id=${telecon.webex_meeting_id}:`, error.toString())
				});
		}
		if (telecon.calendar_id && telecon.calendar_event_id) {
			telecon.calendarEvent = 
				getCalendarEvent(telecon.calendar_id, telecon.calendar_event_id)
				.catch(error => {
					console.warn(`Can't get calendar event id=${telecon.calendar_event_id}:`, error.toString())
				});
		}
	}
	for (const telecon of telecons) {
		telecon.webexMeeting = await telecon.webexMeeting;
		telecon.calendarEvent = await telecon.calendarEvent;
	}
	return telecons;
}

function teleconEntry(e) {
	const opt = e.timezone? {zone: e.timezone}: {setZone: true};
	const entry = {
		group: e.group,
		subgroup: e.subgroup,
		start: e.start? DateTime.fromISO(e.start, opt).toJSDate(): undefined,
		end: e.end? DateTime.fromISO(e.end, opt).toJSDate(): undefined,
		timezone: e.timezone,
		hasMotions: e.hasMotions,
		webex_id: e.webex_id,
		webex_meeting_id: e.webex_meeting_id,
		calendar_id: e.calendar_id,
		calendar_event_id: e.calendar_event_id,
	};

	for (const key of Object.keys(entry)) {
		if (entry[key] === undefined)
			delete entry[key];
	}

	return entry;
}

const title = (entry) => entry.group + ' ' + entry.subgroup + (entry.hasMotions? '*': '');

function teleconToWebexMeeting(entry) {
	const webexMeeting = entry.webexMeeting || {};
	const timezone = entry.timezone || 'America/New_York';
	return {
		password: 'wireless',
		enabledAutoRecordMeeting: false,
		...webexMeeting,
		title: title(entry),
		start: entry.start,
		end: entry.end,
		timezone,
		integrationTags: [entry.group],
	}
}

function teleconToCalendarEvent(entry) {
	return {
		summary: title(entry),
		description: 'Fred',
		start: {
			dateTime: entry.start,
			timeZone: entry.timezone
		},
		end: {
			dateTime: entry.end,
			timeZone: entry.timezone
		},
	}
}

async function addTelecon(entry) {

	let response, params;
	if (entry.webex_id) {
		params = teleconToWebexMeeting(entry);
		console.log(params)
		response = await addWebexMeeting(entry.webex_id, params);
		console.log(response);
		entry.webex_meeting_id = response.id;
	}

	if (entry.calendar_id) {
		params = teleconToCalendarEvent(entry);
		console.log(params)
		response = await addCalendarEvent(entry.calendar_id, params);
		console.log(response)
		entry.calendar_event_id = response.id;
	}
	entry = teleconEntry(entry);
	console.log(db.format('INSERT INTO telecons (??) VALUES (?);', [Object.keys(entry), Object.values(entry)]));

	const {insertId} = await db.query('INSERT INTO telecons (??) VALUES (?);', [Object.keys(entry), Object.values(entry)]);
	return insertId;
}

export async function addTelecons(entries) {
	const ids = await Promise.all(entries.map(e => addTelecon(e)));
	const insertedTelecons = await db.query('SELECT * FROM telecons WHERE id IN (?);', [ids]);
	return insertedTelecons;
}

async function updateTelecon(id, changes) {

	let {webexMeeting: webexMeetingChanges, calendarEvent: calendarEventChanges, ...teleconChanges} = changes;
	let [telecon] = await selectTelecons({id});

	if (!telecon)
		throw new Error(`Telecon entry ${id} does not exist`);

	/* Make Webex changes */
	let webexMeeting = {};
	if (teleconChanges.hasOwnProperty('webex_id') && !teleconChanges.webex_id && telecon.webex_id) {
		// delete current and don't replace
		if (telecon.webex_meeting_id)
			await deleteWebexMeeting(telecon.webex_id, telecon.webex_meeting_id);
		teleconChanges.webex_meeting_id = null;
	}
	else {
		webexMeeting = teleconToWebexMeeting({...telecon, ...teleconChanges});
		if (webexMeetingChanges)
			webexMeeting = {...webexMeeting, ...webexMeetingChanges};

		if ((teleconChanges.hasOwnProperty('webex_id') && telecon.webex_id && teleconChanges.webex_id === telecon.webex_id) ||
			 (!teleconChanges.hasOwnProperty('webex_id') && telecon.webex_id)) {
			if (telecon.webex_meeting_id) {
				// update only
				console.log('update webex', webexMeeting)
				try {
					webexMeeting = await updateWebexMeeting(telecon.webex_id, telecon.webex_meeting_id, webexMeeting);
				}
				catch (error) {
					if (error.response && error.response.status === 404)
						webexMeeting = await addWebexMeeting(telecon.webex_id, webexMeeting);
				}
			}
			else {
				// add only
				console.log('add webex', webexMeeting)
				webexMeeting = await addWebexMeeting(telecon.webex_id, webexMeeting);
			}
		}
		else if (teleconChanges.hasOwnProperty('webex_id') && teleconChanges.webex_id && !telecon.webex_id) {
			// add only
			webexMeeting = await addWebexMeeting(teleconChanges.webex_id, webexMeeting);
		}
		else if (teleconChanges.hasOwnProperty('webex_id') && teleconChanges.webex_id && telecon.webex_id && teleconChanges.webex_id !== telecon.webex_id) {
			// get current
			let webexMeetingCurrent = await getWebexMeeting(telecon.webex_id, telecon.webex_meeting_id);
			delete webexMeetingCurrent.id;
			delete webexMeetingCurrent.meetingNumber;
			delete webexMeetingCurrent.state;
			// delete current
			await deleteWebexMeeting(telecon.webex_id, telecon.webex_meeting_id);
			// merge changes
			webexMeeting = {...webexMeetingCurrent, ...webexMeeting};
			// add new
			webexMeeting = await addWebexMeeting(webex_id, webexMeeting);
		}
		teleconChanges.webex_meeting_id = webexMeeting.id;
	}

	/* Make calendar changes */
	let calendarEvent = {};
	if (teleconChanges.hasOwnProperty('calendar_id') && !teleconChanges.calendar_id && telecon.calendar_id) {
		// delete current and don't replace
		await deleteCalendarEvent(telecon.calendar_id, telecon.calendar_event_id);
		teleconChanges.calendar_event_id = null;
	}
	else {
		calendarEvent = teleconToCalendarEvent({...telecon, ...teleconChanges});
		if (calendarEventChanges)
			calendarEvent = {...calendarEvent, calendarEventChanges};

		if ((teleconChanges.hasOwnProperty('calendar_id') && telecon.calendar_id && teleconChanges.calendar_id === telecon.calendar_id) ||
			(!teleconChanges.hasOwnProperty('calendar_id') && telecon.calendar_id)) {
			if (telecon.calendar_event_id) {
				// If somebody deletes the event it still exists with status 'cancelled'. So set the status to 'confirmed'.
				calendarEvent.status = 'confirmed';
				calendarEvent = await updateCalendarEvent(telecon.calendar_id, telecon.calendar_event_id, calendarEvent);
				console.log(calendarEvent)
				//if (calendarEvent.status === 'cancelled')
				//	calendarEvent = await addCalendarEvent(telecon.calendar_id, calendarEvent);
			}
		}
		else if (teleconChanges.hasOwnProperty('calendar_id') && teleconChanges.calendar_id && !telecon.calendar_id) {
			// add only
			calendarEvent = await addCalendarEvent(teleconChanges.calendar_id, calendarEvent);
		}
		else if (teleconChanges.hasOwnProperty('calendar_id') && teleconChanges.calendar_id && telecon.calendar_id && teleconChanges.calendar_id !== telecon.calendar_id) {
			// delete current
			await deleteWebexMeeting(telecon.calendar_id, telecon.calendar_event_id);
			// add new
			calendarEvent = await addCalendarEvent(teleconChanges.calendar_id, calendarEvent);
		}
		teleconChanges.calendar_event_id = calendarEvent.id;
	}

	if (Object.keys(teleconChanges).length) {
		await db.query('UPDATE telecons SET ? WHERE id=?;', [teleconChanges, id]);
	}
	return id;
}

export async function updateTelecons(updates) {
	// Validate request
	if (updates.length === 0)
		return [];
	for (const u of updates) {
		if (typeof u !== 'object' || !u.id || typeof u.changes !== 'object')
			throw new TypeError('Expected array of objects with shape {id, changes}');
	}
	const ids = await Promise.all(updates.map(u => updateTelecon(u.id, u.changes)));
	return await getTelecons({id: ids});
}

export async function deleteTelecons(ids) {
	const entries = await db.query('SELECT webex_id, webex_meeting_id, calendar_id, calendar_event_id FROM telecons WHERE id IN (?);', [ids]);
	for (const entry of entries) {
		if (entry.webex_id && entry.webex_meeting_id)
			await deleteWebexMeeting(entry.webex_id, entry.webex_meeting_id);
		if (entry.calendar_id && entry.calendar_event_id)
			await deleteCalendarEvent(entry.calendar_id, entry.calendar_event_id);
	}
	const {affectedRows} = await db.query('DELETE FROM telecons WHERE id IN (?);', [ids]);
	return affectedRows;
}

function teleconWebexMeetingDiff(telecon, webexMeeting) {
	const entry = teleconToWebexMeeting(telecon);
	const changes = {};
	changes.title = entry.title;
	changes.start = entry.start;
	changes.end = entry.end;
	changes.password = entry.password;
	changes.enabledAutoRecordMeeting = false;
	return changes;
}

async function syncTeleconWithWebex(telecon) {
	if (!telecon.webex_id)
		return telecon;
	const entry = {};
	const webexMeetingEntry = teleconToWebexMeeting(telecon);
	if (!telecon.webex_meeting_id) {
		telecon.webexMeeting = await addWebexMeeting(telecon.webex_id, webexMeetingEntry);
		entry.webex_meeting_id = telecon.webexMeeting.id;
	}
	else {
		let webexMeeting = await getWebexMeeting(telecon.webex_id, telecon.webex_meeting_id);
		const changes = teleconWebexMeetingDiff(telecon, webexMeeting);
		telecon.webexMeeting = await updateWebexMeeting(telecon.webex_id, telecon.webex_meeting_id, changes);
		entry.webex_meeting_id = telecon.webexMeeting.id;
	}
	await db.query('UPDATE telecons SET ? WHERE id=?;', [entry, telecon.id]);
	return {...telecon, ...entry};
}

export async function syncTeleconsWithWebex(ids) {
	let telecons = await selectTelecons({id: ids}); //db.query(getTeleconsSql({id: ids}));
	telecons = await Promise.all(telecons.map(telecon => syncTeleconWithWebex(telecon)));
	return telecons;
}

function teleconCalendarEventDiff(telecon, calendarEvent) {
	const entry = teleconToCalendarEvent(telecon);
	const changes = {};
	if (calendarEvent.summary !== entry.summary)
		changes.summary = entry.summary;
	if (calendarEvent.start.dateTime.toString() !== entry.start.dateTime.toString() ||
		calendarEvent.start.timeZone !== entry.start.timeZone) {
		changes.start = entry.start;
	}
	if (calendarEvent.end.dateTime.toString() !== entry.end.dateTime.toString() ||
		calendarEvent.end.timeZone !== entry.end.timeZone) {
		changes.end = entry.end;
		console.log(calendarEvent, entry)
	}
	return changes;
}

async function syncTeleconWithCalendar(telecon) {
	if (!telecon.calendar_id)
		return telecon;
	const entry = {};
	const calendarEventEntry = teleconToCalendarEvent(telecon);
	if (!telecon.calendar_event_id) {
		telecon.calendarEvent = await addCalendarEvent(telecon.calendar_id, calendarEventEntry);
		entry.calendar_event_id = telecon.calendarEvent.id;
	}
	else {
		let calendarEvent = await getCalendarEvent(telecon.calendar_id, telecon.calendar_event_id);
		const changes = teleconCalendarEventDiff(telecon, calendarEvent);
		telecon.calendarEvent = await updateCalendarEvent(telecon.calendar_id, telecon.calendar_event_id, changes);
		entry.calendar_event_id = telecon.calendarEvent.id;
	}
	await db.query('UPDATE telecons SET ? WHERE id=?;', [entry, telecon.id]);
	return {...telecon, ...entry};
}

export async function syncTeleconsWithCalendar(ids) {
	let telecons = await selectTelecons({id: ids}); //db.query(getTeleconsSql({id: ids}));
	telecons = await Promise.all(telecons.map(telecon => syncTeleconWithCalendar(telecon)));
	return telecons;
}