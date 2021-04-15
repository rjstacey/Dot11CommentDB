 /*
  * Handle spreadsheets from Adrian's members database
  */
'use strict'

const ExcelJS = require('exceljs')

const membersDatabaseHeader = [
	'MemberID', 'LMSCID', 'SApin', 'LastName', 'FirstName', 'MI', 'Affiliation', 'Email', 'Employer',
	'StreetLine1', 'StreetLine2', 'City', 'State', 'Zip', 'Country', 'Phone', 'Fax',
	'Status', 'NewStatus', 'Override', 'OverrideReason', 'StatusChangeReason', 'StatusChangeTime', 'CountPlenaries',
	'CountInterims', 'CountQualifyingMeetings', 'CountEligibleBallots', 'CountBallots', 'ExVoter'
]

function parseMembersDatabaseEntry(u) {
	let entry = {
		MwmberID: parseInt(u[0], 10),
		SAPIN: parseInt(u[2], 10),
		LastName: u[3] || '',
		FirstName: u[4] || '',
		MI: u[5] || '',
		Affiliation: u[6] || '',
		Email: u[7] || '',
		Employer: u[8] || '',
		Status: u[17] || '',
		StatusChangeOverride: u[19] || 0,
		StatusChangeDate: new Date(u[22])
	}
	entry.Name = entry.FirstName;
	if (entry.MI)
		entry.Name += ' ' + entry.MI
	entry.Name += ' ' + entry.LastName;

	if (isNaN(entry.SAPIN))
		entry.SAPIN = 0;

	return entry
}

export async function parseMembersSpreadsheet(buffer) {

	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer);

	const rows = []; 	// an array of arrays
	workbook.getWorksheet(1).eachRow(row => rows.push(row.values.slice(1, membersDatabaseHeader.length+1)));

	if (rows.length === 0)
		throw 'Got empty members file'

	// Check the column names to make sure we have the right file
	if (membersDatabaseHeader.reduce((r, v, i) => r || typeof rows[0][i] !== 'string' || rows[0][i].search(new RegExp(v, 'i')) === -1, false))
		throw `Unexpected column headings:\n${p[0].join(', ')}\n\nExpected:\n${membersDatabaseHeader.join(', ')}`
	rows.shift()	// remove column heading row

	// Parse each row
	return rows.map(parseMembersDatabaseEntry);
}

const sapinsHeader = ['MemberID', 'SApin', 'DateAdded']

function parseSAPINsEntry(u) {
	let entry = {
		MemberID: parseInt(u[0], 10),
		SAPIN: parseInt(u[1], 10),
		DateAdded: new Date(u[2])
	}
	return entry
}

export async function parseSAPINsSpreadsheet(buffer) {

	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer);

	const rows = [] 	// an array of arrays
	workbook.getWorksheet(1).eachRow(row => rows.push(row.values.slice(1, sapinsHeader.length+1)));

	if (rows.length === 0)
		throw 'Got empty sapins file'

	// Check the column names to make sure we have the right file
	if (sapinsHeader.reduce((r, v, i) => r || typeof rows[0][i] !== 'string' || rows[0][i].search(new RegExp(v, 'i')) === -1, false))
		throw `Unexpected column headings:\n${p[0].join(', ')}\n\nExpected:\n${sapinsHeader.join(', ')}`
	rows.shift()	// remove column heading row

	// Parse each row
	return rows.map(parseSAPINsEntry);
}

const emailsHeader = ['MemberID', 'Email', 'Primary', 'DateAdded', 'Broken']

function parseEmailsEntry(u) {
	let entry = {
		MemberID: parseInt(u[0], 10),
		Email: u[1] || '',
		Primary: u[2] || 0,
		DateAdded: new Date(u[3]),
		Broken: u[4] || 0
	}
	return entry
}

export async function parseEmailsSpreadsheet(buffer) {

	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer);

	const rows = []; 	// an array of arrays
	workbook.getWorksheet(1).eachRow(row => rows.push(row.values.slice(1, emailsHeader.length+1)));

	if (rows.length === 0)
		throw 'Got empty emails file'

	// Check the column names to make sure we have the right file
	if (emailsHeader.reduce((r, v, i) => r || typeof row[0][i] !== 'string' || row[0][i].search(new RegExp(v, 'i')) === -1, false))
		throw `Unexpected column headings:\n${p[0].join(', ')}\n\nExpected:\n${emailsHeader.join(', ')}`
	rows.shift()	// remove column heading row

	// Parse each row
	return rows.map(parseEmailsEntry);
}