import { DateTime } from 'luxon';
import {parse as uuidToBin} from 'uuid';

import { AuthError, NotFoundError } from '../utils';

import {
	getWebexAccounts,
	getWebexMeetings,
	getWebexMeeting,
	addWebexMeeting,
	updateWebexMeeting,
	deleteWebexMeeting
} from './webex';

import {
	deleteImatBreakout,
	addImatBreakoutFromTelecon,
	updateImatBreakoutFromTelecon
} from './imat';

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
			'BIN_TO_UUID(organizationId) AS organizationId, ' +
			'summary, ' +
			//'DATE_FORMAT(start, "%Y-%m-%dT%TZ") AS start, ' +
			//'DATE_FORMAT(end, "%Y-%m-%dT%TZ") AS end, ' +
			'start, end, ' +
			'timezone, ' +
			'isCancelled, hasMotions, ' +
			'webexAccountId, webexMeetingId, ' +
			'calendarAccountId, calendarEventId, ' +
			'imatMeetingId, imatBreakoutId ' +
		'FROM telecons t';

	const {parent_id, fromDate, toDate, ...rest} = constraints;
	//console.log(rest)

	let wheres = [];
	if (parent_id) {
		sql += ' LEFT JOIN organization o ON o.id=t.organizationId';
		wheres.push(db.format('o.parent_id=UUID_TO_BIN(?)', [parent_id]));
	}

	if (fromDate)
		wheres.push(db.format('end > ?', [new Date(fromDate)]));

	if (toDate)
		wheres.push(db.format('start < ?', [new Date(toDate)]));

	if (Object.entries(rest).length) {
		wheres = wheres.concat(
			Object.entries(rest).map(
				([key, value]) => 
					(key === 'organizationId')?
						db.format(Array.isArray(value)? 'BIN_TO_UUID(??) IN (?)': '??=UUID_TO_BIN(?)', [key, value]):
						db.format(Array.isArray(value)? '?? IN (?)': '??=?', [key, value])
					)
		);
	}

	if (wheres.length)
		sql += ' WHERE ' + wheres.join(' AND ');
	//console.log(sql);

	const telecons = await db.query(sql);
	for (const entry of telecons) {
		entry.start = DateTime.fromJSDate(entry.start, {zone: entry.timezone}).toISO();
		entry.end = DateTime.fromJSDate(entry.end, {zone: entry.timezone}).toISO();
	}
	return telecons;
}

/*
 * Return a list of telecons
 */
export async function getTelecons(constraints) {
	const telecons = await selectTelecons(constraints);
	const webexMeetings = await getWebexMeetings({groupId: constraints.parent_id});
	return {telecons, webexMeetings};
}

function teleconEntry(e) {

	const opt = e.timezone? {zone: e.timezone}: {setZone: true};
	const entry = {
		organizationId: e.organizationId,
		summary: e.summary,
		start: e.start? DateTime.fromISO(e.start, opt).toJSDate(): undefined,
		end: e.end? DateTime.fromISO(e.end, opt).toJSDate(): undefined,
		timezone: e.timezone,
		isCancelled: e.isCancelled,
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
		if (key === 'organizationId')
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
		integrationTags: [entry.organizationId],
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

async function webexMeetingImatLocation(webexAccountId, webexMeeting) {
	let location = '';
	const [webexAccount] = await getWebexAccounts({id: webexAccountId});
	if (webexAccount)
		location = webexAccount.name + ': ';
	location += formatMeetingNumber(webexMeeting.meetingNumber);
	return location;
}

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

function teleconWebexDescription(entry) {

	const {webexMeeting} = entry;

	let description = meetingDescriptionStyle;

	if (entry.hasMotions)
		description += '<p>Agenda includes motions</p>';

	if (Object.keys(webexMeeting).length > 0 &&
		webexMeeting.hasOwnProperty('meetingNumber')) {

		const {
			meetingNumber,
			webLink,
			password,
			telephony,
		} = webexMeeting;

		let telephonyDescription = '';
		
		description += `
			<p>
				Meeting link:<br>
				<a href="${webLink}">${webLink}</a>
			</p>
			<p>
				Meeting number:<br>
				${formatMeetingNumber(meetingNumber || '')}
			</p>
			<p>
				Meeting password:<br>
				${password}
			</p>
		`;

		if (telephony && Array.isArray(telephony.callInNumbers)) {
			description += `
				<p>
					Join by phone:<br>
					${telephony.callInNumbers.map(c => c.callInNumber + ' ' + c.label).join('<br>')}
				</p>
			`;
		}

		description += '<p>Need help? Go to <a href="http://help.webex.com">http://help.webex.com</a></p>';
	}

	return description.replace(/\t|\n/g, '');	// strip tabs and newline (helps with google calendar formating)
}


function teleconToCalendarEvent(entry) {
	let location = '',
	    description = '';
	if (entry.webexMeeting) {
		description = teleconWebexDescription(entry);
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

async function addTelecon(user, entry) {

	/* If a webex account is given and the webexMeeting object exists then add a webex meeting */
	if (entry.webexAccountId && entry.webexMeeting) {
		let webexMeeting = teleconToWebexMeeting(entry);
		if (!entry.webexMeetingId) {
			entry.webexMeeting = await addWebexMeeting(entry.webexAccountId, webexMeeting);
			entry.webexMeetingId = entry.webexMeeting.id;
		}
		else {
			entry.webexMeeting = await updateWebexMeeting(entry.webexAccountId, entry.webexMeetingId, webexMeeting);
		}

	}

	/* If meetingId is given then add a breakout for this telecon */
	if (entry.imatMeetingId) {
		// 'Location' for IMAT breakout
		if (entry.webexAccountId && entry.webexMeeting)
			entry.location = await webexMeetingImatLocation(entry.webexAccountId, entry.webexMeeting);
		if (!entry.imatBreakoutId) {
			const breakout = await addImatBreakoutFromTelecon(user, entry.imatMeetingId, entry);
			entry.imatBreakoutId = breakout.id;
		}
		else {
			await updateImatBreakoutFromTelecon(user, entry.imatMeetingId, entry.imatBreakoutId, entry);
		}
	}

	/* If a calendar account is given, then add calendar event for this telecon */
	if (entry.calendarAccountId) {
		let calendarEvent = teleconToCalendarEvent(entry);
		if (!entry.calendarEventId) {
			calendarEvent = await addCalendarEvent(entry.calendarAccountId, calendarEvent);
			entry.calendarEventId = calendarEvent.id;
		}
		else {
			await updateCalendarEvent(entry.calendarAccountId, entry.calendarEventId, calendarEvent);
		}
	}

	const sql = 'INSERT INTO telecons SET ' + teleconEntry(entry);
	const {insertId} = await db.query(sql);
	return insertId;
}

export async function addTelecons(user, entries) {

	if (!user.ieeeClient)
		throw new AuthError('Not logged in');

	const ids = await Promise.all(entries.map(e => addTelecon(user, e)));
	return await getTelecons({id: ids});
}

export async function updateTelecon(user, id, changes) {

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

	/* Make IMAT breakout changes */
	try {
		if (telecon.imatMeetingId && telecon.imatBreakoutId) {
			// IMAT breakout exists
			if (teleconChanges.hasOwnProperty('imatMeetingId') && teleconChanges.imatMeetingId !== telecon.imatMeetingId) {
				// Session changed
				await deleteImatBreakout(user, telecon.imatMeetingId, telecon.imatBreakoutId);
				teleconChanges.imatBreakoutId = null;
				const imatMeetingId = teleconChanges.imatMeetingId;
				if (imatMeetingId) {
					// Different session
					console.log('add breakout')
					const breakout = await addImatBreakoutFromTelecon(user, imatMeetingId, {...telecon, ...teleconChanges});
					teleconChanges.imatBreakoutId = breakout.id;
				}
			}
			else {
				// Update existing breakout
				console.log('update breakout')
				await updateImatBreakoutFromTelecon(user, telecon.imatMeetingId, telecon.imatBreakoutId, {...telecon, ...teleconChanges});
			}
		}
		else {
			// IMAT breakout does not exist
			if (teleconChanges.imatMeetingId || (!teleconChanges.hasOwnProperty('imatMeetingId') && telecon.imatMeetingId)) {
				const imatMeetingId = teleconChanges.imatMeetingId || telecon.imatMeetingId;
				console.log('add breakout')
				const breakout = await addImatBreakoutFromTelecon(user, imatMeetingId, {...telecon, ...teleconChanges});
				teleconChanges.imatBreakoutId = breakout.id;
			}
		}
	}
	catch (error) {
		console.log('Unable to update imat', error);
	}

	/* Make calendar changes */
	let calendarEvent = teleconToCalendarEvent({...telecon, ...teleconChanges});
	try {
		if (telecon.calendarAccountId && telecon.calendarEventId) {
			// Calendar event exists
			if (teleconChanges.hasOwnProperty('calendar_id') && teleconChanges.calendarAccountId !== telecon.calendarAccountId) {
				await deleteCalendarEvent(telecon.calendarAccountId, telecon.calendarEventId);
				teleconChanges.calendarEventId = null;
				if (teleconChanges.calendarAccountId) {
					calendarEvent = await addCalendarEvent(teleconChanges.calendarAccountId, calendarEvent);
					teleconChanges.calendarEventId = calendarEvent.id;
				}
			}
			else {
				// If somebody deletes the event it still exists with status 'cancelled'. So set the status to 'confirmed'.
				calendarEvent.status = 'confirmed';
				calendarEvent = await updateCalendarEvent(telecon.calendarAccountId, telecon.calendarEventId, calendarEvent);
			}
		}
		else {
			// Calendar event does not exist
			const calendarAccountId = teleconChanges.calendarAccountId || telecon.calendarAccountId;
			if (calendarAccountId) {
				calendarEvent = await addCalendarEvent(calendarAccountId, calendarEvent);
				teleconChanges.calendarEventId = calendarEvent.id;
			}
		}
	}
	catch (error) {
		console.log('Unable to update clendar');
	}

	const setSql = teleconEntry(teleconChanges);
	if (setSql) {
		console.log(setSql, id)
		await db.query('UPDATE telecons SET ' + setSql + ' WHERE id=?;', [id]);
	}
	return id;
}

export async function updateTelecons(user, updates) {

	if (!user.ieeeClient)
		throw new AuthError('Not logged in');

	// Validate request
	if (updates.length === 0)
		return [];
	for (const u of updates) {
		if (typeof u !== 'object' || !u.id || typeof u.changes !== 'object')
			throw new TypeError('Expected array of objects with shape {id, changes}');
	}
	const ids = await Promise.all(updates.map(u => updateTelecon(user, u.id, u.changes)));
	return await getTelecons({id: ids});
}

export async function deleteTelecons(user, ids) {

	if (!user.ieeeClient)
		throw new AuthError('Not logged in');

	const entries = await db.query('SELECT webexAccountId, webexMeetingId, calendarAccountId, calendarEventId, imatMeetingId, imatBreakoutId FROM telecons WHERE id IN (?);', [ids]);
	for (const entry of entries) {
		if (entry.webexAccountId && entry.webexMeetingId) {
			try {
				await deleteWebexMeeting(entry.webexAccountId, entry.webexMeetingId);
			}
			catch (error) {
				if (error.response && error.response.status !== 404)
					throw error;
			}
		}
		if (entry.imatMeetingId && entry.imatBreakoutId) {
			try {
				await deleteImatBreakout(user, entry.imatMeetingId, entry.imatBreakoutId);
			}
			catch (error) {
				console.log(error);
			}
		}
		if (entry.calendarAccountId && entry.calendarEventId) {
			await deleteCalendarEvent(entry.calendarAccountId, entry.calendarEventId);
		}
	}
	const {affectedRows} = await db.query('DELETE FROM telecons WHERE id IN (?);', [ids]);
	return affectedRows;
}

/*
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
*/
