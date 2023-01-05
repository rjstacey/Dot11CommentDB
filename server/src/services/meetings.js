import { DateTime } from 'luxon';
import { parse as uuidToBin } from 'uuid';

import { isPlainObject, AuthError, NotFoundError } from '../utils';

import db from '../utils/database';

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

function selectMeetingsSql(constraints) {

	let sql =
		'SELECT ' + 
			't.id as id, ' +
			'BIN_TO_UUID(organizationId) AS organizationId, ' +
			'summary, ' +
			'DATE_FORMAT(start, "%Y-%m-%dT%TZ") AS start, ' +
			'DATE_FORMAT(end, "%Y-%m-%dT%TZ") AS end, ' +
			//'start, end, ' +
			'timezone, ' +
			'location, ' +
			'isCancelled, hasMotions, ' +
			'webexAccountId, webexMeetingId, ' +
			'calendarAccountId, calendarEventId, ' +
			'imatMeetingId, imatBreakoutId ' +
		'FROM meetings t';

	const {groupId, fromDate, toDate, timezone, ...rest} = constraints;
	//console.log(rest)

	let wheres = [];
	if (groupId) {
		sql += ' LEFT JOIN organization o ON o.id=t.organizationId';
		wheres.push(db.format('(o.parent_id=UUID_TO_BIN(?) OR o.id=UUID_TO_BIN(?))', [groupId, groupId]));
	}

	if (fromDate) {
		const zone = timezone || 'America/New_York';
		const date = DateTime.fromISO(fromDate, {zone}).toUTC().toISODate();
		wheres.push(db.format('end > ?', date));
	}

	if (toDate) {
		const zone = timezone || 'America/New_York';
		const date = DateTime.fromISO(toDate, {zone}).plus({days: 1}).toUTC().toISODate();
		wheres.push(db.format('start <= ?', date));
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
	return sql;
}

/*
 * Get meetings.
 *
 * @constraints:object One or more constraints.
 *
 * Returns an array of meeting objects that meet the constraints.
 */
function selectMeetings(constraints) {
	const sql = selectMeetingsSql(constraints);
	return db.query({sql, dateStrings: true});
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
		await getWebexMeetings({...constraints, ids}):
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
function meetingToSetSql(e) {

	const entry = {
		organizationId: e.organizationId,
		summary: e.summary,
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

	if (e.start)
		entry.start = DateTime.fromISO(e.start).toUTC().toFormat('yyyy-MM-dd HH:mm:ss');

	if (e.end)
		entry.end = DateTime.fromISO(e.end).toUTC().toFormat('yyyy-MM-dd HH:mm:ss');

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
	const timezone = meeting.timezone || 'America/New_York';
	const webexMeeting = {
		password: 'wireless',
		enabledAutoRecordMeeting: false,
		...(meeting.webexMeeting || {}),
		title: meeting.summary,
		start: DateTime.fromISO(meeting.start, {zone: timezone}).toISO(),
		end: DateTime.fromISO(meeting.end, {zone: timezone}).toISO(),
		timezone,
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
 * (works for google calendar but not outlook)
 *
 * @meeting:object 			The meeting for which the calendar event description is being created.
 * @webexMeeting?:object 	(optional) Webex meeting event object
 *
 * Returns a string that is the calendar event description.
 */
function meetingToCalendarDescriptionHtml(meeting, webexMeeting) {

	let description = meetingDescriptionStyle;

	if (meeting.hasMotions)
		description += '<p>Agenda includes motions</p>';

	if (webexMeeting &&
		'meetingNumber' in webexMeeting &&
		'webLink' in webexMeeting) {

		const {
			meetingNumber,
			webLink,
			password,
			telephony,
		} = webexMeeting;

		description += `
			<p>
				Meeting link:<br>
				<a href="${webLink}">${webLink}</a>
			</p>
			<p>
				Meeting number:<br>
				${formatMeetingNumber(meetingNumber)}
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
 * Create a calendar event description for a meeting.
 *
 * @meeting:object 			The meeting for which the calendar event description is being created.
 * @webexMeeting?:object 	(optional) Webex meeting event object
 *
 * Returns a string that is the calendar event description.
 */
function meetingToCalendarDescriptionText(meeting, webexMeeting) {

	let description = '';

	if (meeting.hasMotions)
		description += 'Agenda includes motions\n\n';

	if (webexMeeting &&
		'meetingNumber' in webexMeeting &&
		'webLink' in webexMeeting) {

		console.log(webexMeeting)
		const {
			meetingNumber,
			webLink,
			password,
			telephony,
		} = webexMeeting;

		let telephonyDescription = '';
		
		description += `
			Meeting link:
			${webLink}

			Meeting number: ${formatMeetingNumber(meetingNumber)}

			Meeting password: ${password}\n
		`;

		if (telephony && Array.isArray(telephony.callInNumbers)) {
			description += `
				Join by phone:
				${telephony.callInNumbers.map(c => c.callInNumber + ' ' + c.label).join('\n')}
			`;
		}

		description += 'Need help? Go to https://help.webex.com\n';
	}

	return description.replace(/\t/g, '');	// strip tabs
}

/*
 * Create a calendar event for meeting.
 *
 * @meeting:object The meeting object for which the calendar event is being created.
 *
 * Returns the calendar event object.
 */
function meetingToCalendarEvent(meeting, webexMeeting) {
	let location = meeting.location || '',
	    description = '';
	if (webexMeeting) {
		description = meetingToCalendarDescriptionText(meeting, webexMeeting);
		if (!location)
			location = webexMeeting.webLink || '';
	}
	let summary = meeting.summary;
	summary = summary.replace(/^(canceled|cancelled)[\s-]+/i, '');
	if (meeting.isCancelled)
		summary = 'CANCELLED - ' + summary;
	return {
		summary,
		location,
		description,
		start: {
			dateTime: meeting.start,
			timeZone: meeting.timezone
		},
		end: {
			dateTime: meeting.end,
			timeZone: meeting.timezone
		},
	}
}

/*
 * Add a meeting, including adding webex, calendar and imat entries (if needed).
 *
 * @user:object 	The user executing the add
 * @meeting:object	The meeting object to be added
 *
 * Returns the id of the meeting added.
 */
async function addMeeting(user, meeting) {

	let webexMeeting, breakout;

	/* If a webex account is given and the webexMeeting object exists then add a webex meeting */
	if (meeting.webexAccountId && meeting.webexMeeting) {
		webexMeeting = meetingToWebexMeeting(meeting);
		webexMeeting.accountId = meeting.webexAccountId;
		if (meeting.webexMeetingId === '$add') {
			webexMeeting = await addWebexMeeting(webexMeeting);
			meeting.webexMeetingId = webexMeeting.id;
		}
		else {
			webexMeeting.id = meeting.webexMeetingId;
			webexMeeting = await updateWebexMeeting(webexMeeting);
		}
		//meeting.webexMeeting = webexMeeting;
	}

	/* If meetingId is given then add a breakout for this meeting */
	if (meeting.imatMeetingId) {
		if (meeting.imatBreakoutId === '$add') {
			breakout = await addImatBreakoutFromMeeting(user, meeting.imatMeetingId, meeting, webexMeeting);
			meeting.imatBreakoutId = breakout.id;
		}
		else {
			breakout = await updateImatBreakoutFromMeeting(user, meeting.imatMeetingId, meeting.imatBreakoutId, meeting, webexMeeting);
		}
	}

	/* If a calendar account is given, then add calendar event for this meeting */
	if (meeting.calendarAccountId) {
		let calendarEvent = meetingToCalendarEvent(meeting, webexMeeting);
		console.log(calendarEvent)
		if (!meeting.calendarEventId) {
			try {
				calendarEvent = await addCalendarEvent(meeting.calendarAccountId, calendarEvent);
				meeting.calendarEventId = calendarEvent.id;
			}
			catch (error) {
				meeting.calendarEventId = null;
			}
		}
		else {
			await updateCalendarEvent(meeting.calendarAccountId, meeting.calendarEventId, calendarEvent);
		}
	}

	const sql = 'INSERT INTO meetings SET ' + meetingToSetSql(meeting);
	console.log(sql);
	const {insertId} = await db.query({sql, dateStrings: true});
	[meeting] = await selectMeetings({id: insertId});

	return {meeting, webexMeeting, breakout};
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

	const entries = await Promise.all(meetings.map(e => addMeeting(user, e)));

	meetings = [];
	const webexMeetings = [], breakouts = [];

	entries.forEach(entry => {
		meetings.push(entry.meeting);
		if (entry.webexMeeting)
			webexMeetings.push(entry.webexMeeting);
		if (entry.breakout)
			breakouts.push(entry.breakout);
	});

	return {meetings, webexMeetings, breakouts};
}

/*
 * Update meeting, including changes to webex, calendar and imat.
 *
 * @user:object 	The user executing the update
 * @id:any 			The meeting identifier
 * @changes:object 	Object with meeting parameters to be changed.
 *
 * Returns the meeting object as updated.
 */
export async function updateMeeting(user, id, changes) {

	let webexMeeting, breakout;
	changes = {...changes};

	let [meeting] = await selectMeetings({id});

	if (!meeting)
		throw new NotFoundError(`Meeting with id=${id} does not exist`);
	let updatedMeeting = {...meeting, ...changes};

	/* Make Webex changes.
	 * If a Webex meeting was previously created (current entry has webexAccountId and webexMeetingId):
	 *   Remove existing Webex meeting if webexMeetingId is changed to null.
	 *   Remove existing Webex meeting and add a new webex meeting if webexMeetingId is changed to '$add'.
	 *   Otherwise, update the existing meeting
	 * If a Webex meeting has not yet been created (current entry is missing webexAccountId and/or webexMeetingId):
	 *   Add Webex meeting if webexMeetingId is '$add'
	 */
	webexMeeting = meetingToWebexMeeting(updatedMeeting);
	const webexAccountId = changes.webexAccountId || meeting.webexAccountId;
	if (meeting.webexAccountId && meeting.webexMeetingId) {
		// Webex meeting previously created
		if (('webexAccountId' in changes && changes.webexAccountId !== meeting.webexAccountId) ||
			('webexMeetingId' in changes && changes.webexMeetingId !== meeting.webexMeetingId))
		{
			// Delete the webex meeting if the webex account or webex meeting ID changes
			try {
				await deleteWebexMeeting({accountId: meeting.webexAccountId, id: meeting.webexMeetingId});
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
				webexMeeting.accountId = meeting.webexAccountId;
				webexMeeting = await addWebexMeeting(meeting.webexAccountId, webexMeeting);
				changes.webexMeetingId = webexMeeting.id;
				//changes.webexMeeting = webexMeeting;
			}
		}
		else {
			// Update existing webex meeting
			try {
				webexMeeting.accountId = meeting.webexAccountId;
				webexMeeting.id = meeting.webexMeetingId;
				webexMeeting = await updateWebexMeeting(webexMeeting);
			}
			catch (error) {
				if (!(error instanceof NotFoundError))
					throw error;
				// Webex meeting does not exist
				webexMeeting = null;
				changes.webexMeetingId = null;
			}
		}
		//changes.webexMeeting = webexMeeting;
	}
	else {
		if (webexAccountId && changes.webexMeetingId) {
			if (changes.webexMeetingId === '$add') {
				// Add new webex meeting
				webexMeeting.accountId = webexAccountId;
				console.log('add webexMeeting', webexMeeting)
				webexMeeting = await addWebexMeeting(webexMeeting);
				//changes.webexMeeting = webexMeeting;
				changes.webexMeetingId = webexMeeting.id;
			}
			else {
				// Link to existing webex meeting
				try {
					webexMeeting.accountId = webexAccountId;
					webexMeeting.id = changes.webexMeetingId;
					webexMeeting = await updateWebexMeeting(webexMeeting);
					//changes.webexMeeting = webexMeeting;
				}
				catch (error) {
					if (!(error instanceof NotFoundError))
						throw error;
					// Webex meeting does not exist
					webexMeeting = null;
					changes.webexMeetingId = null;
				}
			}
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
	updatedMeeting = {...meeting, ...changes};
	try {
		const imatMeetingId = changes.imatMeetingId || meeting.imatMeetingId;
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
					breakout = await addImatBreakoutFromMeeting(user, imatMeetingId, updatedMeeting, webexMeeting);
					changes.imatBreakoutId = breakout.id;
				}
				else if (changes.imatBreakoutId) {
					// User is linking meeting to an existing IMAT breakout
					console.log('update breakout')
					breakout = await updateImatBreakoutFromMeeting(user, imatMeetingId, changes.imatBreakoutId, updatedMeeting, webexMeeting);
				}
			}
			else {
				// Update previously created breakout
				console.log('update breakout')
				try {
					breakout = await updateImatBreakoutFromMeeting(user, meeting.imatMeetingId, meeting.imatBreakoutId, updatedMeeting, webexMeeting);
				}
				catch (error) {
					if (!(error instanceof NotFoundError))
						throw error;
					// IMAT breakout no longer exists
					changes.imatBreakoutId = null;
				}
			}
		}
		else {
			// IMAT breakout not prevoiusly created
			if (imatMeetingId) {
				if (changes.imatBreakoutId === '$add') {
					console.log('add breakout')
					breakout = await addImatBreakoutFromMeeting(user, imatMeetingId, updatedMeeting, webexMeeting);
					changes.imatBreakoutId = breakout.id;
				}
				else if (changes.imatBreakoutId) {
					console.log('update breakout')
					breakout = await updateImatBreakoutFromMeeting(user, imatMeetingId, changes.imatBreakoutId, updatedMeeting, webexMeeting);
				}
			}
		}
	}
	catch (error) {
		console.log('Unable to update imat', error);
	}

	/* Make calendar changes */
	updatedMeeting = {...meeting, ...changes};
	let calendarEvent = meetingToCalendarEvent(updatedMeeting, webexMeeting);
	if (meeting.calendarAccountId && meeting.calendarEventId) {
		// Calendar event exists
		if ('calendarAccountId' in changes && changes.calendarAccountId !== meeting.calendarAccountId) {
			try {
				await deleteCalendarEvent(meeting.calendarAccountId, meeting.calendarEventId);
			}
			catch (error) {
				console.warn('Unable to delete calendar event', error);
			}
			changes.calendarEventId = null;
			if (changes.calendarAccountId) {
				try {
					calendarEvent = await addCalendarEvent(changes.calendarAccountId, calendarEvent);
					changes.calendarEventId = calendarEvent.id;
				}
				catch (error) {
					console.warn('Unable to add calendar event', error);
				}
			}
		}
		else {
			// If somebody deletes the event it still exists with status 'cancelled'. So set the status to 'confirmed'.
			calendarEvent.status = 'confirmed';
			try {
				await updateCalendarEvent(meeting.calendarAccountId, meeting.calendarEventId, calendarEvent);
			}
			catch(error) {
				console.warn('Unable to update calendar event', error);
			}
		}
	}
	else {
		// Calendar event does not exist
		const calendarAccountId = changes.calendarAccountId || meeting.calendarAccountId;
		if (calendarAccountId) {
			try {
				calendarEvent = await addCalendarEvent(calendarAccountId, calendarEvent);
				changes.calendarEventId = calendarEvent.id;
			}
			catch (error) {
				console.warn('Unable to add calendar event', error);
			}
		}
	}

	const setSql = meetingToSetSql(changes);
	if (setSql) {
		const sql = db.format('UPDATE meetings SET ' + setSql + ' WHERE id=?;', [id])
		await db.query({sql, dateStrings: true});
		[meeting] = await selectMeetings({id});
	}

	return {meeting, webexMeeting, breakout};
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
	for (const u of updates) {
		if (!isPlainObject(u) || !u.id || !isPlainObject(u.changes))
			throw new TypeError('Expected array of objects with shape {id, changes}');
	}

	const entries = await Promise.all(updates.map(u => updateMeeting(user, u.id, u.changes)));

	const meetings = [], webexMeetings = [], breakouts = [];
	entries.forEach(entry => {
		meetings.push(entry.meeting);
		if (entry.webexMeeting)
			webexMeetings.push(entry.webexMeeting);
		if (entry.breakout)
			breakouts.push(entry.breakout);
	});

	return {meetings, webexMeetings, breakouts};
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
				await deleteWebexMeeting({accountId: entry.webexAccountId, id: entry.webexMeetingId});
			}
			catch (error) {
				if (!(error instanceof NotFoundError))
					throw error;
				// Webex meeting does not exist
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
