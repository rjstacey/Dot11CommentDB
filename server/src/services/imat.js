/*
 * imat.ieee.org HTML scraping
 */
import { DateTime, Duration } from 'luxon';
import cheerio from 'cheerio';
import { csvParse, AuthError, NotFoundError } from '../utils';

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
		$('.b_data_row').each(function (index) {  // each table data row
			var tds = $(this).find('td');
			var s = {};
			s.TimeZone = tds.eq(5).text();
			s.Start = dateToISODate(tds.eq(0).text());
			s.End = dateToISODate(tds.eq(1).text());
			s.Type = tds.eq(3).text();
			s.Name = tds.eq(4).text();
			var p = tds.eq(6).html().match(/\/([^\/]+)\/meeting-detail\?p=(\d+)/);
			s.OrganizerID = p? p[1]: '';
			s.MeetingNumber = p? parseInt(p[2]): 0;
			s.Type = s.Type? s.Type[0].toLowerCase(): '';
			sessions.push(s);
		});
		return sessions;
	}
	else if ($('div.title').length && $('div.title').html() == "Sign In") {
		// If we get the "Sign In" page then the user is not logged in
		throw new AuthError('Not logged in');
	}
	else {
		throw new Error('Unexpected page returned by imat.ieee.org');
	}
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
		OrganizerID: c[0],
		MeetingNumber: parseInt(c[1], 10),
		OrganizerSymbol: c[2],
		OrganizerName: c[3],
		Name: c[4],
		Type: c[5],
		Start: csvDateToISODate(c[6]),
		End: csvDateToISODate(c[7]),
		TimeZone: luxonTimeZone(c[8]),
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

async function getImatMeeting(user, meetingNumber) {
	const meetings = await getImatMeetings(user);
	const meeting = meetings.find(m => m.MeetingNumber === meetingNumber);
	if (!meeting)
		throw new NotFoundError('Meeting does not exist');
	return meeting;
}

async function parseImatCommitteesCsv(buffer) {
	const p = await csvParse(buffer, {columns: false, bom: true, encoding: 'latin1'});

	if (p.length === 0)
		throw new Error('Empty committees.csv file');

	const expected = ['Committee ID', 'Parent Committee ID', 'Committee Type', 'Committee Symbol', 'Committee Short Name', 'Committee Name'];

	// Row 0 is the header
	if (expected.reduce((r, v, i) => v !== p[0][i], false))
		throw new Error(`Unexpected column headings ${p[0].join()}. Expected ${expected.join()}.`);
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


async function parseImatBreakoutsCsv(session, buffer) {
	const p = await csvParse(buffer, {columns: false, bom: true, encoding: 'latin1'});

	if (p.length === 0)
		throw new Error('Empty breakouts.csv file');

	const expected = [
		'Breakout ID', 'Start Timeslot Name', 'End Timeslot Name', 'Start', 'End', 
		'Location', 'Group Symbol', 'Breakout Name', 'Credit', 'Override Credit Numerator', 'Override Credit Denominator',
		'Event Day', 'Facilitator Web Id'
	];

	// Row 0 is the header
	if (expected.reduce((r, v, i) => v !== p[0][i], false))
		throw new Error(`Unexpected column headings ${p[0].join()}. Expected ${expected.join()}.`);
	p.shift();

	return p.map(c => {
		const eventDay = c[11];	// day offset from start of session
		const eventDate = DateTime.fromISO(session.Start, {zone: session.TimeZone}).plus(Duration.fromObject({days: eventDay}));
		return {
			id: parseInt(c[0], 10),
			startSlot: c[1],
			endSlot: c[2],
			day: c[11],
			start: eventDate.set({hour: c[3].substr(0, 2), minute: c[3].substr(3)}).toISO(),
			end: eventDate.set({hour: c[4].substr(0, 2), minute: c[4].substr(3)}).toISO(),
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

async function parseImatTimeslotCsv(session, buffer) {
	const p = await csvParse(buffer, {columns: false, bom: true, encoding: 'latin1'});

	if (p.length === 0)
		throw new Error('Empty timeslot.csv file');

	const expected = ['Event ID', 'Timeslot ID', 'Timeslot Name', 'Start Time', 'End Time'];

	// Row 0 is the header
	if (expected.reduce((r, v, i) => v !== p[0][i], false))
		throw new Error(`Unexpected column headings ${p[0].join()}. Expected ${expected.join()}.`);
	p.shift();

	return p.map(c => ({
		id: parseInt(c[1], 10),
		name: c[2],
		startTime: c[3],
		endTime: c[4],
	}));
}

export async function getImatBreakouts(user, meetingNumber) {

	const {ieeeClient} = user;
	if (!ieeeClient)
		throw new AuthError('Not logged in');

	const session = await getImatMeeting(user, meetingNumber);
	console.log(session);
	
	let response;
	response = await ieeeClient.get(`https://imat.ieee.org/${session.OrganizerID}/breakouts.csv?p=${session.MeetingNumber}&xls=1`, {responseType: 'text/csv'});
	if (response.headers['content-type'] !== 'text/csv')
		throw new AuthError('Not logged in');

	const breakouts = await parseImatBreakoutsCsv(session, response.data);

	response = await ieeeClient.get(`https://imat.ieee.org/${session.OrganizerID}/timeslot.csv?p=${session.MeetingNumber}&xls=1`, {responseType: 'text/csv'});
	if (response.headers['content-type'] !== 'text/csv')
		throw new AuthError('Not logged in');

	const timeslots = await parseImatTimeslotCsv(session, response.data);

	response = await ieeeClient.get(`https://imat.ieee.org/802.11/committees.csv`, {responseType: 'text/csv'});
	if (response.headers['content-type'] !== 'text/csv')
		throw new AuthError('Not logged in');

	const committees = await parseImatCommitteesCsv(response.data);

	return {session, breakouts, timeslots, committees};
}

async function addBreakout(user, session, breakout) {

	const {ieeeClient} = user;
	if (!ieeeClient)
		throw new AuthError('Not logged in');

	const response = await ieeeClient.post(`https://imat.ieee.org/${session.OrganizerID}/breakout?p=${session.MeetingNumber}`);
}

function getTimestamp(t) {
	let date = new Date(t);
	return isNaN(date)? null: date;
}

/*
 * Get IMAT breakout attendance
 */
export async function getImatBreakoutAttendance(user, meetingNumber, breakoutNumber) {

	const {ieeeClient} = user;
	if (!ieeeClient)
		throw new AuthError('Not logged in');

	const {data} = await ieeeClient.get(`https://imat.ieee.org/802.11/breakout-members?t=${breakoutNumber}&p=${meetingNumber}`);
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
	if (expected.reduce((r, v, i) => v !== p[0][i], false))
		throw new Error(`Unexpected column headings ${p[0].join()}. Expected ${expected.join()}.`);

	// Column 7 should have the session date in the form "MM-YYYY"

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
		throw new TypeError(`Invalid session Start (${session.Start}) or TimeZone (${session.TimeZone})`)
	start = start.toFormat('MM/dd/yyyy');

	let end = DateTime.fromJSDate(session.End, {zone: session.TimeZone});
	if (!end.isValid)
		throw new TypeError(`Invalid session End (${session.End}) or TimeZone (${session.TimeZone})`)
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