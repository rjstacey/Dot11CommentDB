import { DateTime } from 'luxon';
import {parse as uuidToBin} from 'uuid';

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

const db = require('../utils/database');

async function selectTelecons(constraints) {

	let sql =
		'SELECT ' + 
			't.id as id, ' +
			'BIN_TO_UUID(group_id) AS group_id,' +
			'summary, start, end, timezone, ' +
			'hasMotions, ' +
			'webexAccountId, webexMeetingId, ' +
			'calendarAccountId, calendarEventId, ' +
			'imatMeetingId, imatBreakoutId ' +
		'FROM telecons t';

	const {parent_id, ...rest} = constraints;
	console.log(rest)
	if (parent_id) {
		sql += db.format(' LEFT JOIN `groups` g ON g.id=t.group_id WHERE g.parent_id=UUID_TO_BIN(?)', [parent_id]);
		if (Object.entries(rest).length)
			sql += ', '
	}
	else {
		if (Object.entries(rest).length)
			sql += ' WHERE '
	}

	if (Object.entries(rest).length) {
		sql += Object.entries(rest).map(
			([key, value]) => 
				(key === 'group_id')?
					db.format(Array.isArray(value)? 'BIN_TO_UUID(??) IN (?)': '??=UUID_TO_BIN(?)', [key, value]):
					db.format(Array.isArray(value)? '?? IN (?)': '??=?', [key, value])
		).join(' AND ');
	}
	console.log(sql);

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
		if (telecon.webexAccountId && telecon.webexMeetingId) {
			telecon.webexMeeting = 
				getWebexMeeting(telecon.webexAccountId, telecon.webexMeetingId)
				.catch(error => {
					console.warn(`Can't get webex meeting id=${telecon.webexMeetingId}:`, error.toString())
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
		group_id: e.group_id,
		summary: e.summary,
		start: e.start? DateTime.fromISO(e.start, opt).toJSDate(): undefined,
		end: e.end? DateTime.fromISO(e.end, opt).toJSDate(): undefined,
		timezone: e.timezone,
		hasMotions: e.hasMotions,
		webexAccountId: e.webexAccountId,
		webexMeetingId: e.webexMeetingId,
		calendarAccountId: e.calendarAccountId,
		calendarEventId: e.calendarEventId,
		imatMeetingId: e.imatMeetingId,
		imatBreakoutId: e.imatBreakoutId,
	};

	for (const key of Object.keys(entry)) {
		if (entry[key] === undefined)
			delete entry[key];
	}

	const sets = [];
	for (const [key, value] of Object.entries(entry)) {
		let sql;
		if (key === 'group_id')
			sql = db.format('??=UUID_TO_BIN(?)', [key, value]);
		else
			sql = db.format('??=?', [key, value]);
		sets.push(sql);
	}

	return sets.join(', ');
}

function teleconToWebexMeeting(entry) {
	const webexMeeting = {
		password: 'wireless',
		enabledAutoRecordMeeting: false,
		...(entry.webexMeeting || {}),
		title: entry.summary,
		start: entry.start,
		end: entry.end,
		timezone: entry.timezone || 'America/New_York',
		integrationTags: [entry.group_id],
	};
	if (entry.webex_template_id)
		webexMeeting.templateId = entry.webex_template_id;
	return webexMeeting;
}

function alphToNum(word) {
	const alph_num_dict = {'a': '2', 'b': '2', 'c': '2',
					'd': '3', 'e': '3', 'f': '3',
					'g': '4', 'h': '4', 'i': '4',
					'j': '5', 'k': '5', 'l': '5',
					'm': '6', 'n': '6', 'o': '6',
					'p': '7', 'q': '7', 'r': '7', 's': '7',
					'u': '8', 'w': '9', 'v': '8',
					'w': '9', 'x': '9', 'y': '9', 'z': '9'};
	let s = ''
	for (let p of word.toLowerCase())
		s += alph_num_dict[p] || p;
	return s;
}

const formatMeetingNumber = (n) => n.substr(0, 4) + ' ' + n.substr(4, 3) + ' ' + n.substr(7);

const meetingDescriptionStyle = `
	<style>
		* {
			font-family: arial;
			font-size: 16px;
			color: #666666;
		}
		p {
			margin: 20px;
		}
		a {
			color: #049FD9; 
			text-decoration: none;
		}
		.intro {
			font-size: 18px;
		}
	</style>`;

function teleconWebexDescription(webexMeeting) {

	if (Object.keys(webexMeeting).length === 0 || !webexMeeting.hasOwnProperty('meetingNumber')) {
		return '';
	}

	const {
		meetingNumber,
		webLink,
		password,
		phoneAndVideoSystemPassword,
		sipAddress,
		siteUrl,
		dialInIpAddress
	} = webexMeeting;

	const siteName = siteUrl.replace('.webex.com', '');
	const lyncUrl = `${meetingNumber}.${siteName}@lync.webex.com`;

	const description = `
		${meetingDescriptionStyle}
		<p>
			Join the Webex meeting here:<br>
			<a href="${webLink}">${webLink}</a>
		</p>
		<p>
			Meeting number: ${formatMeetingNumber(meetingNumber || '')}<br>
			Meeting password: ${password} (${phoneAndVideoSystemPassword} from phones and video systems)
		</p>
		<p>
			Join from a video system or application<br>
			Dial <a href="sip:${sipAddress}">${sipAddress}</a><br>
			You can also dial ${dialInIpAddress} and enter your meeting number.
		</p>
		<p>
			Join using Microsoft Lync or Microsoft Skype for Business<br>
			Dial <a href="sip:${lyncUrl}">${lyncUrl}</a>
		</p>
		<p>
			Need help? Go to <a href="http://help.webex.com">http://help.webex.com</a>
		</p>`.replace(/\t|\n/g, '');	// strip tabs and newline (helps with google calendar description formating)

	return description;
}

function teleconToCalendarEvent(entry) {
	let location = '',
	    description = '';
	if (entry.webexMeeting) {
		description = teleconWebexDescription(entry.webexMeeting);
		location = entry.webexMeeting.webLink || '';
	}
	return {
		summary: entry.summary,
		location,
		description,
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

	/* If a webex account is given and the webexMeeting object exists then add a webex meeting */
	if (entry.webexAccountId && entry.webexMeeting) {
		const webexMeeting = await addWebexMeeting(entry.webexAccountId, teleconToWebexMeeting(entry));
		entry.webexMeetingId = webexMeeting.id;
		entry.webexMeeting = webexMeeting;
	}

	if (entry.calendar_id) {
		const calendarEvent = await addCalendarEvent(entry.calendar_id, teleconToCalendarEvent(entry));
		entry.calendar_event_id = calendarEvent.id;
	}

	const sql = 'INSERT INTO telecons SET ' + teleconEntry(entry);
	const {insertId} = await db.query(sql);
	return insertId;
}

export async function addTelecons(entries) {
	const ids = await Promise.all(entries.map(e => addTelecon(e)));
	return await getTelecons({id: ids});
}

async function updateTelecon(id, changes) {

	let {webexMeeting: webexMeetingChanges, calendarEvent: calendarEventChanges, ...teleconChanges} = changes;
	let [telecon] = await selectTelecons({id});

	if (!telecon)
		throw new Error(`Telecon entry ${id} does not exist`);

	/* Make Webex changes.
	 * Remove an existing webex meeting if the webexMeetingId is changed to null.
	 * Add a webex meeting if one does not exist and webexMeeting object is present.
	 * Remove an existing webex meeting and add new webex meeting if the webex account is changed and webexMeeting is present.
	 * Otherwise, update existing meeting. */
	let webexMeeting = teleconToWebexMeeting({...telecon, ...teleconChanges});
	webexMeeting = {...webexMeeting, ...webexMeetingChanges};
	if (telecon.webexAccountId && telecon.webexMeetingId) {
		// Webex meeting exists
		if ((teleconChanges.hasOwnProperty('webexAccountId') && teleconChanges.webexAccountId !== telecon.webexAccountId) ||
			(teleconChanges.hasOwnProperty('webexMeetingId') && !teleconChanges.webexMeetingId))
		{
			// Delete the webex meeting if the webex account changes or
			// the webexMeetingId is set to null.
			console.log('delete webex meeting', telecon.webexMeetingId);
			try {
				await deleteWebexMeeting(telecon.webexAccountId, telecon.webexMeetingId);
			}
			catch (error) {
				// Ignore "meeting does not" exist error (may already be deleted)
				if (!error.response || error.response.status !== 404)	// Webex meeting does not exist
					throw error;
			}
			teleconChanges.webexMeetingId = null;
			const webexAccountId = teleconChanges.webexAccountId || telecon.webexAccountId;
			if (webexAccountId && webexMeetingChanges) {
				// Add new webex meeting if the webexMeeting object is present
				console.log('add webex meeting');
				webexMeeting = await addWebexMeeting(telecon.webexAccountId, webexMeeting);
				teleconChanges.webexMeeting = webexMeeting;
				teleconChanges.webexMeetingId = webexMeeting.id;
			}
		}
		else {
			// Update existing webex meeting
			try {
				teleconChanges.webexMeeting = await updateWebexMeeting(telecon.webexAccountId, telecon.webexMeetingId, webexMeeting);
			}
			catch (error) {
				if (error.response && error.response.status === 404)	// Webex meeting does not exist
					teleconChanges.webexMeetingId = null;
				else
					throw error;
			}
		}
	}
	else {
		// Webex meeting does not exist
		const webexAccountId = teleconChanges.webexAccountId || telecon.webexAccountId;
		if (webexAccountId && webexMeetingChanges) {
			// Add new webex meeting
			webexMeeting = await addWebexMeeting(telecon.webexAccountId, webexMeeting);
			teleconChanges.webexMeeting = webexMeeting;
			teleconChanges.webexMeetingId = webexMeeting.id;
		}
	}

	/* Make calendar changes */
	let calendarEvent = teleconToCalendarEvent({...telecon, ...teleconChanges});
	if (telecon.calendar_id && telecon.calendar_event_id) {
		// Calendar event exists
		if (teleconChanges.hasOwnProperty('calendar_id') && teleconChanges.calendar_id !== telecon.calendar_id) {
			await deleteCalendarEvent(telecon.calendar_id, telecon.calendar_event_id);
			teleconChanges.calendar_event_id = null;
			if (teleconChanges.calendar_id) {
				calendarEvent = await addCalendarEvent(teleconChanges.calendar_id, calendarEvent);
				teleconChanges.calendar_event_id = calendarEvent.id;
			}
		}
		else {
			// If somebody deletes the event it still exists with status 'cancelled'. So set the status to 'confirmed'.
			calendarEvent.status = 'confirmed';
			calendarEvent = await updateCalendarEvent(telecon.calendar_id, telecon.calendar_event_id, calendarEvent);
		}
	}
	else {
		// Calendar event does not exist
		const calendar_id = teleconChanges.calendar_id || telecon.calendar_id;
		if (calendar_id) {
			calendarEvent = await addCalendarEvent(calendar_id, calendarEvent);
			teleconChanges.calendar_event_id = calendarEvent.id;
		}
	}

	const setSql = teleconEntry(teleconChanges);
	if (setSql)
		await db.query('UPDATE telecons SET ' + setSql + ' WHERE id=?;', [id]);
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
	const entries = await db.query('SELECT webexAccountId, webexMeetingId, calendar_id, calendar_event_id FROM telecons WHERE id IN (?);', [ids]);
	for (const entry of entries) {
		if (entry.webexAccountId && entry.webexMeetingId)
			await deleteWebexMeeting(entry.webexAccountId, entry.webexMeetingId);
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

async function addWebexMeetingToTelecon(id, webexMeeting) {
	return await updateTelecon(id, {webexMeetingId: null, webexMeeting});
}

export async function addWebexMeetingToTelecons(telecons) {
	// Validate request
	if (telecons.length === 0)
		return [];
	for (const t of telecons) {
		if (typeof t !== 'object' || !t.id || !t.webexMeeting)
			throw new TypeError('Expected array of objects with shape {id, webexMeeting}');
	}
	const ids = await Promise.all(telecons.map(t => addWebexMeetingToTelecon(t.id, t.webexMeeting)));
	return await getTelecons({id: ids});
}

async function removeWebexMeetingFromTelecon(id) {
	return await updateTelecon(id, {webexMeetingId: null});
}

export async function removeWebexMeetingFromTelecons(telecons) {
	// Validate request
	if (telecons.length === 0)
		return [];
	for (const t of telecons) {
		if (typeof t !== 'object' || !t.id)
			throw new TypeError('Expected array of objects with shape {id}');
	}
	const ids = await Promise.all(telecons.map(t => removeWebexMeetingFromTelecon(t.id)));
	return await getTelecons({id: ids});
}

async function syncTeleconWithWebex(telecon) {
	if (!telecon.webexAccountId)
		return telecon;
	const entry = {};
	const webexMeetingEntry = teleconToWebexMeeting(telecon);
	if (!telecon.webexMeetingId) {
		telecon.webexMeeting = await addWebexMeeting(telecon.webexAccountId, webexMeetingEntry);
		entry.webexMeetingId = telecon.webexMeeting.id;
	}
	else {
		let webexMeeting = await getWebexMeeting(telecon.webexAccountId, telecon.webexMeetingId);
		const changes = teleconWebexMeetingDiff(telecon, webexMeeting);
		telecon.webexMeeting = await updateWebexMeeting(telecon.webexAccountId, telecon.webexMeetingId, changes);
		entry.webexMeetingId = telecon.webexMeeting.id;
	}
	await db.query('UPDATE telecons SET ? WHERE id=?;', [entry, telecon.id]);
	return {...telecon, ...entry};
}

export async function syncTeleconsWithWebex(ids) {
	let telecons = await selectTelecons({id: ids});
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