 /*
  * Handle spreadsheets from Adrian's members database
  */
import ExcelJS from 'exceljs';

import type { MemberBasic, StatusChangeEntry, ContactEmail, ContactInfo } from './members';
/*
 * Valid status mappings
 */
const validStatus = {
	'obsolete': 'Obsolete',
	'non-voter': 'Non-Voter',
	'voter': 'Voter',
	'potential voter': 'Potential Voter',
	'aspirant': 'Aspirant',
	'exoffico': 'ExOfficio'
};

const correctStatus = (status: string) => validStatus[status.toLowerCase()] || status;

const membersDatabaseHeader = [
	'MemberID', 'LMSCID', 'SApin', 'LastName', 'FirstName', 'MI', 'Affiliation', 'Email', 'Employer',
	'StreetLine1', 'StreetLine2', 'City', 'State', 'Zip', 'Country', 'Phone', 'Fax',
	'Status', 'NewStatus', 'Override', 'OverrideReason', 'StatusChangeReason', 'StatusChangeTime', 'CountPlenaries',
	'CountInterims', 'CountQualifyingMeetings', 'CountEligibleBallots', 'CountBallots', 'ExVoter'
];

function parseMembersDatabaseEntry(u: any[]) {
	const contactInfo: ContactInfo = {
		StreetLine1: u[9] || '',
		StreetLine2: u[10] || '',
		City: u[11] || '',
		State: u[12] || '',
		Zip: u[13] || '',
		Country: u[14] || '',
		Phone: u[15] || '',
		Fax: u[16] || ''
	};

	const statusChangeDate = u[22]? u[22].toISOString(): null;

	const entry: MemberBasic = {
		Name: '',
		MemberID: parseInt(u[0], 10),
		SAPIN: parseInt(u[2], 10),
		LastName: u[3] || '',
		FirstName: u[4] || '',
		MI: u[5] || '',
		Affiliation: u[6] || '',
		Email: u[7] || '',
		Employer: u[8] || '',
		Status: correctStatus(u[17]),
		StatusChangeOverride: u[19] || 0,
		StatusChangeDate: statusChangeDate,
		ContactInfo: contactInfo //JSON.stringify(contactInfo)
	};

	entry.Name = entry.FirstName;
	if (entry.MI)
		entry.Name += ' ' + entry.MI
	entry.Name += ' ' + entry.LastName;

	if (isNaN(entry.SAPIN))
		entry.SAPIN = 0;

	return entry;
}

export async function parseMembersSpreadsheet(buffer: Buffer) {

	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer);

	const rows: any[] = []; 	// an array of arrays
	workbook.getWorksheet(1).eachRow(row => Array.isArray(row.values) && rows.push(row.values.slice(1, membersDatabaseHeader.length+1)));

	if (rows.length === 0)
		throw new TypeError('Got empty members file');

	// Check the column names to make sure we have the right file
	if (membersDatabaseHeader.reduce((r, v, i) => r || typeof rows[0][i] !== 'string' || rows[0][i].search(new RegExp(v, 'i')) === -1, false))
		throw new TypeError(`Unexpected column headings:\n${rows[0].join(', ')}\n\nExpected:\n${membersDatabaseHeader.join(', ')}`);
	rows.shift();	// remove column heading row

	// Parse each row
	return rows.map(parseMembersDatabaseEntry);
}

const sapinsHeader = ['MemberID', 'SApin', 'DateAdded']

function parseSAPINsEntry(u: any[]) {
	let entry = {
		MemberID: parseInt(u[0], 10),
		SAPIN: parseInt(u[1], 10),
		DateAdded: u[2]? u[2].toISOString(): null
	};
	return entry;
}

export async function parseSAPINsSpreadsheet(buffer: Buffer) {

	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer);

	const rows: any[] = [] 	// an array of arrays
	workbook.getWorksheet(1).eachRow(row => Array.isArray(row.values) && rows.push(row.values.slice(1, sapinsHeader.length+1)));

	if (rows.length === 0)
		throw new TypeError('Got empty sapins file');

	// Check the column names to make sure we have the right file
	if (sapinsHeader.reduce((r, v, i) => r || typeof rows[0][i] !== 'string' || rows[0][i].search(new RegExp(v, 'i')) === -1, false))
		throw new TypeError(`Unexpected column headings:\n${rows[0].join(', ')}\n\nExpected:\n${sapinsHeader.join(', ')}`);
	rows.shift();	// remove column heading row

	// Parse each row
	return rows.map(parseSAPINsEntry);
}

const emailsHeader = ['MemberID', 'Email', 'Primary', 'DateAdded', 'Broken']

function parseEmailsEntry(u: any[]) {
	let entry: Omit<ContactEmail, "id"> & { MemberID?: number } = {
		MemberID: parseInt(u[0], 10),
		Email: u[1] || '',
		DateAdded: u[3]? u[3].toISOString(): null,
		Primary: u[2]? true: false,
		Broken: u[4]? true: false
	};
	return entry;
}

export async function parseEmailsSpreadsheet(buffer: Buffer) {

	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer);

	const rows: any[] = []; 	// an array of arrays
	workbook.getWorksheet(1).eachRow(row => Array.isArray(row.values) && rows.push(row.values.slice(1, emailsHeader.length+1)));

	if (rows.length === 0)
		throw new TypeError('Got empty emails file')

	// Check the column names to make sure we have the right file
	if (emailsHeader.reduce((r, v, i) => r || typeof rows[0][i] !== 'string' || rows[0][i].search(new RegExp(v, 'i')) === -1, false))
		throw new TypeError(`Unexpected column headings:\n${rows[0].join(', ')}\n\nExpected:\n${emailsHeader.join(', ')}`);
	rows.shift();	// remove column heading row

	// Parse each row
	return rows.map(parseEmailsEntry);
}

const historyHeader = [
	'ID', 'MemberID', 'Voter', 'Date', 'MeetingID', 'MeetingType', 'BallotID', 
	'NewStatus', 'OldStatus', 'StatusChangeReason', 'Reversed'
];

function parseHistoryEntry(u: any[]) {
	let entry: Omit<StatusChangeEntry, "id"> & { MemberID?: number } = {
		MemberID: parseInt(u[1], 10),
		Date: u[3]? u[3].toISOString(): null,
		NewStatus: correctStatus(u[7] || ''),
		OldStatus: correctStatus(u[8] || ''),
		Reason: u[9] || ''
	};
	return entry;
}

export async function parseHistorySpreadsheet(buffer: Buffer) {

	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer);

	const rows: any[] = []; 	// an array of arrays
	workbook.getWorksheet(1).eachRow(row => Array.isArray(row.values) && rows.push(row.values.slice(1, historyHeader.length+1)));

	if (rows.length === 0)
		throw new TypeError('Got empty status change file')

	// Check the column names to make sure we have the right file
	if (historyHeader.reduce((r, v, i) => r || typeof rows[0][i] !== 'string' || rows[0][i].search(new RegExp(v, 'i')) === -1, false))
		throw new TypeError(`Unexpected column headings:\n${rows[0].join(', ')}\n\nExpected:\n${historyHeader.join(', ')}`);
	rows.shift();	// remove column heading row

	// Parse each row
	return rows.map(parseHistoryEntry);
}