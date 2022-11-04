import { DateTime } from 'luxon';
import { parse as uuidToBin } from 'uuid';

import { isPlainObject, AuthError, NotFoundError } from '../utils';

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
	addImatBreakoutFromMeeting,
	updateImatBreakoutFromMeeting
} from './imat';

import {
	getCalendarEvent,
	addCalendarEvent,
	updateCalendarEvent,
	deleteCalendarEvent
} from './calendar';

const db = require('../utils/database');

/*
 * Get meetings.
 *
 * @constraints:object One or more constraints.
 *
 * Returns an array of meeting objects that meet the constraints.
 */
async function selectMeetings(constraints) {

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
		'FROM meetings t';

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
	//console.log(sql);

	const meetings = await db.query(sql);
	for (const entry of meetings) {
		entry.start = DateTime.fromJSDate(entry.start, {zone: entry.timezone}).toISO();
		entry.end = DateTime.fromJSDate(entry.end, {zone: entry.timezone}).toISO();
	}
	return meetings;
}

/*
 * Get a list of meetings and Webex meetings.
 *
 * @constraints?:object 	One or more constraints.
 *
 * Returns an object with shape {meetings, webexMeetings} where @meetings is array of meetings that meet the
 * constraints and @webexMeetings is an array of Webex meetings referenced by the meetings.
 */
export async function getMeetings(constraints) {
	const meetings = await selectMeetings(constraints);
	const ids = meetings.map(t => t.webexMeetingId);
	const webexMeetings = ids.length > 0?
		await getWebexMeetings({groupId: constraints.parent_id, ids}):
		[];
	return {meetings, webexMeetings};
}

/*
 * Convert a meeting change object to SET SQL for a table UPDATE or INSERT.
 *
 * @e:object 	The meeting change object.
 *
 * Returns an escaped SQL SET string, e.g., '`hasMotions`=1, `location`="Bar"'
 */
function meetingEntrySetSql(e) {

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

/*
 * Create a Webex meeting event for a meeting.
 *
 * @meeting:object 	The meeting object.
 *
 * Returns an object that is the Webex meeting event.
 */
function meetingToWebexMeeting(meeting) {
	const webexMeeting = {
		password: 'wireless',
		enabledAutoRecordMeeting: false,
		...(meeting.webexMeeting || {}),
		title: meeting.summary,
		start: meeting.start,
		end: meeting.end,
		timezone: meeting.timezone || 'America/New_York',
		integrationTags: [meeting.organizationId],
	};
	//console.log('to webex meeting', meeting, webexMeeting)
	return webexMeeting;
}

/*
 * Format Webex meeting number (e.g., 1234 567 8901)
 */
const formatMeetingNumber = (n) => n.substr(0, 4) + ' ' + n.substr(4, 3) + ' ' + n.substr(7);

/*
 * Create IMAT breakout location string for a webex meeting.
 *
 * @webexAccountId:any 	The Webex account ID.
 * @webexMeeting:object The Webex meeting object.
 *
 * Returns a string that is the IMAT breakout location.
 */
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


/*
 * Create a calendar event description for a meeting.
 *
 * @entry:object The meeting for which the calendar event description is being created.
 *
 * Returns a string that is the calendar event description.
 */
function meetingCalendarDescription(entry) {

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

/*
 * Create a calendar event for meeting.
 *
 * @meeting:object The meeting object for which the calendar event is being created.
 *
 * Returns the calendar event object.
 */
function meetingToCalendarEvent(entry) {
	let location = entry.location || '',
	    description = '';
	if (entry.webexMeeting) {
		description = meetingCalendarDescription(entry);
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

/*
 * Add a meeting, including adding webex, calendar and imat entries (if needed).
 *
 * @user:object 	The user executing the add
 * @entry:object	The meeting object to be added
 *
 * Returns the id of the meeting added.
 */
async function addMeeting(user, entry) {

	/* If a webex account is given and the webexMeeting object exists then add a webex meeting */
	if (entry.webexAccountId && entry.webexMeeting) {
		let webexMeeting = meetingToWebexMeeting(entry);
		if (entry.webexMeetingId === '$add') {
			entry.webexMeeting = await addWebexMeeting(entry.webexAccountId, webexMeeting);
			entry.webexMeetingId = entry.webexMeeting.id;
		}
		else {
			entry.webexMeeting = await updateWebexMeeting(entry.webexAccountId, entry.webexMeetingId, webexMeeting);
		}
	}

	/* If meetingId is given then add a breakout for this meeting */
	if (entry.imatMeetingId) {
		if (entry.imatBreakoutId === '$add') {
			const breakout = await addImatBreakoutFromMeeting(user, entry.imatMeetingId, entry);
			entry.imatBreakoutId = breakout.id;
		}
		else {
			await updateImatBreakoutFromMeeting(user, entry.imatMeetingId, entry.imatBreakoutId, entry);
		}
	}

	/* If a calendar account is given, then add calendar event for this meeting */
	if (entry.calendarAccountId) {
		let calendarEvent = meetingToCalendarEvent(entry);
		if (!entry.calendarEventId) {
			calendarEvent = await addCalendarEvent(entry.calendarAccountId, calendarEvent);
			entry.calendarEventId = calendarEvent.id;
		}
		else {
			await updateCalendarEvent(entry.calendarAccountId, entry.calendarEventId, calendarEvent);
		}
	}

	const sql = 'INSERT INTO meetings SET ' + meetingEntrySetSql(entry);
	const {insertId} = await db.query(sql);
	return insertId;
}

/*
 * Add meetings, including webex, calendar and imat entries.
 *
 * @user:object 	The user executing the add
 * @meetings:array 	An array of meeting objects to be added
 *
 * Returns an array of meeting objects as added.
 */
export async function addMeetings(user, meetings) {

	if (!user.ieeeClient)
		throw new AuthError('Not logged in');

	const ids = await Promise.all(meetings.map(e => addMeeting(user, e)));

	return getMeetings({id: ids});
}

/*
 * Update meeting, including changes to webex, calendar and imat.
 *
 * @user:object 	The user executing the update
 * @id:any 			An array of update objects with shape {id, changes}
 * @changes:object 	Object with parameters to be changed.
 *
 * Returns the meeting object as updated.
 */
export async function updateMeeting(user, id, changes) {

	changes = {...changes};

	let [meeting] = await selectMeetings({id});

	if (!meeting)
		throw new Error(`Meeting with id=${id} does not exist`);

	/* Make Webex changes.
	 * If a Webex meeting was previously created (current entry has webexAccountId and webexMeetingId):
	 *   Remove existing Webex meeting if webexMeetingId is changed to null.
	 *   Remove existing Webex meeting and add a new webex meeting if webexMeetingId is changed to '$add'.
	 *   Otherwise, update the existing meeting
	 * If a Webex meeting has not yet been created (current entry is missing webexAccountId and/or webexMeetingId):
	 *   Add Webex meeting if webexMeetingId is '$add'
	 */
	let webexMeeting = meetingToWebexMeeting({...meeting, ...changes});
	const webexAccountId = changes.webexAccountId || meeting.webexAccountId;
	if (meeting.webexAccountId && meeting.webexMeetingId) {
		// Webex meeting previously created
		if (('webexAccountId' in changes && changes.webexAccountId !== meeting.webexAccountId) ||
			('webexMeetingId' in changes && changes.webexMeetingId !== meeting.webexMeetingId))
		{
			// Delete the webex meeting if the webex account or webex meeting ID changes
			try {
				await deleteWebexMeeting(meeting.webexAccountId, meeting.webexMeetingId);
			}
			catch (error) {
				// Ignore "meeting does not" exist error (probably delete through other means)
				if (!(error instanceof NotFoundError))	// Webex meeting does not exist
					throw error;
			}
			changes.webexMeetingId = null;
			webexMeeting = null;
			if (webexAccountId && changes.webexMeetingId === '$add') {
				// Add new webex meeting if the webexMeeting object is present
				console.log('add webex meeting');
				webexMeeting = await addWebexMeeting(meeting.webexAccountId, webexMeeting);
				changes.webexMeeting = webexMeeting;
				changes.webexMeetingId = webexMeeting.id;
			}
		}
		else {
			// Update existing webex meeting
			try {
				webexMeeting = await updateWebexMeeting(meeting.webexAccountId, meeting.webexMeetingId, webexMeeting);
			}
			catch (error) {
				if (error instanceof NotFoundError)	// Webex meeting does not exist
					changes.webexMeetingId = null;
				else
					throw error;
			}
		}
		changes.webexMeeting = webexMeeting;
	}
	else {
		// Webex meeting not created yet
		if (webexAccountId && changes.webexMeetingId === '$add') {
			// Add new webex meeting
			console.log('add webexMeeting', webexMeeting)
			webexMeeting = await addWebexMeeting(webexAccountId, webexMeeting);
			changes.webexMeeting = webexMeeting;
			changes.webexMeetingId = webexMeeting.id;
		}
	}

	/* Make IMAT breakout changes
	 * If IMAT breakout was previously created (current entry has imatMeetingId and imatBreakoutId):
	 *   If the imatMeetingId or imatBreakoutId is changed:
	 *     Remove existing IMAT breakout if imatBreakoutId is set to null.
	 *     Remove existing IMAT breakout and add a new IMAT breakout if imatBreakoutId === '$add'.
	 *     Remove existing IMAT breakout and update specified IMAT breakout if imatBreakoutId is not null and not '$add'
	 *       (the user is linking a meeting entry to an existing IMAT breakout entry)
	 *   If the imatMeetingId and imatBreakoutId remain unchanged:
	 *     Update existing IMAT breakout
	 * If IMAT breakout has not yet been created (current entry is missing imatMeetingId and/or imatBreakoutId):
	 *   Add IMAT breakout if imatBreakoutId is '$add'
	 *   Update specified IMAT breakout if imatBreakoutId is not '$add'
	 *      (the user is linking a meeting entry to an existing IMAT breakout entry)
	 */
	try {
		const imatMeetingId = meeting.imatMeetingId || changes.imatMeetingId;
		if (meeting.imatMeetingId && meeting.imatBreakoutId) {
			// IMAT breakout previously created
			if (('imatMeetingId' in changes && changes.imatMeetingId !== meeting.imatMeetingId) ||
				('imatBreakoutId' in changes && changes.imatBreakoutId !== meeting.imatBreakoutId))
			{
				// Delete existing breakout if the breakout meeting or breakout ID changes
				console.log('delete breakout')
				try {
					await deleteImatBreakouts(user, meeting.imatMeetingId, [meeting.imatBreakoutId]);
				}
				catch (error) {
					if (!(error instanceof NotFoundError))
						throw error;
				}
				if (changes.imatBreakoutId === '$add') {
					// Different session
					const breakout = await addImatBreakoutFromMeeting(user, imatMeetingId, {...meeting, ...changes});
					changes.imatBreakoutId = breakout.id;
				}
				else if (changes.imatBreakoutId) {
					// User is linking meeting to an existing IMAT breakout
					console.log('update breakout')
					await updateImatBreakoutFromMeeting(user, imatMeetingId, changes.imatBreakoutId, {...meeting, ...changes});
				}
			}
			else {
				// Update previously created breakout
				console.log('update breakout')
				try {
					await updateImatBreakoutFromMeeting(user, meeting.imatMeetingId, meeting.imatBreakoutId, {...meeting, ...changes});
				}
				catch (error) {
					// If the IMAT breakout no longer exists
					if (error instanceof NotFoundError)
						changes.imatBreakoutId = null;
					else
						throw error;
				}
			}
		}
		else {
			// IMAT breakout not prevoiusly created
			if (imatMeetingId) {
				if (changes.imatBreakoutId === '$add') {
					console.log('add breakout')
					const breakout = await addImatBreakoutFromMeeting(user, imatMeetingId, {...meeting, ...changes});
					changes.imatBreakoutId = breakout.id;
				}
				else if (changes.imatBreakoutId) {
					console.log('update breakout')
					await updateImatBreakoutFromMeeting(user, imatMeetingId, changes.imatBreakoutId, {...meeting, ...changes});
				}
			}
		}
	}
	catch (error) {
		console.log('Unable to update imat', error);
	}

	/* Make calendar changes */
	let calendarEvent = meetingToCalendarEvent({...meeting, ...changes});
	try {
		if (meeting.calendarAccountId && meeting.calendarEventId) {
			// Calendar event exists
			if ('calendarAccountId' in changes && changes.calendarAccountId !== meeting.calendarAccountId) {
				await deleteCalendarEvent(meeting.calendarAccountId, meeting.calendarEventId);
				changes.calendarEventId = null;
				if (changes.calendarAccountId) {
					calendarEvent = await addCalendarEvent(changes.calendarAccountId, calendarEvent);
					changes.calendarEventId = calendarEvent.id;
				}
			}
			else {
				// If somebody deletes the event it still exists with status 'cancelled'. So set the status to 'confirmed'.
				calendarEvent.status = 'confirmed';
				calendarEvent = await updateCalendarEvent(meeting.calendarAccountId, meeting.calendarEventId, calendarEvent);
			}
		}
		else {
			// Calendar event does not exist
			const calendarAccountId = 'calendarAccountId' in changes?
				changes.calendarAccountId:
				meeting.calendarAccountId;
			if (calendarAccountId) {
				calendarEvent = await addCalendarEvent(calendarAccountId, calendarEvent);
				changes.calendarEventId = calendarEvent.id;
			}
		}
	}
	catch (error) {
		console.log('Unable to update clendar');
		console.log(error)
	}

	const setSql = meetingEntrySetSql(changes);
	if (setSql)
		await db.query('UPDATE meetings SET ' + setSql + ' WHERE id=?;', [id]);

	return id;
}

/*
 * Update meetings.
 *
 * @user:object 	The user executing the update
 * @updates:array 	An array of update objects with shape {id, changes}
 *
 * Returns an array of meeting objects as updated.
 */
export async function updateMeetings(user, updates) {

	if (!user.ieeeClient)
		throw new AuthError('Not logged in');

	// Validate request
	if (updates.length === 0)
		return [];
	for (const u of updates) {
		if (!isPlainObject(u) || !u.id || !isPlainObject(u.changes))
			throw new TypeError('Expected array of objects with shape {id, changes}');
	}
	const ids = await Promise.all(updates.map(u => updateMeeting(user, u.id, u.changes)));
	return getMeetings({id: ids});
}

/*
 * Delete meetings.
 *
 * @user:object The user executing the delete.
 * @ids:array 	An array of meeting IDs identifying the meetings to be deleted.
 *
 * Returns the number of meetings deleted.
 */
export async function deleteMeetings(user, ids) {

	if (!user.ieeeClient)
		throw new AuthError('Not logged in');

	const entries = await db.query('SELECT webexAccountId, webexMeetingId, calendarAccountId, calendarEventId, imatMeetingId, imatBreakoutId FROM meetings WHERE id IN (?);', [ids]);
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
	const {affectedRows} = await db.query('DELETE FROM meetings WHERE id IN (?);', [ids]);
	return affectedRows;
}
