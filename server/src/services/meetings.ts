import { DateTime } from 'luxon';
import { parse as uuidToBin } from 'uuid';

import { isPlainObject, AuthError, NotFoundError } from '../utils';

import db from '../utils/database';
import type { OkPacket } from 'mysql2';

import { getSession, Session } from './sessions';
import { getWorkingGroup, Group } from './groups';

import {
	getWebexAccounts,
	getWebexMeetings,
	getWebexMeeting,
	addWebexMeeting,
	updateWebexMeeting,
	deleteWebexMeeting,
	WebexMeeting,
	WebexMeetingAdd,
	WebexMeetingUpdate
} from './webex';

import {
	deleteImatBreakouts,
	addImatBreakoutFromMeeting,
	updateImatBreakoutFromMeeting,
	Breakout
} from './imat';

import {
	addCalendarEvent,
	updateCalendarEvent,
	deleteCalendarEvent,
	CalendarEvent
} from './calendar';

export interface Meeting {
	id: number;
	organizationId: string;
	start: string;
	end: string;
	timezone: string;
	summary: string;
	location: string;
	isCancelled: boolean;
	hasMotions: boolean;
	webexAccountId: number | null;
	webexMeetingId: string | null;
	webexMeeting: Partial<WebexMeeting>;
	calendarAccountId: number | null;
	calendarEventId: string | null;
	imatMeetingId: number | null;
	imatBreakoutId: number | null;
	sessionId: number;
	roomId: number;
	roomName: string;
}

interface MeetingAddUpdate extends Omit<Meeting, "webexMeetingId" | "imatBreakoutId"> {
	webexMeetingId: string | null | '$add';
	imatBreakoutId: number | null | '$add';
}

interface MeetingUpdate {
	id: number;
	changes: Partial<MeetingAddUpdate>;
}

interface SelectMeetingsConstraints {
	id?: number | number[];
	groupId?: string;
	sessionId?: number;
	fromDate?: string;
	toDate?: string;
	timezone?: string;
	organizationId?: string | string[];
};

function selectMeetingsSql(constraints: SelectMeetingsConstraints) {

	let sql =
		'SELECT ' + 
			'm.id as id, ' +
			'BIN_TO_UUID(organizationId) AS organizationId, ' +
			'summary, ' +
			'DATE_FORMAT(start, "%Y-%m-%dT%TZ") AS start, ' +
			'DATE_FORMAT(end, "%Y-%m-%dT%TZ") AS end, ' +
			'timezone, ' +
			'location, ' +
			'isCancelled, hasMotions, ' +
			'webexAccountId, webexMeetingId, ' +
			'calendarAccountId, calendarEventId, ' +
			'imatMeetingId, imatBreakoutId, ' +
			'm.sessionId, ' +
			'm.roomId, ' +
			'r.name as roomName ' +
		'FROM meetings m ' +
		'LEFT JOIN rooms r ON r.id=m.roomId AND r.sessionId=m.sessionId';

	const {groupId, sessionId, fromDate, toDate, timezone, ...rest} = constraints;
	//console.log(rest)

	let wheres: string[] = [];
	if (groupId) {
		sql += ' LEFT JOIN organization o ON o.id=m.organizationId';
		wheres.push(db.format('(o.parent_id=UUID_TO_BIN(?) OR o.id=UUID_TO_BIN(?))', [groupId, groupId]));
	}

	if (sessionId) {
		wheres.push(db.format('m.sessionId=?', [sessionId]));
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
						db.format(Array.isArray(value)? 'BIN_TO_UUID(m.??) IN (?)': '??=UUID_TO_BIN(?)', [key, value]):
						db.format(Array.isArray(value)? 'm.?? IN (?)': 'm.??=?', [key, value])
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
function selectMeetings(constraints: SelectMeetingsConstraints) {
	const sql = selectMeetingsSql(constraints);
	return db.query({sql, dateStrings: true}) as Promise<Meeting[]>;
}

/*
 * Get a list of meetings and Webex meetings.
 *
 * @constraints?:object 	One or more constraints.
 *
 * Returns an object with shape {meetings, webexMeetings} where @meetings is array of meetings that meet the
 * constraints and @webexMeetings is an array of Webex meetings referenced by the meetings.
 */
export async function getMeetings(constraints: SelectMeetingsConstraints) {
	const meetings = await selectMeetings(constraints);
	const ids = meetings.reduce((ids, m) => m.webexMeetingId? ids.concat([m.webexMeetingId]): ids, [] as string[]);
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
function meetingToSetSql(e: Partial<Meeting>) {

	const entry: Record<string, any>= {
		organizationId: e.organizationId,
		summary: e.summary,
		location: e.location,
		roomId: e.roomId,
		sessionId: e.sessionId,
		isCancelled: e.isCancelled,
		hasMotions: e.hasMotions,
		webexAccountId: e.webexAccountId,
		webexMeetingId: e.webexMeetingId,
		calendarAccountId: e.calendarAccountId,
		calendarEventId: e.calendarEventId,
		imatMeetingId: e.imatMeetingId,
		imatBreakoutId: e.imatBreakoutId,
	};

	if (typeof e.timezone !== 'undefined') {
		if (!DateTime.local().setZone(e.timezone).isValid)
			throw new TypeError('Invalid parameter timezone: ' + e.timezone);
		entry.timezone = e.timezone;
	}

	if (typeof e.start !== 'undefined') {
		const start = DateTime.fromISO(e.start);
		if (!start.isValid)
			throw new TypeError('Invlid parameter start: ' + e.start);
		entry.start = start.toUTC().toFormat('yyyy-MM-dd HH:mm:ss');
	}

	if (typeof e.end !== 'undefined') {
		const end = DateTime.fromISO(e.end);
		if (!end.isValid)
			throw new TypeError('Invlid parameter end: ' + e.end);
		entry.end = end.toUTC().toFormat('yyyy-MM-dd HH:mm:ss');
	}

	for (const key of Object.keys(entry)) {
		if (entry[key] === undefined)
			delete entry[key];
	}

	const sets: string[] = [];
	for (const [key, value] of Object.entries(entry)) {
		let sql: string;
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
function meetingToWebexMeeting(meeting: Meeting) {
	const timezone = meeting.timezone || 'America/New_York';
	const webexMeeting: WebexMeetingAdd & WebexMeetingUpdate = {
		accountId: meeting.webexAccountId!,
		password: 'wireless',
		enabledAutoRecordMeeting: false,
		...(meeting.webexMeeting || {}),
		title: meeting.summary,
		start: DateTime.fromISO(meeting.start, {zone: timezone}).toISO(),
		end: DateTime.fromISO(meeting.end, {zone: timezone}).toISO(),
		timezone,
		integrationTags: [meeting.organizationId],
		id: ''
	};
	if (meeting.webexMeetingId)
		webexMeeting.id = meeting.webexMeetingId;
	//console.log('to webex meeting', meeting, webexMeeting)
	return webexMeeting;
}

/*
 * Format Webex meeting number (e.g., 1234 567 8901)
 */
const formatMeetingNumber = (n: string) => n.substr(0, 4) + ' ' + n.substr(4, 3) + ' ' + n.substr(7);

/*
 * Create IMAT breakout location string for a webex meeting.
 *
 * @webexAccountId:any 	The Webex account ID.
 * @webexMeeting:object The Webex meeting object.
 *
 * Returns a string that is the IMAT breakout location.
 */
export async function webexMeetingImatLocation(webexAccountId: number, webexMeeting: WebexMeeting) {
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
function meetingToCalendarDescriptionHtml(meeting: Meeting, webexMeeting: WebexMeeting) {

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
 * @breakout?:object 		(optional) IMAT breakout object
 *
 * Returns a string that is the calendar event description.
 */
function meetingToCalendarDescriptionText(meeting: Meeting, webexMeeting: WebexMeeting | undefined, breakout: Breakout | undefined) {

	let description = '';

	if (meeting.hasMotions)
		description += 'Agenda includes motions\n\n';

	if (webexMeeting &&
		'meetingNumber' in webexMeeting &&
		'webLink' in webexMeeting) {

		description += `
			Meeting link:
			${webexMeeting.webLink}

			Meeting number: ${formatMeetingNumber(webexMeeting.meetingNumber)}

			Meeting password: ${webexMeeting.password}\n
		`;

		const {telephony} = webexMeeting;
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
function meetingToCalendarEvent(
	meeting: Meeting,
	session: Session | undefined,
	workingGroup: Group | undefined,
	webexMeeting: WebexMeeting | undefined,
	breakout: Breakout | undefined
) {
	let location = meeting.location || '';

	if (session && Array.isArray(session.rooms)) {
		const room = session.rooms.find(room => room.id === meeting.roomId);
		if (room)
			location = room.name;
	}

	if (!location && webexMeeting)
		location = webexMeeting.webLink || '';

	let description = meetingToCalendarDescriptionText(meeting, webexMeeting, breakout);

	let summary = meeting.summary.replace(/^802.11/, '').trim();
	if (workingGroup)
		summary = workingGroup.name + ' ' + summary;

	summary = summary.replace(/[*]$/, '');	// Remove trailing asterisk
	if (meeting.hasMotions)
		summary += '*';						// Add trailing asterisk

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
async function addMeeting(user, meetingToAdd: MeetingAddUpdate) {

	let webexMeeting: WebexMeeting | undefined,
		breakout: Breakout | undefined,
		session: Promise<Session> | Session,
		workingGroup: Promise<Group | undefined> | Group | undefined;

	let meeting: Meeting = {
		...meetingToAdd,
		webexMeetingId: null,
		imatBreakoutId: null,
	}

	if (meetingToAdd.sessionId)
		session = getSession(meetingToAdd.sessionId);	// returns a promise

	if (meetingToAdd.organizationId)
		workingGroup = getWorkingGroup(meetingToAdd.organizationId);	// returns a promise

	/* If a webex account is given and the webexMeeting object exists then add a webex meeting */
	if (meetingToAdd.webexAccountId && meetingToAdd.webexMeeting) {
		const webexMeetingParams = meetingToWebexMeeting(meeting);
		if (meetingToAdd.webexMeetingId === '$add') {
			webexMeeting = await addWebexMeeting(webexMeetingParams);
			meeting.webexMeetingId = webexMeeting.id;
		}
		else {
			webexMeeting = await updateWebexMeeting(webexMeetingParams);
		}
	}

	session = await session!;	// do webex update while we wait for session

	/* If meetingId is given then add a breakout for this meeting */
	if (meetingToAdd.imatMeetingId) {
		if (meetingToAdd.imatBreakoutId === '$add') {
			breakout = await addImatBreakoutFromMeeting(user, session, meeting, webexMeeting);
			meeting.imatBreakoutId = breakout.id!;
		}
		else {
			breakout = await updateImatBreakoutFromMeeting(user, session, meeting, webexMeeting);
		}
	}

	/* If a calendar account is given, then add calendar event for this meeting */
	if (meetingToAdd.calendarAccountId) {
		workingGroup = await workingGroup;	// only need group with calendar update
		let calendarEvent: CalendarEvent | void = meetingToCalendarEvent(meeting, session, workingGroup, webexMeeting, breakout);
		if (!meetingToAdd.calendarEventId) {
			try {
				calendarEvent = await addCalendarEvent(meetingToAdd.calendarAccountId, calendarEvent);
				meeting.calendarEventId = calendarEvent?.id || null;
			}
			catch (error) {
				meeting.calendarEventId = null;
			}
		}
		else {
			await updateCalendarEvent(meetingToAdd.calendarAccountId, meetingToAdd.calendarEventId, calendarEvent);
		}
	}

	const sql = 'INSERT INTO meetings SET ' + meetingToSetSql(meeting);
	const {insertId} = await db.query({sql, dateStrings: true}) as OkPacket;
	const [meetingOut] = await selectMeetings({id: insertId});

	return {meeting: meetingOut, webexMeeting, breakout};
}

/*
 * Add meetings, including webex, calendar and imat entries.
 *
 * @user:object 	The user executing the add
 * @meetings:array 	An array of meeting objects to be added
 *
 * Returns an array of meeting objects as added.
 */
export async function addMeetings(user, meetingsIn: MeetingAddUpdate[]) {

	if (!user.ieeeClient)
		throw new AuthError('Not logged in');

	const entries = await Promise.all(meetingsIn.map(m => addMeeting(user, m)));

	const meetings: Meeting[] = [],
	      webexMeetings: WebexMeeting[] = [],
		  breakouts: Breakout[] = [];

	entries.forEach(entry => {
		meetings.push(entry.meeting);
		if (entry.webexMeeting)
			webexMeetings.push(entry.webexMeeting);
		if (entry.breakout)
			breakouts.push(entry.breakout);
	});

	return {meetings, webexMeetings, breakouts};
}

/* Make Webex changes.
 * If a Webex meeting was previously created (current entry has webexAccountId and webexMeetingId):
 *   Remove existing Webex meeting if webexMeetingId is changed to null.
 *   Remove existing Webex meeting and add a new webex meeting if webexMeetingId is changed to '$add'.
 *   Otherwise, update the existing meeting
 * If a Webex meeting has not yet been created (current entry is missing webexAccountId and/or webexMeetingId):
 *   Add Webex meeting if webexMeetingId is '$add'
 */
async function meetingMakeWebexUpdates(meeting: Meeting, changes: Partial<MeetingAddUpdate>) {

	let webexMeeting: WebexMeeting | undefined;

	const webexAccountId = changes.webexAccountId || meeting.webexAccountId;
	if (!webexAccountId)
		return webexMeeting;

	let webexMeetingParams = meetingToWebexMeeting({...meeting, ...changes, webexMeetingId: null, imatBreakoutId: null});

	if (meeting.webexAccountId && meeting.webexMeetingId) {
		// Webex meeting previously created

		// Get parameters for existing meeting
		try {
			webexMeeting = await getWebexMeeting(meeting.webexAccountId, meeting.webexMeetingId);
			webexMeetingParams = {...webexMeeting, ...webexMeetingParams};
		}
		catch (error) {
			if (!(error instanceof NotFoundError))
				throw error;
			// meeting not found
		}

		if (('webexAccountId' in changes && changes.webexAccountId !== meeting.webexAccountId) ||
			('webexMeetingId' in changes && changes.webexMeetingId !== meeting.webexMeetingId))
		{
			// Webex account or webex meeting ID changed

			// Delete exisitng webex meeting
			try {
				await deleteWebexMeeting({accountId: meeting.webexAccountId, id: meeting.webexMeetingId});
			}
			catch (error) {
				if (!(error instanceof NotFoundError))
					throw error;
				// Ignore meeting not found error (probably deleted through other means)
			}
			webexMeeting = undefined;

			if (webexAccountId && changes.webexMeetingId === '$add') {
				// Changes indicate that a new webex meeting should be added
				webexMeeting = await addWebexMeeting(webexMeetingParams);
				changes.webexMeetingId = webexMeeting.id;
			}
			else {
				changes.webexMeetingId = null;
			}
		}
		else {
			// Update existing webex meeting
			try {
				webexMeeting = await updateWebexMeeting(webexMeetingParams);
			}
			catch (error) {
				if (!(error instanceof NotFoundError))
					throw error;
				// meeting not found
				changes.webexMeetingId = null;
			}
		}
	}
	else {
		if (webexAccountId && changes.webexMeetingId) {
			if (changes.webexMeetingId === '$add') {
				// Add new meeting
				webexMeeting = await addWebexMeeting(webexMeetingParams);
				changes.webexMeetingId = webexMeeting.id;
			}
			else {
				// Link to existing webex meeting
				try {
					webexMeeting = await getWebexMeeting(webexAccountId, changes.webexMeetingId);
					webexMeetingParams = {...webexMeeting, ...webexMeetingParams};
					webexMeeting = await updateWebexMeeting(webexMeetingParams);
				}
				catch (error) {
					if (!(error instanceof NotFoundError))
						throw error;
					// meeting not found
					changes.webexMeetingId = null;
				}
			}
		}
	}

	return webexMeeting;
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
async function meetingMakeImatBreakoutUpdates(
	user,
	meeting: Meeting,
	changes: Partial<MeetingAddUpdate>,
	session: Session | undefined,
	webexMeeting: WebexMeeting | undefined
) {
	let breakout: Breakout | undefined;

	const {webexMeetingId, imatBreakoutId, ...meetingChanges} = changes;
	const updatedMeeting: Meeting = {...meeting, ...meetingChanges};

	if (meeting.imatMeetingId && meeting.imatBreakoutId) {
		// IMAT breakout previously created
		if (('imatMeetingId' in changes && changes.imatMeetingId !== meeting.imatMeetingId) ||
			('imatBreakoutId' in changes && changes.imatBreakoutId !== meeting.imatBreakoutId))
		{
			// Delete existing breakout if the breakout meeting or breakout ID changes
			try {
				await deleteImatBreakouts(user, meeting.imatMeetingId, [meeting.imatBreakoutId]);
			}
			catch (error) {
				if (!(error instanceof NotFoundError))
					throw error;
			}
			if (changes.imatBreakoutId === '$add') {
				// Different session
				breakout = await addImatBreakoutFromMeeting(user, session, updatedMeeting, webexMeeting);
				//changes.imatBreakoutId = breakout.id;
			}
			else if (changes.imatBreakoutId) {
				// User is linking meeting to an existing IMAT breakout
				updatedMeeting.imatBreakoutId = changes.imatBreakoutId;
				breakout = await updateImatBreakoutFromMeeting(user, session, updatedMeeting, webexMeeting);
			}
		}
		else {
			// Update previously created breakout
			console.log('update breakout')
			try {
				breakout = await updateImatBreakoutFromMeeting(user, session, updatedMeeting, webexMeeting);
			}
			catch (error) {
				if (!(error instanceof NotFoundError))
					throw error;
				// IMAT breakout no longer exists
				//changes.imatBreakoutId = null;
			}
		}
	}
	else {
		// IMAT breakout not prevoiusly created
		if (changes.imatBreakoutId === '$add') {
			breakout = await addImatBreakoutFromMeeting(user, session, updatedMeeting, webexMeeting);
			//changes.imatBreakoutId = breakout.id;
		}
		else if (changes.imatBreakoutId) {
			updatedMeeting.imatBreakoutId = changes.imatBreakoutId;
			breakout = await updateImatBreakoutFromMeeting(user, session, updatedMeeting, webexMeeting);
		}
	}

	return breakout;
}

async function meetingMakeCalendarUpdates(
	meeting: Meeting,
	changes: Partial<Meeting>,
	session: Session | undefined,
	workingGroup: Group | undefined,
	webexMeeting: WebexMeeting | undefined,
	breakout: Breakout | undefined
) {

	let calendarEvent: CalendarEvent | void;

	let updatedMeeting = {...meeting, ...changes};

	const calendarEventParams: CalendarEvent = meetingToCalendarEvent(updatedMeeting, session, workingGroup, webexMeeting, breakout);

	if (meeting.calendarAccountId && meeting.calendarEventId) {
		// Calendar event exists
		if ('calendarAccountId' in changes && changes.calendarAccountId !== meeting.calendarAccountId) {
			try {
				await deleteCalendarEvent(meeting.calendarAccountId, meeting.calendarEventId);
			}
			catch (error) {
				console.warn('Unable to delete calendar event', error);
			}
			//changes.calendarEventId = null;
			if (changes.calendarAccountId) {
				try {
					calendarEvent = await addCalendarEvent(changes.calendarAccountId, calendarEventParams);
					//changes.calendarEventId = calendarEvent?.id || null;
				}
				catch (error) {
					console.warn('Unable to add calendar event', error);
				}
			}
		}
		else {
			// If somebody deletes the event it still exists with status 'cancelled'. So set the status to 'confirmed'.
			calendarEventParams.status = 'confirmed';
			try {
				await updateCalendarEvent(meeting.calendarAccountId, meeting.calendarEventId, calendarEventParams);
			}
			catch(error) {
				console.warn('Unable to update calendar event', error);
			}
		}
	}
	else {
		// Calendar event does not exist
		if (updatedMeeting.calendarAccountId) {
			try {
				calendarEvent = await addCalendarEvent(updatedMeeting.calendarAccountId, calendarEventParams);
				//changes.calendarEventId = calendarEvent?.id || null;
			}
			catch (error) {
				console.warn('Unable to add calendar event', error);
			}
		}
	}

	return calendarEvent;
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
export async function updateMeeting(user, id: number, changesIn: Partial<MeetingAddUpdate>) {

	let changes: Partial<Meeting> = {
		...changesIn,
		webexMeetingId: undefined,
		imatBreakoutId: undefined
	};

	let [meeting] = await selectMeetings({id});
	if (!meeting)
		throw new NotFoundError(`Meeting with id=${id} does not exist`);

	let session: Promise<Session | undefined> | Session | undefined;
	const sessionId = changes.sessionId || meeting.sessionId;
	if (sessionId)
		session = getSession(sessionId);	// returns a promise

	let workingGroup: Promise<Group | undefined> | Group | undefined;
	const organizationId = changes.organizationId || meeting.organizationId;
	if (organizationId)
		workingGroup = getWorkingGroup(organizationId);	// returns a promise

	/* Make Webex changes */
	let webexMeeting = await meetingMakeWebexUpdates(meeting, changesIn);
	if (webexMeeting && meeting.webexMeetingId !== webexMeeting.id)
		changes.webexMeetingId = webexMeeting.id;
	if (!webexMeeting && meeting.webexMeetingId)
		changes.webexMeetingId = null;

	session = await session;	// do webex update while we wait for session

	/* Make IMAT breakout changes */
	let breakout = await meetingMakeImatBreakoutUpdates(user, meeting, changesIn, session, webexMeeting);
	if (breakout && meeting.imatBreakoutId !== breakout.id)
		changes.imatBreakoutId = breakout.id;
	if (!breakout && meeting.imatBreakoutId)
		changes.imatBreakoutId = null;

	workingGroup = await workingGroup;	// do other updates while we wait for group

	/* Make calendar changes */
	const calendarEvent = await meetingMakeCalendarUpdates(meeting, changes, session, workingGroup, webexMeeting, breakout);
	if (calendarEvent && meeting.calendarEventId !== calendarEvent.id)
		changes.calendarEventId = calendarEvent.id;

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
export async function updateMeetings(user, updates: MeetingUpdate[]) {

	if (!user.ieeeClient)
		throw new AuthError('Not logged in');

	// Validate request
	for (const u of updates) {
		if (!isPlainObject(u) || !u.id || !isPlainObject(u.changes))
			throw new TypeError('Expected array of objects with shape {id, changes}');
	}

	const entries = await Promise.all(updates.map(u => updateMeeting(user, u.id, u.changes)));

	const meetings: Meeting[] = [],
		webexMeetings: WebexMeeting[] = [],
		breakouts: Breakout[] = [];

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
export async function deleteMeetings(user, ids: number[]): Promise<number> {

	if (!user.ieeeClient)
		throw new AuthError('Not logged in');

	type DeleteMeetingSelect = Pick<Meeting, "webexAccountId" | "webexMeetingId" | "calendarAccountId" | "calendarEventId" | "imatMeetingId" | "imatBreakoutId">;

	const entries = await db.query('SELECT webexAccountId, webexMeetingId, calendarAccountId, calendarEventId, imatMeetingId, imatBreakoutId FROM meetings WHERE id IN (?);', [ids]) as DeleteMeetingSelect[];
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
	const {affectedRows} = await db.query('DELETE FROM meetings WHERE id IN (?);', [ids]) as OkPacket;
	return affectedRows;
}