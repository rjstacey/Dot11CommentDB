/*
 * imat.ieee.org HTML scraping
 */
import PropTypes from 'prop-types';
import { DateTime, Duration } from 'luxon';
import cheerio from 'cheerio';
import { csvParse, AuthError, NotFoundError } from '../utils';
import { webexMeetingImatLocation } from './meetings';
import { getGroups } from './groups';

const FormData = require('form-data');

// Convert date to ISO format
function dateToISODate(dateStr) {
	// Date is in format: "11-Dec-2018"
	return DateTime.fromFormat(dateStr, 'dd-MMM-yyyy').toISODate();
}

function csvDateToISODate(dateStr) {
	// Date is in format: "11/12/2018"
	return DateTime.fromFormat(dateStr, 'MM/dd/yyyy').toISODate();
}

function luxonTimeZone(timeZone) {
	// Luxon can't handle some of these shorter timezone names
	const map = {
		'EST5EDT': 'America/New_York',
		'CST6CDT': 'America/Chicago',
		'MST7MDT': 'America/Denver',
		'PST8PDT': 'America/Los_Angeles',
		'EST': 'America/New_York',
		'HST': 'Pacific/Honolulu',
		'CET': 'Europe/Vienna'
	};
	return map[timeZone] || timeZone;
}

function getPage(body, title) {
	// Use cheerio, which provides jQuery-like parsing
	const $ = cheerio.load(body);

	const titleHtml = $('div.title').html();

	// If we get the "Sign In" page then the user is not logged in
	if (titleHtml == "Sign In")
		throw new AuthError('Not logged in');

	// Make sure we got the expected page
	if (titleHtml != title)
		throw new Error('Unexpected page returned by imat.ieee.org');

	return $;
}

/*
function parseMeetingsPage(body) {

	const $ = getPage(body, "Sessions");

	const sessions = [];
	$('.b_data_row').each(function(index) {  // each table data row
		var tds = $(this).find('td');
		const s = {
			id: 0,
			start: dateToISODate(tds.eq(0).text()),
			end: dateToISODate(tds.eq(1).text()),
			type: tds.eq(3).text(),	// Plenary, Interim, Other
			name: tds.eq(4).text(),
			timezone: tds.eq(5).text(),
			organizerId: '',
		};
		s.type = s.type? s.type[0].toLowerCase(): '';

		const href = $(this).find('a[href*="/meeting-detail?"]').attr('href');
		const m = /\/([^\/]+)\/meeting-detail\?p=(\d+)/.exec(href);
		if (m) {
			s.organizerId = m[1];
			s.id = m[2];
		}

		sessions.push(s);
	});

	return sessions;
}
*/

const meetingsCsvHeader = [
	'Sponsor ID',
	'Event ID',
	'Sponsor Symbol',
	'Sponsor Name',
	'Event Name',
	'Event Type',
	'Start Date',
	'End Date',
	'Time Zone',
	'Street Line 1',
	'Street Line 2',
	'City',
	'State',
	'Zip',
	'Country',
	'Event Nomenclature',
	'Timeslot Nomenclature',
	'Breakout Nomenclature',
	'Local Server URL',
	'Event Access Code'
];

async function parseMeetingsCsv(buffer) {
	const p = await csvParse(buffer, {columns: false, bom: true, encoding: 'latin1'});

	if (p.length === 0)
		throw new Error('Empty meeting.csv file');

	// Row 0 is the header
	if (meetingsCsvHeader.reduce((r, v, i) => r || v !== p[0][i], false))
		throw new Error(`Unexpected column headings ${p[0].join()}. Expected ${meetingsCsvHeader.join()}.`);
	p.shift();

	const meetings = p.map(c => ({
		id: parseInt(c[1], 10),
		organizerId: c[0],		// string
		organizerSymbol: c[2],
		organizerName: c[3],
		name: c[4],
		type: c[5],
		start: csvDateToISODate(c[6]),
		end: csvDateToISODate(c[7]),
		timezone: luxonTimeZone(c[8]),
	}));

	return meetings;
}

/*
 * get IMAT meetings
 *
 * Parameters: n = number of entries to get
 */
export async function getImatMeetings(user) {
	const {ieeeClient} = user;
	if (!ieeeClient)
		throw new AuthError('Not logged in');

	/*async function recursivePageGet(meetings, n, page) {
		//console.log('get epolls n=', n)

		const {data} = await ieeeClient.get(`https://imat.ieee.org/${user.Email}/meetings?n=${page}`);

		//console.log(body)
		var meetingsPage = parseMeetingsPage(data);
		var end = n - meetings.length;
		if (end > meetingsPage.length) {
			end = meetingsPage.length;
		}
		meetings = meetings.concat(meetingsPage.slice(0, end));

		if (meetings.length === n || meetingsPage.length === 0)
			return meetings;

		return recursivePageGet(meetings, n, page+1);
	}

	return await recursivePageGet([], n, 1);*/

	const response = await ieeeClient.get(`/${user.Email}/meeting.csv`, {responseType: 'arraybuffer'});
	if (response.headers['content-type'] !== 'text/csv')
		throw new AuthError('Not logged in');

	const meetings = await parseMeetingsCsv(response.data);
	//console.log(meetings)
	return meetings;
}

async function getImatMeeting(user, id) {
	const meetings = await getImatMeetings(user);
	const meeting = meetings.find(m => m.id === id);
	if (!meeting)
		throw new NotFoundError('Meeting does not exist');
	return meeting;
}

/* The "Add a new meeting" page contains a form for adding a meeting.
 * The form includes a select element with committee options and
 * select elements for timeslot start and end.
 *
 * It is possible to get the committees from a separate .csv, but the
 * IDs in the .csv are not the same as those in the committee select options.
 * The committee names in the select options area a join of the committee
 * symbol and name that are hard to separate.
 */
function parseAddMeetingPage(body) {

	const $ = getPage(body, "Add a new Meeting");

	// f1 selects the committee
	const committees = [];
	$('select[name="f1"] > option').each(function(index) {  // each option
		const id = parseInt($(this).attr('value'));
		const symbolName = $(this).text();
		committees.push({id, symbolName});
	});

	let timeslots = {};
	// f12 selects timeslot start
	$('select[name="f12"] > option').each(function(index) {
		const id = parseInt($(this).attr('value'));
		const p = $(this).html().split('&nbsp;');
		const name = p[0];
		const startTime = p[1];
		timeslots[id] = {id, name, startTime};
	});

	// f11 selects timeslot end
	$('select[name="f11"] > option').each(function(index) {
		const id = parseInt($(this).attr('value'));
		const p = $(this).html().split('&nbsp;');
		timeslots[id].endTime = p[1];
	});

	timeslots = Object.values(timeslots);	// convert to array

	return {committees, timeslots}
}

const committeesCsvHeader = [
	'Committee ID',
	'Parent Committee ID',
	'Committee Type',
	'Committee Symbol',
	'Committee Short Name',
	'Committee Name'
];

async function parseImatCommitteesCsv(buffer) {
	const p = await csvParse(buffer, {columns: false, bom: true, encoding: 'latin1'});

	if (p.length === 0)
		throw new Error('Empty committees.csv file');

	// Row 0 is the header
	if (committeesCsvHeader.reduce((r, v, i) => v !== p[0][i], false))
		throw new Error(`Unexpected column headings ${p[0].join()}. Expected ${committeesCsvHeader.join()}.`);
	p.shift();

	return p.map(c => ({
		id: c[0],			// string
		parentId: c[1],		// string
		type: c[2],
		symbol: c[3],
		shortName: c[4],
		name: c[5],
	}));
}

/*
 * get IMAT meetings
 *
 * Parameters: group = name of the owning group
 */
export async function getImatCommittees(user, group) {
	const {ieeeClient} = user;
	if (!ieeeClient)
		throw new AuthError('Not logged in');

	const response = await ieeeClient.get(`/${group}/committees.csv`, {responseType: 'arraybuffer'});
	if (response.headers['content-type'] !== 'text/csv')
		throw new AuthError('Not logged in');

	const committees = await parseImatCommitteesCsv(response.data);
	//console.log(committees)
	return committees;
}

const breakoutsCvsHeader = [
	'Breakout ID', 'Start Timeslot Name', 'End Timeslot Name', 'Start', 'End', 
	'Location', 'Group Symbol', 'Breakout Name', 'Credit', 'Override Credit Numerator', 'Override Credit Denominator',
	'Event Day', 'Facilitator Web Id'
];

export function parseSessionDetailPage(body) {
	let m, href;

	const $ = getPage(body, "Session detail");

	m = /<td>(.*) Time Zone<\/td>/.exec(body);
	if (!m)
		throw new Error("Can't find timezone");
	const timezone = m[1];

	m = /<td>(\d{2}-[a-zA-Z]{3}-\d{4}) - (\d{2}-[a-zA-Z]{3}-\d{4})<\/td>/.exec(body);
	if (!m)
		throw new Error("Can't find session dates");
	const sessionStart = DateTime.fromFormat(m[1], 'dd-MMM-yyyy', {zone: timezone});

	// Find "Add a new Meeting" link
	href = $('a[href*="/breakout?"]').attr('href');
	m = /p=(\d+)/.exec(href);
	if (!m)
		throw new Error("Can't find session ID");
	const imatMeetingId = parseInt(m[1]);

	const breakouts = [];
	const timeslots = {};

	$('.b_data_row').each(function(index) {  // each table data row
		var tds = $(this).find('td');
		//console.log(tds.length)
		if (tds.length === 4) {	// Timeslots table
			const t = {
				id: 0,
				name: tds.eq(0).text(),
				startTime: tds.eq(1).text(),
				endTime: tds.eq(2).text()
			};
			/* The user may not have permission to edit the timeslots, in which case the timeslot edit link and thus
			 * the ID is not available. */
			href = tds.eq(3).find('a[href*="timeslot-edit"]').attr('href');
			if (href) {
				m = /t=(\d+)/.exec(href);
				if (!m)
					throw Error("Can't parse timeslot-edit link");
				t.id = parseInt(m[1]);
			}
			else {
				t.id = t.name;
			}

			timeslots[t.name] = t;
		}

		if (tds.length === 9) {	// Breakouts table
			var b = {};

			const timePeriod = tds.eq(0).html();
			m = /(.+)&nbsp;[a-zA-Z]{3}, (\d{2}-[a-zA-Z]{3}-\d{4})<br>(\d{2}:\d{2})&nbsp;-&nbsp;(\d{2}:\d{2})/.exec(timePeriod);
			if (!m) 
				throw Error("Can't parse Time Period column; got " + timePeriod)
			const slotsRange = m[1];
			const eventDate = DateTime.fromFormat(m[2], 'dd-MMM-yyyy', {zone: timezone});
			b.day = eventDate.diff(sessionStart, 'days').get('days');
			b.startTime = m[3];
			b.endTime = m[4];
			b.start = eventDate.set({hour: m[3].substring(0, 2), minute: m[3].substring(3)}).toISO();
			b.end = eventDate.set({hour: m[4].substring(0, 2), minute: m[4].substring(3)}).toISO();

			m = /(.+)&nbsp;-&nbsp;(.+)/.exec(slotsRange);
			b.startSlotName = m? m[1]: slotsRange;
			b.endSlotName = m? m[2]: slotsRange;
			b.startSlot = timeslots[b.startSlotName];
			b.endSlot = timeslots[b.endSlotName];
			b.startSlotId = b.startSlot? b.startSlot.id: null;
			b.endSlotId = b.endSlot? b.endSlot.id: null;

			b.location = tds.eq(1).text();
			b.facilitatorName = tds.eq(2).text();
			b.groupShortName = tds.eq(3).text();
			b.name = tds.eq(4).text();
			b.credit = tds.eq(5).text();
			//console.log(tds.eq(7).html())

			href = tds.eq(7).find('a[href*="breakout-edit"]').attr('href');
			if (!href)
				throw new Error("Can't find edit breakout link");
			m = /\/(.*)\/breakout-edit\?t=(\d+)&p=(\d+)&fc=(.+)/.exec(href);
			if (!m)
				throw new Error("Can't parse edit breakout link");
			b.id = parseInt(m[2]);
			b.imatMeetingId = parseInt(m[3]);
			b.editContext = decodeURIComponent(m[4]);
			b.editGroupId = m[1];

			const inputName = $(`input[value="${b.id}"]`).attr('name');
			if (!inputName)
				throw new Error("Can't find breakout delete checkbox");
			m = /f5_(\d+)/.exec(inputName);
			if (!m)
				throw new Error("Can't parse input field");
			b.formIndex = m[1];

			//console.log(b);
			breakouts.push(b);
		}
	});

	return {breakouts, timeslots};
}

async function parseImatBreakoutsCsv(session, buffer) {
	const p = await csvParse(buffer, {columns: false, bom: true, encoding: 'latin1'});

	if (p.length === 0)
		throw new Error('Empty breakouts.csv file');

	// Row 0 is the header
	if (breakoutsCvsHeader.reduce((r, v, i) => r || v !== p[0][i], false))
		throw new Error(`Unexpected column headings ${p[0].join()}. Expected ${breakoutsCvsHeader.join()}.`);
	p.shift();

	return p.map(c => {
		const eventDay = c[11];	// day offset from start of session
		const eventDate = DateTime.fromISO(session.start, {zone: session.timezone}).plus(Duration.fromObject({days: eventDay}));
		return {
			id: parseInt(c[0], 10),
			startSlotName: c[1],
			endSlotName: c[2],
			day: parseInt(c[11], 10),
			start: eventDate.set({hour: c[3].substring(0, 2), minute: c[3].substring(3)}).toISO(),
			end: eventDate.set({hour: c[4].substring(0, 2), minute: c[4].substring(3)}).toISO(),
			timezone: session.timezone,
			location: c[5],
			group: c[6],
			name: c[7],
			credit: c[8],
			overrideCreditNumerator: c[9],
			overrideCreditDenominator: c[10],
			facilitator: c[12],
		}
	});
}

const timeslotsCsvHeader = ['Event ID', 'Timeslot ID', 'Timeslot Name', 'Start Time', 'End Time'];

async function parseImatTimeslotCsv(session, buffer) {
	const p = await csvParse(buffer, {columns: false, bom: true, encoding: 'latin1'});

	if (p.length === 0)
		throw new Error('Empty timeslot.csv file');

	// Row 0 is the header
	if (timeslotsCsvHeader.reduce((r, v, i) => r || v !== p[0][i], false))
		throw new Error(`Unexpected column headings ${p[0].join()}. Expected ${timeslotsCsvHeader.join()}.`);
	p.shift();

	return p.map(c => ({
		id: parseInt(c[1], 10),
		name: c[2],
		startTime: c[3],
		endTime: c[4],
	}));
}

export async function getImatBreakouts(user, imatMeetingId) {

	const {ieeeClient} = user;
	if (!ieeeClient)
		throw new AuthError('Not logged in');

	const imatMeeting = await getImatMeeting(user, imatMeetingId);
	//console.log(imatMeeting);

	let response;

	/*
	response = await ieeeClient.get(`/${imatMeeting.organizerId}/breakouts.csv?p=${imatMeetingId}&xls=1`, {responseType: 'arraybuffer'});
	if (response.headers['content-type'] !== 'text/csv')
		throw new AuthError('Not logged in');
	const breakouts = await parseImatBreakoutsCsv(imatMeeting, response.data);
	*/
	response = await ieeeClient.get(`/${imatMeeting.organizerId}/meeting-detail?p=${imatMeetingId}`);
	const {breakouts} = parseSessionDetailPage(response.data);

	/*response = await ieeeClient.get(`/${imatMeeting.organizerId}/timeslot.csv?p=${imatMeeting.id}&xls=1`, {responseType: 'arraybuffer'});
	if (response.headers['content-type'] !== 'text/csv')
		throw new AuthError('Not logged in');

	const timeslots = await parseImatTimeslotCsv(imatMeeting, response.data);*/

	response = await ieeeClient.get(`/802.11/committees.csv`, {responseType: 'arraybuffer'});
	if (response.headers['content-type'] !== 'text/csv')
		throw new AuthError('Not logged in');
	const committees = await parseImatCommitteesCsv(response.data);

	response = await ieeeClient.get(`/${imatMeeting.organizerId}/breakout?p=${imatMeetingId}`);
	const {timeslots, committees: committees2} = parseAddMeetingPage(response.data);

	/* The committees in the committees.csv file do not have the same ID as that used
	 * for the committee options in the "Add a new meeting" form. The committee options
	 * label is symbol + ' ' + name trucated at around 62 characters. */
	for (const c1 of committees) {
		for (const c2 of committees2) {
			if (c2.symbolName.search((c1.symbol + ' ' + c1.name).substring(0,60)) === 0)
				c1.id = c2.id;
		}
	}

	/* Override the timeslots from session detail page; if the user may not have permission to modify the timeslots
	 * and thus might not get the slot ID. */
	for (const b of breakouts) {
		const startSlot = timeslots.find(t => t.name === b.startSlot.name);
		if (startSlot)
			b.startSlotId = startSlot.id;
		const endSlot = timeslots.find(t => t.name === b.startSlot.name);
		if (endSlot)
			b.endSlotId = endSlot.id;
		const committee = committees.find(c => c.shortName === b.groupShortName);
		if (committee) {
			b.groupId = committee.id;
			b.symbol = committee.symbol;
		}
	}

	//console.log(timeslots, committees, committees2)

	return {imatMeeting, breakouts, timeslots, committees};
}

const breakoutCredit = {
	"Normal": 1,
	"Extra": 2,
	"Zero": 3,
	"Other": 4,
};

const breakoutProps = {
	name: PropTypes.string.isRequired,
	groupId: PropTypes.number.isRequired,
	day: PropTypes.number.isRequired,
	startSlotId: PropTypes.number.isRequired,
	startTime: PropTypes.string.isRequired,
	endSlotId: PropTypes.number.isRequired,
	endTime: PropTypes.string.isRequired,
	location: PropTypes.string.isRequired,
	credit: PropTypes.oneOf(Object.keys(breakoutCredit)).isRequired,
	facilitator: PropTypes.string,
	teleconId: PropTypes.number,
};

async function addImatBreakout(user, imatMeeting, breakout) {

	PropTypes.checkPropTypes(breakoutProps, breakout, 'breakout', 'addImatBreakout');

	const params = {
		v: 1,
		f2: breakout.name,
		f1: breakout.groupId,
		f6: breakout.day,
		f12: breakout.startSlotId,
		f10: breakout.startTime,
		f11: breakout.endSlotId,
		f7: breakout.endTime,
		f0: breakout.location,
		f4: breakoutCredit[breakout.credit],
		f8: breakout.facilitator || user.Email,
		f9: "OK/Done"
	};

	const {ieeeClient} = user;
	let response = await ieeeClient.post(`/${imatMeeting.organizerId}/breakout?p=${imatMeeting.id}`, params);
	//console.log(response)

	if (response.data.search(/<title>IEEE Standards Association - Event detail<\/title>/) === -1) {
		const m = response.data.match(/<div class="field_err">(.*)<\/div>/);
		throw new Error(m? m[1]: 'An unexpected error occured');
	}

	/* From the response, find the breakout we just added */
	const {breakouts} = parseSessionDetailPage(response.data);

	let b = breakouts.find(b =>
		breakout.name === b.name &&
		breakout.location === b.location &&
		breakout.day === b.day &&
		breakout.startSlot.name === b.startSlot.name
	);

	if (!b) {
		console.log(breakouts, breakout);
		throw new Error("Can't find the breakout we just added");
	}

	return b;
}

export async function addImatBreakouts(user, imatMeetingId, breakouts) {

	if (!user.ieeeClient)
		throw new AuthError('Not logged in');

	const imatMeeting = await getImatMeeting(user, imatMeetingId);
	//console.log(imatMeeting);

	breakouts = await Promise.all(breakouts.map((breakout) => addImatBreakout(user, imatMeeting, breakout)));

	return {breakouts};
}

export async function deleteImatBreakouts(user, imatMeetingId, ids) {

	const {ieeeClient} = user;
	if (!ieeeClient)
		throw new AuthError('Not logged in');

	const imatMeeting = await getImatMeeting(user, imatMeetingId);

	const response = await ieeeClient.get(`/${imatMeeting.organizerId}/meeting-detail?p=${imatMeetingId}`);
	const {breakouts} = parseSessionDetailPage(response.data);

	const breakoutsToDelete = [];
	for (const id of ids) {
		const b = breakouts.find(b => b.id === id);
		if (!b)
			throw new NotFoundError(`Breakout ${id} not found`);
		breakoutsToDelete.push(b);
	}

	const params = {
		tz: 420,
		v: 1,
		f3: '',
		f4: 0,
		f2: 'Delete'
	};

	breakouts.forEach(b => params['f5_' + b.formIndex] = b.id);
	breakoutsToDelete.forEach(b => params['f1_' + b.formIndex] = 'on');

	await ieeeClient.post(`/802.11/meeting-detail?p=${imatMeetingId}`, params);

	return ids.length;
}

async function updateImatBreakout(user, imatMeeting, breakout) {

	PropTypes.checkPropTypes(breakoutProps, breakout, 'breakout', 'updateImatBreakout');

	const params = {
		tz: 420,
		v: 1,
		c: breakout.editContext,	// necessary!
		f4: breakout.name,
		f3: breakout.groupId,
		f8: breakout.day,
		f16: breakout.startSlotId,
		f14: breakout.startTime,
		f15: breakout.endSlotId,
		f9: breakout.endTime,
		f2: breakout.location,
		f6: breakoutCredit[breakout.credit],
		f1: breakout.creditOverrideNumerator || 0,
		f0: breakout.creditOverrideDenominator || 0,
		f10: breakout.facilitator || user.Email,
		f12: "OK/Done"
	};
	//console.log(params)

	const response = await user.ieeeClient.post(`/${breakout.editGroupId}/breakout-edit?t=${breakout.id}&p=${imatMeeting.id}`, params);

	if (response.data.search(/<title>IEEE Standards Association - Event detail<\/title>/) === -1) {
		const m = /<div class="field_err">(.*)<\/div>/.exec(response.data);
		throw new Error(m? m[1]: 'An unexpected error occured');
	}

	/* From the response, find the breakout we just update */
	const {breakouts} = parseSessionDetailPage(response.data);
	//console.log(breakouts);

	const b = breakouts.find(b => breakout.id === b.id);
	//console.log(breakout, b);

	return b;
}

export async function updateImatBreakouts(user, imatMeetingId, breakouts) {

	if (!user.ieeeClient)
		throw new AuthError('Not logged in');

	const imatMeeting = await getImatMeeting(user, imatMeetingId);
	//console.log(imatMeeting);

	breakouts = await Promise.all(breakouts.map((breakout) => updateImatBreakout(user, imatMeeting, breakout)))

	return breakouts;
}

function getTimestamp(t) {
	let date = new Date(t);
	return isNaN(date)? null: date;
}

/*
 * Get IMAT breakout attendance
 */
export async function getImatBreakoutAttendance(user, imatMeetingId, breakoutId) {

	const {ieeeClient} = user;
	if (!ieeeClient)
		throw new AuthError('Not logged in');

	const {data} = await ieeeClient.get(`/802.11/breakout-members?t=${breakoutId}&p=${imatMeetingId}`);
	const $ = cheerio.load(data);

	const title = $('div.title').html();
	if (title === "Sign In")
		throw new AuthError('Not logged in');

	if (!title.startsWith('Meeting attendance for'))
		throw new Error('Unexpected page returned by imat.ieee.org');

	const attendance = [];
	$('.b_data_row').each(function (index) {  // each table data row
		var tds = $(this).find('td');
		const parts = tds.eq(1).text().split(',');
		const LastName = parts[0].trim();
		const FirstName = parts.length > 1? parts[1].trim(): '';
		const Name = FirstName? FirstName + ' ' + LastName: LastName;
		const entry = {
			SAPIN: tds.eq(0).text(),
			Name,
			Email: tds.eq(2).text(),
			Timestamp: getTimestamp(tds.eq(3).text()),
			Affiliation: tds.eq(4).text()
		}
		attendance.push(entry);
	});

	return attendance;
}

async function parseImatAttendanceSummary(buffer) {

	const p = await csvParse(buffer, {columns: false, bom: true, encoding: 'latin1'});

	if (p.length === 0)
		throw new Error('Got empty attendance_summary.csv');

	const expected = ['SA PIN', 'Last Name', 'First Name', 'Middle Name', 'Email', 'Affiliation', 'Current Involvement Level'];

	// Row 0 is the header
	if (expected.reduce((r, v, i) => r || v !== p[0][i], false))
		throw new Error(`Unexpected column headings ${p[0].join()}. Expected ${expected.join()}.`);
	p.shift();	// remove header

	return p.map(c => {
		if (isNaN(parseInt(c[0], 10)))
			console.log(c);
		const entry = {
			SAPIN: parseInt(c[0], 10),
			LastName: c[1],
			FirstName: c[2],
			MI: c[3],
			Email: c[4],
			Affiliation: c[5],
			Status: c[6],
			AttendancePercentage: c[7]
		}
		entry.Name = entry.FirstName;
		if (entry.MI)
			entry.Name += ' ' + entry.MI;
		entry.Name += ' ' + entry.LastName;
		return entry;
	});
}

/*
 * Get IMAT attendance summary for a session
 *
 * The session is identified by a start and end date in the form MM/DD/YYYY
 */
export async function getImatAttendanceSummary(user, session) {

	let start = DateTime.fromISO(session.startDate, {zone: session.timezone});
	if (!start.isValid)
		throw new TypeError(`Invalid session start (${session.startDate}) or timezone (${session.timezone})`)
	start = start.toFormat('MM/dd/yyyy');

	let end = DateTime.fromISO(session.endDate, {zone: session.timezone});
	if (!end.isValid)
		throw new TypeError(`Invalid session end (${session.endDate}) or timezone (${session.timezone})`)
	end = end.toFormat('MM/dd/yyyy');

	const {ieeeClient} = user;
	if (!ieeeClient)
		throw new AuthError('Not logged in');

	const response = await ieeeClient.get(`/802.11/attendance-summary.csv?b=${start}&d=${end}`);
	if (response.headers['content-type'] !== 'text/csv')
		throw new AuthError('Not logged in');

	return await parseImatAttendanceSummary(response.data);
}

async function addSession(user, session) {

	const {ieeeClient} = user;
	if (!ieeeClient)
		throw new AuthError('Not logged in');

	const response = await ieeeClient.post(`/${user.Email}/meeting`);
}

function slotDateTime(date, slot) {
	return [
		date.set({hour: slot.startTime.substring(0,2), minute: slot.startTime.substring(3,5)}),
		date.set({hour: slot.endTime.substring(0,2), minute: slot.endTime.substring(3,5)})
	];
}

async function meetingToBreakout(user, imatMeeting, timeslots, committees, meeting, webexMeeting) {

	const sessionStart = DateTime.fromISO(imatMeeting.start, {zone: imatMeeting.timezone});
	const sessionEnd = DateTime.fromISO(imatMeeting.end, {zone: imatMeeting.timezone}).plus({days: 1});
	const start = DateTime.fromISO(meeting.start, {zone: imatMeeting.timezone});
	const end = DateTime.fromISO(meeting.end, {zone: imatMeeting.timezone});
	//console.log(imatMeeting.start, meeting.start)

	// Verify that the meeting is within the date range of the session
	if (start < sessionStart || start > sessionEnd)
		throw new TypeError('Meeting outside date range for session');

	const day = Math.floor(start.diff(sessionStart, 'days').get('day'));
	let startTime = start.toFormat('HH:mm');
	let endTime = end.toFormat('HH:mm');

	// If breakout straddles a day, then end at midnight
	if (end.toISODate() !== start.toISODate())
		endTime = '23:59';

	const breakoutDate = sessionStart.plus({days: day});
	let startSlot, endSlot;

	// Go through slots looking for exact match
	for (const slot of timeslots) {
		const [slotStart, slotEnd] = slotDateTime(breakoutDate, slot);
		if (start >= slotStart && end <= slotEnd) {
			startSlot = slot;
			endSlot = slot;
			break;
		}
	}

	if (!startSlot) {
		// Look for the last slot that starts after the meeting starts
		for (const slot of timeslots) {
			const [slotStart, slotEnd] = slotDateTime(breakoutDate, slot);
			if (start >= slotStart)
				startSlot = slot;
		}
	}

	if (!endSlot) {
		// Look for the first slot that ends before meeting ends
		for (const slot of timeslots) {
			const [slotStart, slotEnd] = slotDateTime(breakoutDate, slot);
			if (end <= slotEnd) {
				endSlot = slot;
				break;
			}
		}
	}

	// If we still don't have a start slot, choose the first (or last) and override time
	if (!startSlot)
		startSlot = timeslots[0];
	if(!endSlot)
		endSlot = timeslots[timeslots.length-1];

	if (!startSlot)
		throw new TypeError("Can't find start slot");

	if (!endSlot)
		throw new TypeError("Can't find end slot");

	// If the startTime/endTime aligns with slot start/end then clear time
	if (startSlot && slotDateTime(breakoutDate, startSlot)[0].toFormat("HH:mm") === startTime)
		startTime = '';
	if (endSlot && slotDateTime(breakoutDate, endSlot)[1].toFormat("HH:mm") === endTime)
		endTime = '';

	let location = meeting.location || '';
	if (meeting.isCancelled)
		location = 'CANCELLED';

	if (!location && meeting.webexAccountId && webexMeeting)
		location = await webexMeetingImatLocation(meeting.webexAccountId, webexMeeting);
	console.log(meeting)
	const [group] = await getGroups({id: meeting.organizationId});
	if (!group)
		throw new TypeError(`Can't find group id=${meeting.organizationId}`);

	const committee = committees.find(c => c.symbol === group.symbol);
	if (!committee)
		throw new TypeError(`Can't find committee symbol=${group.symbol}`);
	const groupId = committee.id;

	let name = meeting.summary;
	name = name.replace(/^802.11/, '');
	name = name.trim();
	if (meeting.isCancelled)
		name = 'CANCELLED - ' + name;

	return {
		name,
		location,
		groupId,
		committee,
		day,
		startSlot,
		startSlotId: startSlot.id,
		endSlot,
		endSlotId: endSlot.id,
		startTime,
		endTime,
		credit: "Zero",
		creditOverideNumerator: 0,
		creditOverideDenominator: 0,
		facilitator: user.Email
	}
}

export async function addImatBreakoutFromMeeting(user, imatMeetingId, meeting, webexMeeting) {
	const {imatMeeting, breakouts, timeslots, committees} = await getImatBreakouts(user, imatMeetingId);

	const breakout = await meetingToBreakout(user, imatMeeting, timeslots, committees, meeting, webexMeeting);

	//console.log('added breakout: ', breakout);
	return addImatBreakout(user, imatMeeting, breakout, timeslots);
}

export async function updateImatBreakoutFromMeeting(user, imatMeetingId, breakoutId, meeting, webexMeeting) {
	const {imatMeeting, breakouts, timeslots, committees} = await getImatBreakouts(user, imatMeetingId);

	const breakout = breakouts.find(b => b.id === breakoutId);
	if (!breakout)
		throw new NotFoundError(`Breakout id=${breakoutId} does not exist for imatMeetingId=${imatMeetingId}`);

	const updatedBreakout = await meetingToBreakout(user, imatMeeting, timeslots, committees, meeting, webexMeeting);
	updatedBreakout.id = breakoutId;
	updatedBreakout.editContext = breakout.editContext;
	updatedBreakout.editGroupId = breakout.editGroupId;

	let doUpdate =
		breakout.name !== updatedBreakout.name ||
		breakout.groupShortName !== updatedBreakout.committee.shortName ||
		breakout.day !== updatedBreakout.day ||
		breakout.location !== updatedBreakout.location ||
		//breakout.facilitator !== updatedBreakout.facilitator ||
		//breakout.credit !== updatedBreakout.creadit ||
		//(breakout.credit === 'Other' &&
		// (breakout.creditOverrideNumerator !== updatedBreakout.creditOverrideNumerator ||
		//  breakout.creditOverrideDenominator !== updatedBreakout.creditOverrideDenominator)) ||
		breakout.startSlotId !== updatedBreakout.startSlotId ||
		breakout.endSlotId !== updatedBreakout.endSlotId ||
		breakout.startTime !== (updatedBreakout.startTime || updatedBreakout.startSlot.startTime) ||
		breakout.endTime !== (updatedBreakout.endTime || updatedBreakout.endSlot.endTime);

	if (doUpdate)
		console.log(breakout, updatedBreakout);

	console.log('IMAT breakout update ' + (doUpdate? 'needed': 'not needed'));

	return doUpdate? updateImatBreakout(user, imatMeeting, updatedBreakout): breakout;
}
