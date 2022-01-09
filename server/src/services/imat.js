/*
 * imat.ieee.org HTML scraping
 */
import { DateTime, Duration } from 'luxon';

const cheerio = require('cheerio')
//const moment = require('moment-timezone')
const csvParse = require('csv-parse/lib/sync')
const rp = require('request-promise-native')

// Convert date to ISO format
function dateToISODate(dateStr) {
	// Date is in format: "11-Dec-2018"
	return DateTime.fromFormat(dateStr, 'dd-MMM-yyyy').toISODate();
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
		throw 'Not logged in'
	}
	else {
		throw 'Unexpected page returned by imat.ieee.org'
	}
}

/*
 * get IMAT meetings
 *
 * Parameters: n = number of entries to get
 */
export async function getImatMeetings(user, n) {
	//console.log(user)

	async function recursivePageGet(meetings, n, page) {
		//console.log('get epolls n=', n)

		var options = {
			url: `https://imat.ieee.org/${user.Email}/meetings?n=${page}`,
			jar: user.ieeeCookieJar
		}
		//console.log(options.url);

		const body = await rp.get(options);

		//console.log(body)
		var meetingsPage = parseMeetingsPage(body);
		var end = n - meetings.length;
		if (end > meetingsPage.length) {
			end = meetingsPage.length;
		}
		meetings = meetings.concat(meetingsPage.slice(0, end));

		if (meetings.length === n || meetingsPage.length === 0)
			return meetings;

		return recursivePageGet(meetings, n, page+1);
	}

	return await recursivePageGet([], n, 1);
}

export async function getImatBreakouts(user, session) {

	const options = {
		url: `https://imat.ieee.org/${session.OrganizerID}/breakouts.csv?p=${session.MeetingNumber}&xls=1`,
		jar: user.ieeeCookieJar,
		resolveWithFullResponse: true,
		simple: false
	}

	console.log(session, options.url)
	const response = await rp.get(options);
	if (response.statusCode !== 200)
		throw response.statusCode === 404? 'Not found': 'Unexpected result'
	if (response.headers['content-type'] !== 'text/csv')
		throw 'Not logged in'

	const p = csvParse(response.body, {columns: false});
	if (p.length === 0)
		throw 'Got empty breakouts.csv';

	const expected = ['Breakout ID', 'Start Timeslot Name', 'End Timeslot Name', 'Start', 'End', 
		'Location', 'Group Symbol', 'Breakout Name', 'Credit', 'Override Credit Numerator', 'Override Credit Denominator',
		'Event Day', 'Facilitator Web Id'];

	// Row 0 is the header
	if (expected.reduce((r, v, i) => v !== p[0][i], false))
		throw `Unexpected column headings ${p[0].join()}. Expected ${expected.join()}.`
	p.shift();

	return p.map(c => {
		const eventDay = c[11];	// day offset from start of session
		//const eventDate = moment.tz(session.Start, session.TimeZone).add(eventDay, 'days')
		const eventDate = DateTime.fromJSDate(session.Start, {zone: session.TimeZone}).plus(Duration.fromObject({days: eventDay}));
		return {
			BreakoutID: c[0],
			Day: c[11],
			StartSlot: c[1],
			EndSlot: c[2],
			//Start: eventDate.set({hours: c[3].substr(0, 2), minutes: c[3].substr(3)}).format(),
			//End: eventDate.set({hours: c[4].substr(0, 2), minutes: c[4].substr(3)}).format(),
			Start: eventDate.set({hour: c[3].substr(0, 2), minute: c[3].substr(3)}).toISO(),
			End: eventDate.set({hour: c[4].substr(0, 2), minute: c[4].substr(3)}).toISO(),
			Location: c[5],
			Group: c[6],
			Name: c[7],
			Credit: c[8],
			OverrideCreditNumerator: c[9],
			OverrideCreditDenominator: c[10],
			Facilitator: c[12],
		}
	});
}

function getTimestamp(t) {
	let date = new Date(t);
	return isNaN(date)? null: date;
}

/*
 * Get IMAT breakout attendance
 */
export async function getImatBreakoutAttendance(user, breakoutNumber, meetingNumber) {

	const options = {
		url: `https://imat.ieee.org/802.11/breakout-members?t=${breakoutNumber}&p=${meetingNumber}`,
		jar: user.ieeeCookieJar
	}
	const body = await rp.get(options);
	const $ = cheerio.load(body);

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
		throw 'Not logged in'
	}
	else {
		throw 'Unexpected page returned by imat.ieee.org'
	}
}

/*
 * Get IMAT attendance summary for a session
 *
 * The session is identified by a start and end date in the form MM/DD/YYYY
 */
export async function getImatAttendanceSummary(user, session) {

	//const start = moment(session.Start).tz(session.TimeZone).format('MM/DD/YYYY');
	//const end = moment(session.End).tz(session.TimeZone).format('MM/DD/YYYY');

	let start = DateTime.fromJSDate(session.Start, {zone: session.TimeZone});
	if (!start.isValid)
		throw new TypeError(`Invalid session Start (${session.Start}) or TimeZone (${session.TimeZone})`)
	start = start.toFormat('MM/dd/yyyy');

	let end = DateTime.fromJSDate(session.End, {zone: session.TimeZone});
	if (!end.isValid)
		throw new TypeError(`Invalid session End (${session.End}) or TimeZone (${session.TimeZone})`)
	end = end.toFormat('MM/dd/yyyy');

	const options = {
		url: `https://imat.ieee.org/802.11/attendance-summary.csv?b=${start}&d=${end}`,
		jar: user.ieeeCookieJar,
		resolveWithFullResponse: true,
		simple: false
	}
	console.log(options.url);

	const response = await rp.get(options);
	if (response.statusCode !== 200)
		throw response.statusCode === 404? 'Not found': 'Unexpected result'
	if (response.headers['content-type'] !== 'text/csv')
		throw 'Not logged in'

	const p = csvParse(response.body, {columns: false});
	if (p.length === 0)
		throw 'Got empty attendance_summary.csv';

	const expected = ['SA PIN', 'Last Name', 'First Name', 'Middle Name', 'Email', 'Affiliation', 'Current Involvement Level']

	// Row 0 is the header
	if (expected.reduce((r, v, i) => v !== p[0][i], false))
		throw `Unexpected column headings ${p[0].join()}. Expected ${expected.join()}.`

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