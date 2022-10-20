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
	deleteImatBreakouts,
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
			'location, ' +
			'isCancelled, hasMotions, ' +
			'webexAccountId, webexMeetingId, ' +
			'calendarAccountId, calendarEventId, ' +
			'imatMeetingId, imatBreakoutId ' +
		'FROM telecons t';

	const {groupId, fromDate, toDate, ...rest} = constraints;
	//console.log(rest)

	let wheres = [];
	if (groupId) {
		sql += ' LEFT JOIN organization o ON o.id=t.organizationId';
		wheres.push(db.format('(o.parent_id=UUID_TO_BIN(?) OR o.id=UUID_TO_BIN(?))', [groupId, groupId]));
	}

	if (fromDate) {
		//wheres.push(db.format('end > ?', [new Date(fromDate)]));
		wheres.push(db.format('end > ?', fromDate));
	}

	if (toDate) {
		//wheres.push(db.format('start <= ?', [new Date(toDate)]));
		wheres.push(db.format('start <= ?', toDate));
	}

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
	console.log(sql);

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
	const ids = telecons.map(t => t.webexMeetingId);
	const webexMeetings = ids.length > 0?
		await getWebexMeetings({groupId: constraints.parent_id, ids}):
		[];
	return {telecons, webexMeetings};
}

function teleconEntrySetSql(e) {

	const opt = e.timezone? {zone: e.timezone}: {setZone: true};
	const entry = {
		organizationId: e.organizationId,
		summary: e.summary,
		start: e.start? DateTime.fromISO(e.start, opt).toJSDate(): undefined,
		end: e.end? DateTime.fromISO(e.end, opt).toJSDate(): undefined,
		timezone: e.timezone,
		location: e.location,
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

// Format Webex meeting number (e.g., 1234 567 8901)
const formatMeetingNumber = (n) => n.substr(0, 4) + ' ' + n.substr(4, 3) + ' ' + n.substr(7);

export async function webexMeetingImatLocation(webexAccountId, webexMeeting) {
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

function teleconCalendarDescription(entry) {

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
	let location = entry.location || '',
	    description = '';
	if (entry.webexMeeting) {
		description = teleconCalendarDescription(entry);
		if (!location)
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
		if (entry.webexMeetingId === '$add') {
			entry.webexMeeting = await addWebexMeeting(entry.webexAccountId, webexMeeting);
			entry.webexMeetingId = entry.webexMeeting.id;
		}
		else {
			entry.webexMeeting = await updateWebexMeeting(entry.webexAccountId, entry.webexMeetingId, webexMeeting);
		}
	}

	/* If meetingId is given then add a breakout for this telecon */
	if (entry.imatMeetingId) {
		if (entry.imatBreakoutId === '$add') {
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

	const sql = 'INSERT INTO telecons SET ' + teleconEntrySetSql(entry);
	const {insertId} = await db.query(sql);
	return insertId;
}

export async function addTelecons(user, entries) {

	if (!user.ieeeClient)
		throw new AuthError('Not logged in');

	const ids = await Promise.all(entries.map(e => addTelecon(user, e)));

	return getTelecons({id: ids});
}

export async function updateTelecon(user, id, changes) {

	let {webexMeeting: webexMeetingChanges, ...teleconChanges} = changes;
	let [telecon] = await selectTelecons({id});

	if (!telecon)
		throw new Error(`Telecon entry ${id} does not exist`);

	/* Make Webex changes.
	 * If a Webex meeting was previously created (current entry has webexAccountId and webexMeetingId):
	 *   Remove existing Webex meeting if webexMeetingId is changed to null.
	 *   Remove existing Webex meeting and add a new webex meeting if webexMeetingId is changed to '$add'.
	 *   Otherwise, update the existing meeting
	 * If a Webex meeting has not yet been created (current entry is missing webexAccountId and/or webexMeetingId):
	 *   Add Webex meeting if webexMeetingId is '$add'
	 */
	let webexMeeting = teleconToWebexMeeting({...telecon, ...teleconChanges});
	webexMeeting = {...webexMeeting, ...webexMeetingChanges};
	const webexAccountId = teleconChanges.webexAccountId || telecon.webexAccountId;
	if (telecon.webexAccountId && telecon.webexMeetingId) {
		// Webex meeting previously created
		if (('webexAccountId' in teleconChanges && teleconChanges.webexAccountId !== telecon.webexAccountId) ||
			('webexMeetingId' in teleconChanges && teleconChanges.webexMeetingId !== telecon.webexMeetingId))
		{
			// Delete the webex meeting if the webex account or webex meeting ID changes
			try {
				await deleteWebexMeeting(telecon.webexAccountId, telecon.webexMeetingId);
			}
			catch (error) {
				// Ignore "meeting does not" exist error (probably delete through other means)
				if (!(error instanceof NotFoundError))	// Webex meeting does not exist
					throw error;
			}
			teleconChanges.webexMeetingId = null;
			webexMeeting = null;
			if (webexAccountId && teleconChanges.webexMeetingId === '$add') {
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
				webexMeeting = await updateWebexMeeting(telecon.webexAccountId, telecon.webexMeetingId, webexMeeting);
			}
			catch (error) {
				if (error instanceof NotFoundError)	// Webex meeting does not exist
					teleconChanges.webexMeetingId = null;
				else
					throw error;
			}
		}
		teleconChanges.webexMeeting = webexMeeting;
	}
	else {
		// Webex meeting not created yet
		if (webexAccountId && teleconChanges.webexMeetingId === '$add') {
			// Add new webex meeting
			webexMeeting = await addWebexMeeting(telecon.webexAccountId, webexMeeting);
			teleconChanges.webexMeeting = webexMeeting;
			teleconChanges.webexMeetingId = webexMeeting.id;
		}
	}

	/* Make IMAT breakout changes
	 * If IMAT breakout was previously created (current entry has imatMeetingId and imatBreakoutId):
	 *   If the imatMeetingId or imatBreakoutId is changed:
	 *     Remove existing IMAT breakout if imatBreakoutId is set to null.
	 *     Remove existing IMAT breakout and add a new IMAT breakout if imatBreakoutId === '$add'.
	 *     Remove existing IMAT breakout and update specified IMAT breakout if imatBreakoutId is not null and not '$add'
	 *       (the user is linking a telecon entry to an existing IMAT breakout entry)
	 *   If the imatMeetingId and imatBreakoutId remain unchanged:
	 *     Update existing IMAT breakout
	 * If IMAT breakout has not yet been created (current entry is missing imatMeetingId and/or imatBreakoutId):
	 *   Add IMAT breakout if imatBreakoutId is '$add'
	 *   Update specified IMAT breakout if imatBreakoutId is not '$add'
	 *      (the user is linking a telecon entry to an existing IMAT breakout entry)
	 */
	try {
		const imatMeetingId = telecon.imatMeetingId || teleconChanges.imatMeetingId;
		if (telecon.imatMeetingId && telecon.imatBreakoutId) {
			// IMAT breakout previously created
			if (('imatMeetingId' in teleconChanges && teleconChanges.imatMeetingId !== telecon.imatMeetingId) ||
				('imatBreakoutId' in teleconChanges && teleconChanges.imatBreakoutId !== telecon.imatBreakoutId))
			{
				// Delete existing breakout if the breakout meeting or breakout ID changes
				try {
					await deleteImatBreakouts(user, telecon.imatMeetingId, [telecon.imatBreakoutId]);
				}
				catch (error) {
					if (!(error instanceof NotFoundError))
						throw error;
				}
				if (teleconChanges.imatBreakoutId === '$add') {
					// Different session
					const breakout = await addImatBreakoutFromTelecon(user, imatMeetingId, {...telecon, ...teleconChanges});
					teleconChanges.imatBreakoutId = breakout.id;
				}
				else if (teleconChanges.imatBreakoutId) {
					// User is linking telecon to an existing IMAT breakout
					console.log('update breakout')
					await updateImatBreakoutFromTelecon(user, imatMeetingId, teleconChanges.imatBreakoutId, {...telecon, ...teleconChanges});
				}
			}
			else {
				// Update previously created breakout
				console.log('update breakout')
				try {
					await updateImatBreakoutFromTelecon(user, telecon.imatMeetingId, telecon.imatBreakoutId, {...telecon, ...teleconChanges});
				}
				catch (error) {
					// If the IMAT breakout no longer exists
					if (error instanceof NotFoundError)
						teleconChanges.imatBreakoutId = null;
					else
						throw error;
				}
			}
		}
		else {
			// IMAT breakout not prevoiusly created
			if (imatMeetingId) {
				if (teleconChanges.imatBreakoutId === '$add') {
					console.log('add breakout')
					const breakout = await addImatBreakoutFromTelecon(user, imatMeetingId, {...telecon, ...teleconChanges});
					teleconChanges.imatBreakoutId = breakout.id;
				}
				else if (teleconChanges.imatBreakoutId) {
					console.log('update breakout')
					await updateImatBreakoutFromTelecon(user, imatMeetingId, teleconChanges.imatBreakoutId, {...telecon, ...teleconChanges});
				}
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
			if ('calendarAccountId' in teleconChanges && teleconChanges.calendarAccountId !== telecon.calendarAccountId) {
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
			const calendarAccountId = 'calendarAccountId' in teleconChanges?
				teleconChanges.calendarAccountId:
				telecon.calendarAccountId;
			if (calendarAccountId) {
				calendarEvent = await addCalendarEvent(calendarAccountId, calendarEvent);
				teleconChanges.calendarEventId = calendarEvent.id;
			}
		}
	}
	catch (error) {
		console.log('Unable to update clendar');
		console.log(error)
	}

	const setSql = teleconEntrySetSql(teleconChanges);
	if (setSql)
		await db.query('UPDATE telecons SET ' + setSql + ' WHERE id=?;', [id]);

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
				if (error instanceof NotFoundError)	// Webex meeting does not exist
					return;
				throw error;
			}
		}
		if (entry.imatMeetingId && entry.imatBreakoutId) {
			try {
				await deleteImatBreakouts(user, entry.imatMeetingId, [entry.imatBreakoutId]);
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
