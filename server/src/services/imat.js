/*
 * imat.ieee.org HTML scraping
 */
import PropTypes from 'prop-types';
import { DateTime, Duration } from 'luxon';
import cheerio from 'cheerio';
import { csvParse, AuthError, NotFoundError } from '../utils';
import { getTelecons, updateTelecon } from './telecons';

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

export function parseMeetingsPage(body) {
	const $ = cheerio.load(body);

	// If we get the "Sessions" page then parse the data table
	// (use cheerio, which provides jQuery-like parsing)
	if ($('div.title').length && $('div.title').html() == "Sessions") {
		//console.log('GOT Sessions page');
		const sessions = [];
		$('.b_data_row').each(function(index) {  // each table data row
			var tds = $(this).find('td');
			var s = {};
			s.timezone = tds.eq(5).text();
			s.start = dateToISODate(tds.eq(0).text());
			s.end = dateToISODate(tds.eq(1).text());
			s.type = tds.eq(3).text();
			s.name = tds.eq(4).text();
			var p = tds.eq(6).html().match(/\/([^\/]+)\/meeting-detail\?p=(\d+)/);
			s.organizerId = p? p[1]: '';
			s.id = p? parseInt(p[2]): 0;
			s.type = s.type? s.type[0].toLowerCase(): '';
			sessions.push(s);
		});
		return sessions;
	}

	if ($('div.title').length && $('div.title').html() == "Sign In") {
		// If we get the "Sign In" page then the user is not logged in
		throw new AuthError('Not logged in');
	}

	throw new Error('Unexpected page returned by imat.ieee.org');
}

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
export async function getImatMeetings(user, n) {
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

	const response = await ieeeClient.get(`https://imat.ieee.org/${user.Email}/meeting.csv`, {responseType: 'arraybuffer'});

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
	const $ = cheerio.load(body);

	// If we get the "Add a new Meeting" page then parse the table
	// (use cheerio, which provides jQuery-like parsing)
	if ($('div.title').length && $('div.title').html() == "Add a new Meeting") {

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
			const id = $(this).attr('value');
			const p = $(this).html().split('&nbsp;');
			timeslots[id].endTime = p[1];
		});
		timeslots = Object.values(timeslots);	// convert to array

		return {committees, timeslots}
	}

	if ($('div.title').length && $('div.title').html() == "Sign In") {
		// If we get the "Sign In" page then the user is not logged in
		throw new AuthError('Not logged in');
	}

	throw new Error('Unexpected page returned by imat.ieee.org');
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

	const response = await ieeeClient.get(`https://imat.ieee.org/${group}/committees.csv`, {responseType: 'text/csv'});
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

export function parseImatBreakoutsPage(body) {
	const $ = cheerio.load(body);
	let m;

	// If we get the "Session detail" page then parse the data table
	// (use cheerio, which provides jQuery-like parsing)
	if ($('div.title').length && $('div.title').html() == "Session detail") {
		console.log('Got Session detail page');
		m = body.match(/<td>(.*) Time Zone<\/td>/);
		if (!m)
			throw Error("Can't find timezone");
		const timezone = m[1];
		m = body.match(/<td>(\d{2}-[a-zA-Z]{3}-\d{4}) - (\d{2}-[a-zA-Z]{3}-\d{4})<\/td>/);
		if (!m)
			throw Error("Can't find session dates");
		const sessionStart = DateTime.fromFormat(m[1], 'dd-MMM-yyyy', {zone: timezone});
		const breakouts = [];
		const timeslots = {};
		$('.b_data_row').each(function(index) {  // each table data row
			var tds = $(this).find('td');
			//console.log(tds.length)
			if (tds.length === 4) {	// Timeslots table
				const t = {};
				t.name = tds.eq(0).text();
				t.startTime = tds.eq(1).text();
				t.endTime = tds.eq(1).text();
				m = tds.eq(3).html().match(/timeslot-edit\?t=(\d+)&amp;p=(\d+)/);
				if (!m)
					throw Error("Can't parse timeslots table links column");
				t.id = parseInt(m[1]);
				t.meetingId = parseInt(m[2]);
				timeslots[t.name] = t;
			}
			if (tds.length === 9) {	// Breakouts table
				var b = {};
				const timePeriod = tds.eq(0).html();
				m = timePeriod.match(/(.+)&nbsp;[a-zA-Z]{3}, (\d{2}-[a-zA-Z]{3}-\d{4})<br>(\d{2}:\d{2})&nbsp;-&nbsp;(\d{2}:\d{2})/);
				if (!m) 
					throw Error("Can't parse Time Period column; got " + timePeriod)
				const slotsRange = m[1];
				const eventDate = DateTime.fromFormat(m[2], 'dd-MMM-yyyy', {zone: timezone});
				b.day = eventDate.diff(sessionStart, 'days').get('days');
				b.start = eventDate.set({hour: m[3].substring(0, 2), minute: m[3].substring(3)}).toISO();
				b.end = eventDate.set({hour: m[4].substring(0, 2), minute: m[4].substring(3)}).toISO();

				m = slotsRange.match(/(.+)&nbsp;-&nbsp;(.+)/);
				b.startSlot = m? m[1]: slotsRange;
				b.endSlot = m? m[2]: slotsRange;
				const startSlot = timeslots[b.startSlot];
				const endSlot = timeslots[b.endSlot];
				b.startSlotId = startSlot? startSlot.id: null;
				b.endSlotId = endSlot? endSlot.id: null;

				b.location = tds.eq(1).text();
				b.facilitatorName = tds.eq(2).text();
				b.groupShortName = tds.eq(3).text();
				b.name = tds.eq(4).text();
				b.credit = tds.eq(5).text();
				//console.log(tds.eq(7).html())
				m = tds.eq(7).html().match(/breakout-edit\?t=(\d+)&amp;p=(\d+)/);
				if (!m)
					throw Error("Can't parse breakouts table links column");
				b.id = parseInt(m[1]);
				b.meetingId = parseInt(m[2]);
				breakouts.push(b);
			}
		});
		return breakouts;
	}

	if ($('div.title').length && $('div.title').html() == "Sign In") {
		// If we get the "Sign In" page then the user is not logged in
		throw new AuthError('Not logged in');
	}

	throw new Error('Unexpected page returned by imat.ieee.org');
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
			startSlot: c[1],
			endSlot: c[2],
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

export async function getImatBreakouts(user, meetingId) {

	const {ieeeClient} = user;
	if (!ieeeClient)
		throw new AuthError('Not logged in');

	const session = await getImatMeeting(user, meetingId);
	//console.log(session);
	
	let response;
	response = await ieeeClient.get(`https://imat.ieee.org/${session.organizerId}/breakouts.csv?p=${meetingId}&xls=1`, {responseType: 'text/csv'});
	if (response.headers['content-type'] !== 'text/csv')
		throw new AuthError('Not logged in');

	const breakouts = await parseImatBreakoutsCsv(session, response.data);

	/*response = await ieeeClient.get(`https://imat.ieee.org/${session.organizerId}/timeslot.csv?p=${session.id}&xls=1`, {responseType: 'text/csv'});
	if (response.headers['content-type'] !== 'text/csv')
		throw new AuthError('Not logged in');

	const timeslots = await parseImatTimeslotCsv(session, response.data);*/

	response = await ieeeClient.get(`https://imat.ieee.org/802.11/committees.csv`, {responseType: 'text/csv'});
	if (response.headers['content-type'] !== 'text/csv')
		throw new AuthError('Not logged in');
	const committees = await parseImatCommitteesCsv(response.data);

	const {data} = await ieeeClient.get(`https://imat.ieee.org/802.11/breakout?p=${meetingId}`);
	const {timeslots, committees: committees2} = parseAddMeetingPage(data);

	//console.log(timeslots, committees, committees2)

	/* The committees in the committees.csv file do not have the same ID as that used
	 * for the committee options in the "Add a new meeting" form. The committee options
	 * label is symbol + ' ' + name trucated at around 62 characters. */
	for (const c1 of committees) {
		for (const c2 of committees2) {
			if (c2.symbolName.search((c1.symbol + ' ' + c1.name).substring(0,60)) === 0)
				c1.id = c2.id;
		}
	}

	return {session, breakouts, timeslots, committees};
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

async function addImatBreakout(user, session, breakout) {

	PropTypes.checkPropTypes(breakoutProps, breakout, 'breakout', 'addImatBreakout');

	const teleconId = breakout.teleconId;

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
	const response = await ieeeClient.post(`https://imat.ieee.org/${session.organizerId}/breakout?p=${session.id}`, params);
	//console.log(response)

	if (response.data.search(/<title>IEEE Standards Association - Event detail<\/title>/) === -1) {
		const m = response.data.match(/<div class="field_err">(.*)<\/div>/);
		throw new Error(m? m[1]: 'An unexpected error occured');
	}

	/* From the response, find the breakout we just added */
	const breakouts = parseImatBreakoutsPage(response.data);
	//console.log(breakouts);

	let b = breakouts.find(b => breakout.name === b.name && breakout.location === b.location && breakout.startSlotId === b.startSlotId);
	//console.log(breakout, b);

	/* Link to telecon */
	if (b) {
		if (teleconId)
			await updateTelecon(teleconId, {imatMeetingId: session.id, imatBreakoutId: b.id});
		b = {...b, teleconId};
	}

	return b;
}

export async function addImatBreakouts(user, meetingId, breakouts) {

	if (!user.ieeeClient)
		throw new AuthError('Not logged in');

	const session = await getImatMeeting(user, meetingId);
	//console.log(session);

	breakouts = await Promise.all(breakouts.map(breakout => addImatBreakout(user, session, breakout)));
	const telecons = await getTelecons({id: breakouts.map(b => b.teleconId)});
	return {breakouts, telecons};
}

export async function deleteImatBreakout(user, meetingId, breakoutId) {
	if (!user.ieeeClient)
		throw new AuthError('Not logged in');
}

async function updateImatBreakout(user, session, breakout) {

	PropTypes.checkPropTypes(breakoutProps, breakout, 'breakout', 'updateImatBreakout');

	const teleconId = breakout.teleconId;

	const params = {
		tz: 420,
		v: 1,
		f4: breakout.name,
		f3: breakout.groupId,
		f8: breakout.day,
		f16: breakout.startSlotId,
		f14: breakout.startTime,
		f15: breakout.endSlotId,
		f9: breakout.endTime,
		f2: breakout.location,
		f6: breakoutCredit[breakout.credit],
		f10: breakout.facilitator || user.Email,
		f12: "OK/Done"
	};

	const response = await user.ieeeClient.post(`https://imat.ieee.org/${session.organizerId}/breakout-edit?p=${session.id}&t=${breakout.id}`, params);

	/* From the response, find the breakout we just update */
	const breakouts = parseImatBreakoutsPage(response.data);
	//console.log(breakouts);

	const b = breakouts.find(b => breakout.id === b.id);
	//console.log(breakout, b);

	/* Link to telecon */
	if (b) {
		if (teleconId)
			await updateTelecon(teleconId, {imatMeetingId: session.id, imatBreakoutId: b.id});
		b = {...b, teleconId};
	}

	return b;
}

export async function updateImatBreakouts(user, meetingId, breakouts) {

	if (!user.ieeeClient)
		throw new AuthError('Not logged in');

	const session = await getImatMeeting(user, meetingId);
	//console.log(session);

	breakouts = await Promise.all(breakouts.map(breakout => updateImatBreakout(user, session, breakout)));
	const telecons = await getTelecons({id: breakouts.map(b => b.teleconId)});
	return {breakouts, telecons};
}

function getTimestamp(t) {
	let date = new Date(t);
	return isNaN(date)? null: date;
}

/*
 * Get IMAT breakout attendance
 */
export async function getImatBreakoutAttendance(user, meetingId, breakoutId) {

	const {ieeeClient} = user;
	if (!ieeeClient)
		throw new AuthError('Not logged in');

	const {data} = await ieeeClient.get(`https://imat.ieee.org/802.11/breakout-members?t=${breakoutId}&p=${meetingId}`);
	const $ = cheerio.load(data);

	// If we get the "Meeting attendance for" page then parse the data table
	// (use cheerio, which provides jQuery parsing)
	if ($('div.title').length && $('div.title').html().startsWith('Meeting attendance for')) {
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
				//FirstName,
				//LastName,
				Email: tds.eq(2).text(),
				Timestamp: getTimestamp(tds.eq(3).text()),
				Affiliation: tds.eq(4).text()
			}
			attendance.push(entry);
		});
		return attendance;
	}
	else if ($('div.title').length && $('div.title').html() == "Sign In") {
		// If we get the "Sign In" page then the user is not logged in
		throw new AuthError('Not logged in');
	}
	else {
		throw new Error('Unexpected page returned by imat.ieee.org');
	}
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

	let start = DateTime.fromJSDate(session.Start, {zone: session.TimeZone});
	if (!start.isValid)
		throw new TypeError(`Invalid session start (${session.start}) or timezone (${session.timezone})`)
	start = start.toFormat('MM/dd/yyyy');

	let end = DateTime.fromJSDate(session.End, {zone: session.timezone});
	if (!end.isValid)
		throw new TypeError(`Invalid session end (${session.end}) or timezone (${session.timezone})`)
	end = end.toFormat('MM/dd/yyyy');

	const {ieeeClient} = user;
	if (!ieeeClient)
		throw new AuthError('Not logged in');

	const response = await ieeeClient.get(`https://imat.ieee.org/802.11/attendance-summary.csv?b=${start}&d=${end}`);
	if (response.headers['content-type'] !== 'text/csv')
		throw new AuthError('Not logged in');

	return await parseImatAttendanceSummary(response.data);
}

async function addSession(user, session) {

	const {ieeeClient} = user;
	if (!ieeeClient)
		throw new AuthError('Not logged in');

	const response = await ieeeClient.post(`https://imat.ieee.org/${user.Email}/meeting`);
}
