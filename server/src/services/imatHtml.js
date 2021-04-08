/*
 * imat.ieee.org HTML scraping
 */
const cheerio = require('cheerio')
const moment = require('moment-timezone')
const csvParse = require('csv-parse/lib/sync')

// Convert date string to UTC
function parseDateTime(dateStr, timeZone) {
	// Date is in format: "11-Dec-2018" and time zone is in another column
	return moment.tz(dateStr, 'DD-MMM-YYYY', timeZone).format();
}

export function parseMeetingsPage(body) {
	const $ = cheerio.load(body);

	// If we get the "Sessions" page then parse the data table
	// (use cheerio, which provides jQuery parsing)
	if ($('div.title').length && $('div.title').html() == "Sessions") {
		//console.log('GOT Sessions page');
		const sessions = [];
		$('.b_data_row').each(function (index) {  // each table data row
			var tds = $(this).find('td');
			var s = {};
			s.TimeZone = tds.eq(5).text();
			s.Start = parseDateTime($(tds.eq(0)).text(), s.TimeZone);
			s.End = parseDateTime($(tds.eq(1)).text(), s.TimeZone);
			s.Type = tds.eq(3).text();
			s.Name = tds.eq(4).text();
			var p = tds.eq(6).html().match(/meeting-detail\?p=(\d+)/);
			s.MeetingNumber = p? parseInt(p[1]): '';
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

export function parseBreakouts(buffer, meeting) {

	const p = csvParse(buffer, {columns: false});
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
		const eventDate = moment.tz(meeting.Start, meeting.TimeZone).add(eventDay, 'days')
		return {
			BreakoutID: c[0],
			Day: c[11],
			StartSlot: c[1],
			EndSlot: c[2],
			Start: eventDate.set({hours: c[3].substr(0, 2), minutes: c[3].substr(3)}).format(),
			End: eventDate.set({hours: c[4].substr(0, 2), minutes: c[4].substr(3)}).format(),
			Location: c[5],
			Group: c[6],
			Name: c[7],
			Credit: c[8],
			OverrideCreditNumerator: c[9],
			OverrideCreditDenominator: c[10],
			Facilitator: c[12]
		}
	});
}

function getTimestamp(t) {
	let date = new Date(t);
	return isNaN(date)? null: date;
}
export function parseBreakoutAttendance(body) {
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
				FirstName,
				LastName,
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