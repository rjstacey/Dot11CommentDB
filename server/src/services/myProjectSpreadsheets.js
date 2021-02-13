/*
 * Handle MyProject spreadsheet files
 */
 
const ExcelJS = require('exceljs')
const csvParse = require('csv-parse/lib/sync')
import {processHtml} from './legacyCommentSpreadsheet'

const myProjectCommentsHeader = [
	'Comment ID', 'Date', 'Comment #', 'Name', 'Email', 'Phone', 'Style', 'Index #', 'Classification', 'Vote',
	'Affiliation', 'Category', 'Page', 'Subclause','Line','Comment','File','Must be Satisfied','Proposed Change',
	'Disposition Status', 'Disposition Detail', 'Other1', 'Other2', 'Other3'
]

function parseMyProjectComment(c) {
	let comment = {
		C_Index: c[0],								// Comment ID
		CommenterSAPIN: null,
		CommenterName: c[3],						// Name
		CommenterEmail: c[4],						// Email
		Category: c[11]? c[11].charAt(0): '',		// Category: first letter only (G, T or E)
		C_Page: c[12] || '',						// Page
		C_Clause: c[13] || '',						// Subclause
		C_Line: c[14] || '',						// Line
		Comment: c[15] || '',						// Comment
		ProposedChange: c[18] || '',				// Proposed Change
		MustSatisfy: c[17].toLowerCase() === 'yes'	// Must be Satisfied
	}
	comment.Clause = comment.C_Clause
	comment.Page = parseFloat(comment.C_Page) + parseFloat(comment.C_Line)/100
	if (isNaN(comment.Page)) {comment.Page = 0}

	return comment
}

export async function parseMyProjectComments(startCommentId, buffer, isExcel) {

	var p = [] 	// an array of arrays
	if (isExcel) {
		var workbook = new ExcelJS.Workbook()
		await workbook.xlsx.load(buffer)

		workbook.getWorksheet(1).eachRow(row => {
			p.push(row.values.slice(1, 26))
		})
	}
	else {
		p = csvParse(buffer, {columns: false})
	}
	//console.log(p)

	if (p.length === 0) {
		throw 'Got empty comments file'
	}

	// Check the column names to make sure we have the right file
	// The CSV from MyProject has # replaced by ., so replace '#' with '.' (in the regex this matches anything)
	var expected = myProjectCommentsHeader.map(r => r.replace('#', '.'))
	if (expected.reduce((r, v, i) => r || typeof p[0][i] !== 'string' || p[0][i].search(new RegExp(v, 'i')) === -1, false)) {
		throw `Unexpected column headings:\n${p[0].join(', ')}\n\nExpected:\n${myProjectCommentsHeader.join(', ')}`
	}
	p.shift()	// remove column heading row

	// Parse each row and assign CommentID
	return p.map((c, i) => ({CommentID: startCommentId + i, ...parseMyProjectComment(c)}))
}


const mapResnStatus = {
	A: 'ACCEPTED',
	V: 'REVISED',
	J: 'REJECTED'
}

/*
 * Add approved resolutions to an existing MyProject comment spreadsheet
 */
export async function myProjectAddResolutions(buffer, dbComments, res) {

	let workbook = new ExcelJS.Workbook()
	try {
		await workbook.xlsx.load(buffer)
	}
	catch(err) {
		throw "Invalid workbook: " + err
	}

	let worksheet = workbook.getWorksheet(1);
	if (!worksheet) {
		'Unexpected file format; worksheet not found'
	}

	// Check the column names to make sure we have the right file
	let row = worksheet.getRow(1);
	if (!row) {
		throw 'Unexpected file format; header row not found'
	}
	const header = row.values.slice(1, 26);

	if (myProjectCommentsHeader.reduce((r, v, i) => r || typeof header[i] !== 'string' || header[i].search(new RegExp(v, 'i')) === -1, false)) {
		throw `Unexpected column headings:\n${header.join(', ')}\n\nExpected:\n${myProjectCommentsHeader.join(', ')}`
	}

	worksheet.eachRow((row, i) => {
		if (i === 1) {	// skip header
			return
		}
		let comment = parseMyProjectComment(row.values.slice(1, 26));

		/* Find comment with matching identifier. If can't be found by identifier then match on comment fields. */
		let dbC = dbComments.find(c => c.C_Index === comment.C_Index);
		//if (!dbC) {
		//	dbC = matchCommentByEllimination(comment, dbComments);
		//}
		if (dbC && dbC.ApprovedByMotion) {
			//console.log(`found ${comment.C_Index}`)
			row.getCell(20).value = mapResnStatus[dbC.ResnStatus] || '';
			row.getCell(21).value = processHtml(dbC.Resolution);
		}
	});

	try {
		await workbook.xlsx.write(res)
	}
	catch(err) {
		throw "Unable to regenerate workbook: " + err
	}
}

const myProjectResultsHeader = [
	'Name', 'EMAIL', 'Affiliation(s)', 'Voter Classification', 'Current Vote', 'Comments'
]

export async function parseMyProjectResults(buffer, isExcel) {
	var p = [] 	// an array of arrays
	if (isExcel) {
		var workbook = new ExcelJS.Workbook()
		await workbook.xlsx.load(buffer)

		workbook.getWorksheet(1).eachRow(row => {
			p.push(row.values.slice(1, myProjectResultsHeader.length + 1))
		})
	}
	else {
		throw "Can't handle .csv file"
	}

	if (p.length < 2) {
		throw 'File has less than 2 rows'
	}

	p.shift()	// PAR #
	if (myProjectResultsHeader.reduce((r, v, i) => r || typeof p[0][i] !== 'string' || p[0][i].search(new RegExp(v, 'i')) === -1, false)) {
		throw `Unexpected column headings ${p[0].join()}. Expected ${myProjectResultsHeader.join()}.`
	}
	p.shift()	// remove heading row

	const results = p.map(c => {
		return {
			Name: c[0],
			Email: c[1],
			Affiliation: c[2],
			Vote: c[4]
		}
	})

	return results;
}


/*
 * MyProject Roster
 */
const myProjectRosterHeader = [
	'SA PIN', 'Last Name', 'First Name', 'Middle Name', 'Email Address', 'Street Address/PO Box', 'City',
	'State/Province', 'Postal Code', 'Country', 'Phone',
	'Employer', 'Affiliation', 'Officer Role', 'Involvement Level'
]

const mapInvolvementLevelToStatus = {
	'Aspirant Member': 'Aspirant',
	'Corresponding Member': 'Other',
	'Member': 'Other',
	'Nearly Member': 'Other',
	'Non-Voting Member': 'Other',
	'Observer': 'Observer',
	'Potential Member': 'Potential Voter',
	'Voting Member': 'Voter'
};

const mapStatus = (involvementLevel) => (mapInvolvementLevelToStatus[involvementLevel] || 'Other');

function parseMyProjectMember(u) {
	let user = {
		SAPIN: parseInt(u[0]),
		LastName: u[1] || '',
		FirstName: u[2] || '',
		MI: u[3] || '',
		Email: u[4] || '',
		Employer: u[11] || '',
		Affiliation: u[12] || '',
		OfficerRole: u[13] || '',
		Status: mapStatus(u[14])
	}
	user.Name = user.FirstName;
	if (user.MI)
		user.Name += ' ' + user.MI
	user.Name += ' ' + user.LastName;

	return user
}

export async function parseMyProjectRosterSpreadsheet(buffer) {

	var p = [] 	// an array of arrays
	var workbook = new ExcelJS.Workbook()
	await workbook.xlsx.load(buffer)

	workbook.getWorksheet(1).eachRow(row => {
		p.push(row.values.slice(1, myProjectRosterHeader.length+1))
	})

	if (p.length === 0) {
		throw 'Got empty roster file'
	}

	// Check the column names to make sure we have the right file
	// The CSV from MyProject has # replaced by ., so replace '#' with '.' (in the regex this matches anything)
	if (myProjectRosterHeader.reduce((r, v, i) => r || typeof p[0][i] !== 'string' || p[0][i].search(new RegExp(v, 'i')) === -1, false)) {
		throw `Unexpected column headings:\n${p[0].join(', ')}\n\nExpected:\n${myProjectRosterHeader.join(', ')}`
	}
	p.shift()	// remove column heading row

	// Parse each row and assign CommentID
	return p.map((u, i) => parseMyProjectMember(u));
}
