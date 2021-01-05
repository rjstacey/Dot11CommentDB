'use strict';

var csvParse = require('csv-parse/lib/sync')
var xlsx = require('xlsx')
const ExcelJS = require('exceljs')
const db = require('../util/database')
const rp = require('request-promise-native')

/*
function stringToHex(s) {
	var hex, i;

	var result = "";
	for (i=0; i<s.length; i++) {
    	hex = s.charCodeAt(i).toString(16);
    	result += ("000"+hex).slice(-4) + ' ';
    }
	return result
}
*/

const epollCommentsHeader = [
	'Index', 'Date', 'SA PIN', 'Name', 'Comment', 'Category', 'Page Number', 'Subclause', 'Line Number', 'Proposed Change'//, 'Must Be Satisfied'
]

function parseEpollComments(startCommentId, pollCommentsCsv) {
	var cid = startCommentId;

	const p = csvParse(pollCommentsCsv, {columns: false});
	if (p.length === 0) {
		throw 'Got empty poll-comments.csv';
	}

	// Row 0 is the header
	if (epollCommentsHeader.reduce((r, v, i) => r || v !== p[0][i], false)) {
		throw `Unexpected column headings ${p[0].join()}. Expected ${epollCommentsHeader.join()}.`
	}
	p.shift();

	return p.map(c => {
		var e = {
			CommentID: cid++,
			C_Index: parseInt(c[0]),
			CommenterSAPIN: c[2],
			CommenterName: c[3],
			Comment: c[4],
			Category: c[5]? c[5].charAt(0): '',   // First letter only (G, T or E)
			C_Page: c[6]? c[6].trim(): '',
			C_Clause: c[7]? c[7].trim(): '',
			C_Line: c[8]? c[8].trim(): '',
			Page: parseFloat(c[6]) + parseFloat(c[8])/100,
			Clause: c[7]? c[7]: '',
			ProposedChange: c[9]? c[9]: '',
			MustSatisfy: !!(c[10] === '1')
		};
		if (isNaN(e.Page)) {e.Page = 0}
		return e;
	})
}

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

async function parseMyProjectComments(startCommentId, buffer, isExcel) {

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
async function myProjectAddResolutions(workbook, dbComments) {

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
	})
}


function parseCommentsSheet(commentsSheet, comments, updateComments, newComments, newResolutions) {

	var commentsSheetArray = xlsx.utils.sheet_to_json(commentsSheet)
	if (commentsSheetArray.length === 0) {
		throw 'Comments worksheet has no rows'
	}

	var highestIndex = 0;
	var unmatchedComments = [];
	comments.forEach(c => {

		// Find the highest comment index in case we need to append new comments
		if (c.C_Index > highestIndex) {
			highestIndex = c.C_Index;
		}

		/* Find entry in comments worksheet that matches current entry.
		 * If a cell is blank in the worksheet, it will have an undefined entry in the row object.
		 * For Page and Line numbers convert to integer.
		 *   Sometimes commenters enter fractional line numbers or fractional page numbers.
		 *   They have been stored in raw (text) form in this database, but have been rounded to an integer in Adrian's database.
		 * For Comment and Proposed Change compare only basic text.
		 *   Line endings might differ: database has \n line endings while spreadsheet has \r\n line endings (so remove line endings).
		 *   Only check ASCII characters. */
		//const pattern = /[^A-Za-z0-9-+",:\/ ]|\r|\n/gm
		const pattern = /[^\x00-\x7f]|\r?\n|\r/gm
		var i = commentsSheetArray.findIndex(cs => 
				(c.CommenterName === cs['Commenter'] &&
				 (c.Category === cs['Type of Comment']) &&
				 (!cs.hasOwnProperty('Clause Number(C)') || c.C_Clause.substring(0, cs['Clause Number(C)'].length) === cs['Clause Number(C)']) &&
				 (!cs.hasOwnProperty('Page(C)') || Math.round(parseFloat(c.C_Page)) === parseInt(cs['Page(C)'])) &&
				 (!cs.hasOwnProperty('Line(C)') || Math.round(parseFloat(c.C_Line)) === parseInt(cs['Line(C)'])) &&
				 (!cs.hasOwnProperty('Comment') || c.Comment.replace(pattern, '') === cs['Comment'].replace(pattern, '')) &&
				 (!cs.hasOwnProperty('Proposed Change') || c.ProposedChange.replace(pattern, '') === cs['Proposed Change'].replace(pattern, ''))
				))

		if (i >= 0) {
			var cs = commentsSheetArray[i];
			commentsSheetArray.splice(i, 1) // remove entry

			// See if any of the comment fields need updating
			var u = {PrevCommentID: c.CommentID};
			if (c.CommentID !== cs['CID']) {
				u.CommentID = cs['CID']
			}
			if (c.CommentGroup !== cs['Comment Group']) {
				u.CommentGroup = cs['Comment Group']
			}
			if (cs['Clause'] && c.Clause !== cs['Clause']) {
				c.Clause = cs['Clause']
			}
			var page = parseFloat(cs['Page'])
			if (page && c.Page !== page) {
				c.Page = page
			}
			//console.log('match ', u)
			if (Object.keys(u).length > 1) {
				updateComments.push(u)
			}

			var n = parseResolution(cs)
			if (n) {
				newResolutions.push(n)
			}
		}
		else {
			unmatchedComments.push(c)
		}
	})

	// The remaining entries in commentsSheetArray did not match an existing comment
	commentsSheetArray.forEach(cs => {
		var p = cs['Page(C)']? parseInt(cs['Page(C)']): 0
		var l = cs['Line(C)']? parseInt(cs['Line(C)']): 0
		newComments.push({
			C_Index: ++highestIndex,
			CommentID: cs['CID'],
			CommenterName: cs['Commenter'],
			Category: cs['Type of Comment'],
			C_Page: cs['Page(C)']? cs['Page(C)'].trim(): '',
			C_Line: cs['Line(C)']? cs['Line(C)'].trim(): '',
			Page: p + l/100,
			C_Clause: cs['Clause Number(C)'] || '',
			Clause: cs['Clause'] || '',
			Comment: cs['Comment'] || '',
			ProposedChange: cs['Proposed Change'] || '',
			CommentGroup: cs['Comment Group'] || '',
		});
		var n = parseResolution(cs);
		if (n) {
			newResolutions.push(n)
		}
	})

	console.log('unmatchedComments: ', unmatchedComments)
	console.log('commentsSheetArray: ', commentsSheetArray)
	const pattern = /[^\x00-\x7f]|\r?\n|\r/gm
	unmatchedComments.forEach(c => {
		var i = commentsSheetArray.findIndex(cs => {
			var r = false
			console.log('CID=', c.CommentID, 'vs', cs['CID'])
			if (c.CommenterName === cs['Commenter']) {console.log('Commenter')}
			if (c.Category === cs['Type of Comment']) {console.log('Category')}
			if (!cs.hasOwnProperty('Clause Number(C)') || c.C_Clause.substring(0, cs['Clause Number(C)'].length) === cs['Clause Number(C)']) {console.log('Clause')}
			if (!cs.hasOwnProperty('Page(C)') || c.C_Page === cs['Page(C)'].trim()) {console.log('Page')}
			if (!cs.hasOwnProperty('Line(C)') || c.C_Line === cs['Line(C)'].trim()) {console.log('Line')}
			if (!cs.hasOwnProperty('Comment') || c.Comment.replace(pattern, '') === cs['Comment'].replace(pattern, '')) {console.log('Comment')}
			if (!cs.hasOwnProperty('Proposed Change') || c.ProposedChange.replace(pattern, '') === cs['Proposed Change'].replace(pattern, '')) {console.log('Proposed')}
			return r
		})
	})

	const fs = require('fs');
	fs.writeFile("c.txt", 'unmatchedComments: ' + JSON.stringify(unmatchedComments) + 'commentsSheetArray: ' + JSON.stringify(commentsSheetArray), (err) => {!err || console.log(err)})
}

const legacyCommentsHeader = [
	'CID', 'Commenter', 'LB', 'Draft', 'Clause Number(C)', 'Page(C)', 'Line(C)', 'Type of Comment', 'Part of No Vote',
	'Page', 'Line', 'Clause', 'Duplicate of CID', 'Resn Status', 'Assignee', 'Submission', 'Motion Number',
	'Comment', 'Proposed Change', 'Resolution',	'Owning Ad-hoc', 'Comment Group', 'Ad-hoc Status', 'Ad-hoc Notes',
	'Edit Status', 'Edit Notes', 'Edited in Draft', 'Last Updated', 'Last Updated By'
]

async function parseLegacyCommentsSpreadsheet(buffer, sheetName) {

	var workbook = new ExcelJS.Workbook()
	await workbook.xlsx.load(buffer)
	console.log(workbook)
	const worksheet = workbook.getWorksheet(sheetName)
	if (!worksheet) {
		let sheets = []
		workbook.eachSheet((worksheet, sheetId) => sheets.push(worksheet.name))
		throw `Workbook does not have a "${sheetName}" worksheet. It does have the following worksheets: ${sheets.join(', ')}.`
	}
	//console.log(worksheet.rowCount)

	// Row 0 is the header
	var header = worksheet.getRow(1).values;
	header.shift();	// Remove column 0
	if (legacyCommentsHeader.reduce((r, v, i) => r || v !== header[i], false)) {
		throw `Unexpected column headings ${header.join()}. Expected ${legacyCommentsHeader.join()}.`
	}

	var comments = [];
	worksheet.eachRow(row => {
		const entry = legacyCommentsHeader.reduce((entry, key, i) => {entry[key] = row.getCell(i+1).text || ''; return entry}, {})
		comments.push(entry)
	});
	comments.shift();	// remove header
	//console.log(comments.slice(0, 4))

	return comments
}

function processHtml(html) {
	if (typeof html !== 'string') return ''

	html = html.replace(/<p\w[^>]*>(.*)<\/p[^>]*>/g, (match, entity) => `${entity}\n`);
	html = html.replace(/<[^>]+>/g, '');

	var translate_re = /&(nbsp|amp|quot|lt|gt);/g;
	var translate = {
		"nbsp": " ",
		"amp" : "&",
		"quot": "\"",
		"lt"  : "<",
		"gt"  : ">"
	};
	html = html.replace(translate_re, (match, entity) => translate[entity]);

	return html
}

function genLegacyWorksheetTable(sheet, ballotId, doc, comments) {

	let columns = {
		'CID': {width: 6, value: c => c.CID},
		'Commenter': {width: 14, outlineLevel: 1, value: c => c.CommenterName},
		'LB': {width: 8, outlineLevel: 1, value: ballotId},
		'Draft': {width: 8, outlineLevel: 1, value: doc},
		'Clause Number(C)': {width: 11, outlineLevel: 1, value: c => c.C_Clause},
		'Page(C)': {width: 8, outlineLevel: 1, value: c => c.C_Page},
		'Line(C)': {width: 8, outlineLevel: 1, value: c => c.C_Line},
		'Type of Comment': {width: 10, outlineLevel: 1, value: c => c.Category},
		'Part of No Vote': {width: 10, outlineLevel: 1, value: c => c.MustSatisfy? "Yes": "No"},
		'Page': {width: 8, value: c => c.Page},
		'Line': {width: 7, outlineLevel: 1, value: c => c.C_Line},
		'Clause': {width: 11, value: c => c.Clause},
		'Duplicate of CID': {width: 10},
		'Resn Status': {width: 8, value: c => c.ResnStatus || ''},
		'Assignee': {width: 11, outlineLevel: 1, value: c => c.AssigneeName || ''},
		'Submission': {width: 12, outlineLevel: 1, value: c => c.Submission || ''},
		'Motion Number': {width: 9, outlineLevel: 1, value: c => c.ApprovedByMotion || ''},
		'Comment': {width: 25, value: c => c.Comment},
		'Proposed Change': {width: 25, value: c => c.ProposedChange},
		'Resolution': {width: 25, value: c => (c.ResnStatus? mapResnStatus[c.ResnStatus] + '\n': '') + processHtml(c.Resolution)},
		'Owning Ad-hoc': {width: 9},
		'Comment Group': {width: 10, value: c => c.CommentGroup || ''},
		'Ad-hoc Status': {width: 10, value: c => c.Status || ''},
		'Ad-hoc Notes': {width: 25, value: c => c.Notes || ''},
		'Edit Status': {width: 8, value: c => c.EditStatus || ''},
		'Edit Notes': {width: 25, value: c => c.EditNotes || ''},
		'Edited in Draft': {width: 9, value: c => c.EditInDraft || ''},
		'Last Updated': {width: 15, outlineLevel: 1},
		'Last Updated By': {outlineLevel: 1}
	};

	const colNames = Object.keys(columns);

	let table = {
		name: 'MyTable',
		ref: 'A1',
		headerRow: true,
		totalsRow: false,
		style: {
			theme: 'TableStyleLight15',
			showRowStripes: false,
		},
		columns: colNames.map(name => ({name, filterButton: true})),
		rows: comments.map(c => colNames.map(key => {
			let col = columns[key]
			if (typeof col.value === 'function') {
				return col.value(c)
			}
			else if (col.value) {
				return col.value
			}
			return ''
		}))
	};

	sheet.addTable(table)

	// Adjust column width, outlineLevel and style
	const borderStyle = {style:'thin', color: {argb:'33333300'}}
	let i = 0
	for (let key of colNames) {
		let col = columns[key]
		i++
		if (col.width) {
			sheet.getColumn(i).width = col.width
		}
		if (col.outlineLevel) {
			sheet.getColumn(i).outlineLevel = col.outlineLevel
		}
		sheet.getColumn(i).font = {name: 'Arial', size: 10, family: 2}
		sheet.getColumn(i).alignment = {wrapText: true, vertical: 'top'}
		/*sheet.getColumn(i).border = {
			top: borderStyle, 
			left: borderStyle, 
			bottom: borderStyle, 
			right: borderStyle
		}*/
	}

	// Table header is frozen
	sheet.views = [{state: 'frozen', xSplit: 0, ySplit: 1}];
}

const comparisons = [
	(dbC, sC) => dbC.CommenterName === sC['Commenter'],
	(dbC, sC) => dbC.Category === sC['Type of Comment'],
	(dbC, sC) => (dbC.C_Clause === sC['Clause Number(C)'] ||
			(dbC.C_Clause.replace(/[0]+$/g, '') === sC['Clause Number(C)']) ||	// Legacy strips trailing 0
			(sC['Clause Number(C)'].length > 10 && dbC.C_Clause.substring(0, sC['Clause Number(C)'].length) === sC['Clause Number(C)'])),		// Legacy might trucate
	(dbC, sC) => dbC.C_Page === sC['Page(C)'] || Math.round(parseFloat(dbC.C_Page)) === parseInt(sC['Page(C)']),	// Legacy converts page to int
	(dbC, sC) => dbC.C_Line === sC['Line(C)'] || Math.round(parseFloat(dbC.C_Line)) === parseInt(sC['Line(C)']),	// Legacy converts line to int
	(dbC, sC) => dbC.Comment.length === sC['Comment'].length,				// number of characters match
	(dbC, sC) => dbC.ProposedChange.length === sC['Proposed Change'].length,
	(dbC, sC) => dbC.Comment === sC['Comment'],								// actual text matches
	(dbC, sC) => dbC.ProposedChange === sC['Proposed Change']
];

function findMatchByEliminationUsingTheseComparisons(dbC, sheetComments, comparisons) {
	let scr = sheetComments;
	for (let comp of comparisons) {
		scr = scr.filter(sC => comp(dbC, sC))
		if (scr.length === 0)
			return null
		if (scr.length === 1)
			return scr[0]
	}
	return scr[0] // duplicate comments, choose one
}

/*
 * Find match by elimination, running through a set of comparisons. If a match is not found the
 * order of the comparisons is changed. We change the order because sometimes entries in the
 * spreadsheet have been changed and differ from the orginal comment.
 */
function findMatchByElimination(dbC, sheetComments) {
	const comps = comparisons.slice()
	for (let i = 0; i < comparisons.length; i++) {
		let sC = findMatchByEliminationUsingTheseComparisons(dbC, sheetComments, comps)
		if (sC)
			return sC
		comps.push(comps.shift())
	}
	return null
}

/*
 * Successivly match columns, elimating rows that don't match as we go
 * Once we are down to one row, that is the match.
 * The idea is to first match columns that aren't likely to have issues and then use additional columns as needed.
 */
function matchByElimination(sheetComments, dbComments) {

	if (sheetComments.length < dbComments.length) {
		throw `Spreadsheet has ${sheetComments.length} comments; less than number comments, ${dbComments.length}, in the database.`
	}

	/* For the Comment and Proposed Change columns, compare only basic text.
	 *   Line endings might differ: database has \n line endings while spreadsheet has \r\n line endings.
	 *   Only compare ASCII characters that are not control characters. */
	const pattern = /[^\x20-\x7f]/gm
	sheetComments.forEach(c => {
		c['Comment'] = c['Comment'].replace(pattern, '')
		c['Proposed Change'] = c['Proposed Change'].replace(pattern, '')
	});
	dbComments.forEach(c => {
		c['Comment'] = c['Comment'].replace(pattern, '')
		c['ProposedChange'] = c['ProposedChange'].replace(pattern, '')
	});

	const comps = comparisons.slice()
	for (let i = 0; i < comparisons.length; i++) {
		let matched = []				// paired dbComments and sheetComments
		let dbCommentsRemaining = []	// dbComments with no match
		let sheetCommentsRemaining = sheetComments.slice()
		dbComments.forEach(dbC => {
			let sC = findMatchByEliminationUsingTheseComparisons(dbC, sheetComments, comps)
			if (sC) {
				matched.push({dbComment: dbC, sheetComment: sC})
				const i = sheetCommentsRemaining.findIndex(c => c === sC)
				sheetCommentsRemaining.splice(i, 1)
			}
			else {
				dbCommentsRemaining.push(dbC)
			}
		});
		if (dbCommentsRemaining.length === 0)
			return [matched, dbCommentsRemaining, sheetCommentsRemaining]
		comps.push(comps.shift())
	}

	return [[], dbComments, sheetComments]
}

/*
 * Try to find a match for each comment in turn
 */
function matchPerfect(sheetComments, dbComments) {

	/* For the Comment and Proposed Change columns, compare only basic text.
	 *   Line endings might differ: database has \n line endings while spreadsheet has \r\n line endings.
	 *   Only compare ASCII characters that are not control characters. */
	const pattern = /[^\x20-\x7f]/gm
	for (let c of sheetComments) {
		c['Comment'] = c['Comment'].replace(pattern, '')
		c['Proposed Change'] = c['Proposed Change'].replace(pattern, '')
	}
	for (let c of dbComments) {
		c['Comment'] = c['Comment'].replace(pattern, '')
		c['ProposedChange'] = c['ProposedChange'].replace(pattern, '')
	}

	let matched = []				// paired dbComments and sheetComments
	let dbCommentsRemaining = []	// dbComments with no match
	let sheetCommentsRemaining = sheetComments.slice()
	for (let dbC of dbComments) {

		// The reducer function runs through each of the comparisons and as long as it passes (returns true)
		// it continues. If a comparisong fails the result fails.
		const i = sheetCommentsRemaining.findIndex(sC => comparisons.reduce((acc, comp) => acc && comp(dbC, sC), true))
		if (i >= 0) {
			matched.push({dbComment: dbC, sheetComment: sheetCommentsRemaining[i]})
			sheetCommentsRemaining.splice(i, 1)
		}
		else {
			dbCommentsRemaining.push(dbC)
		}
	}

	return [matched, dbCommentsRemaining, sheetCommentsRemaining]
}

/*
 * Match by comment ID
 */
function matchCID(sheetComments, dbComments) {
	let matched = []				// paired dbComments and sheetComments
	let dbCommentsRemaining = []	// dbComments with no match
	let sheetCommentsRemaining = sheetComments.slice()
	for (let dbC of dbComments) {
		const i = sheetCommentsRemaining.findIndex(sC => parseInt(sC['CID']) === dbC.CommentID)
		if (i >= 0) {
			matched.push({dbComment: dbC, sheetComment: sheetCommentsRemaining[i]})
			sheetCommentsRemaining.splice(i, 1)
		}
		else {
			dbCommentsRemaining.push(dbC)
		}
	}

	return [matched, dbCommentsRemaining, sheetCommentsRemaining]
}

function commentUpdate(toUpdate, c, cs) {
	var u = {}

	if (toUpdate.includes('cid') && c.CommentID !== cs['CID']) {
		u.CommentID = cs['CID']
	}
	if (toUpdate.includes('comment')) {
		if (cs['Clause'] && c.Clause !== cs['Clause']) {
			u.Clause = cs['Clause']
		}
		const page = parseFloat(cs['Page'])
		if (page && c.Page !== page) {
			u.Page = page
		}
	}
	if (toUpdate.includes('commentgroup') && c.CommentGroup !== cs['Comment Group']) {
		u.CommentGroup = cs['Comment Group']
	}
	if (toUpdate.includes('adhoc') && c.AdHoc !== cs['Owning Ad-hoc']) {
		u.AdHoc = cs['Owning Ad-hoc']
	}

	if (Object.keys(u).length) {
		u.id = c.id
		return u
	}

	return null
}

function resolutionUpdate(toUpdate, c, cs) {
	var n = {}

	if (toUpdate.includes('cid')) {
		n.CommentID = cs['CID'];
	}

	if (toUpdate.includes('assignee')) {
		n.AssigneeName = cs['Assinee'] || '';
	}

	if (toUpdate.includes('resolution')) {
		n.ResnStatus = cs['Resn Status'] || '';
		n.Resolution = cs['Resolution'] || '';
		n.ApprovedByMotion = cs['Motion Number'] || '';
	}

	if (toUpdate.includes('editing')) {
		n.EditStatus = cs['Edit Status'] || '';
		n.EditNotes = cs['Edit Notes'] || '';
		n.EditInDraft = cs['Edited in Draft'] || '';
	}

	if (Object.keys(n).length) {
		n.comment_id = c.id;
		n.id = c.resolution_id;
		return n;
	}

	return null;
}

const GET_COMMENTS_SQL =
	'SELECT ' +
		'b.BallotID, ' +
		'c.*, ' +
		'(SELECT COUNT(*) FROM resolutions AS r WHERE c.id = r.comment_id) AS ResolutionCount, ' +
		'IF((SELECT COUNT(*) FROM resolutions AS r WHERE c.id = r.comment_id) > 1, ' + 
			'CONCAT(CONVERT(c.CommentID, CHAR), ".", CONVERT(r.ResolutionID, CHAR)), ' + 
			'CONVERT(c.CommentID, CHAR)) AS CID, ' +
		'r.id as resolution_id, r.ResolutionID, r.AssigneeSAPIN, r.ResnStatus, r.Resolution, r.Submission, r.ReadyForMotion, r.ApprovedByMotion, ' + 
		'r.EditStatus, r.EditInDraft, r.EditNotes, r.Notes, ' +
		'results.Vote, ' +
		'CASE WHEN users.Name IS NULL THEN r.AssigneeName ELSE users.Name END AS AssigneeName ' +
	'FROM ballots b JOIN comments c ON b.id=c.ballot_id ' +
		'LEFT JOIN resolutions AS r ON c.id = r.comment_id ' +
		'LEFT JOIN results ON b.id = results.ballot_id AND c.CommenterSAPIN = results.SAPIN ' +
		'LEFT JOIN users ON r.AssigneeSAPIN = users.SAPIN ';

const GET_COMMENTS_SUMMARY_SQL =
	'SELECT COUNT(*) AS Count, MIN(CommentID) AS CommentIDMin, MAX(CommentID) AS CommentIDMax ' +
	'FROM ballots b JOIN comments c ON b.id=c.ballot_id WHERE b.BallotID=?';

const GET_RESOLUTIONS_SQL =
	'SELECT ' +
		'r.id, b.BallotID, c.CommentID, r.ResolutionID, r.AssigneeSAPIN, r.ResnStatus, r.Resolution, r.Submission, r.ReadyForMotion, r.ApprovedByMotion, ' + 
		'r.EditStatus, r.EditInDraft, r.EditNotes, r.Notes, ' +
		'users.Name AS AssigneeName ' +
	'FROM ballots b JOIN comments c ON b.id=c.ballot_id JOIN resolutions r ON c.id=r.comment_id ' +
		'LEFT JOIN users ON r.AssigneeSAPIN = users.SAPIN ';

const DELETE_COMMENTS_SQL = 
	'DELETE c, r ' +
		'FROM ballots b JOIN comments c ON c.ballot_id=b.id ' +
			'JOIN resolutions r ON r.comment_id=c.id ' +
		'WHERE b.BallotID=?;';

function getComments(ballotId) {
	return db.query(GET_COMMENTS_SQL + ' WHERE b.BallotID=? ORDER BY c.CommentID;', [ballotId])
}

async function updateComment(ballotId, commentId, comment) {

	if (Object.keys(comment).length !== 0) {
		let SQL = db.format("UPDATE comments SET ? WHERE (BallotID=? AND CommentID=?); ", [comment, ballotId, commentId])
		if (comment.BallotID) {
			ballotId = comment.BallotID
		}
		if (comment.CommentID) {
			commentId = comment.CommentID
		}
		SQL += db.format("SELECT * FROM comments WHERE (BallotID=? AND CommentID=?)", [ballotId, commentId])
		const results = await db.query(SQL)
		return results[1][0]
	}
	else {
		// Nothing to do
		return {}
	}
}

async function updateComments(ballotId, commentIds, comments) {
	if (!Array.isArray(commentIds) || !Array.isArray(comments) || commentIds.length !== comments.length) {
		throw 'Expect array parameters of the same length for commentIds and comments'
	}
	console.log(commentIds, comments)
	const updatedComments = await Promise.all(commentIds.map((commentId, i) => updateComment(ballotId, commentId, comments[i])))
	console.log(updatedComments)
	return {
		commentIds,
		updatedComments
	}
}

async function setStartCommentId(ballotId, startCommentId) {
	/* To avoid duplicate keys, we convert key with offset to a negative number and the convert later to positive number
	 */
	const SQL = db.format(
		'START TRANSACTION;' +
		'SET @ballotId = ?;' +
		'SET @startCommentId = ?;' +
		'SET @offset = @startCommentId - (SELECT MIN(CommentID) FROM comments WHERE BallotID=@ballotId);' +
		'UPDATE comments SET CommentID = (CommentID + @offset)*-1 WHERE BallotID=@ballotId;' +
		'UPDATE resolutions SET CommentID = (CommentID + @offset)*-1 WHERE BallotID=@ballotId;' +
		'UPDATE comments SET CommentID = CommentID*-1 WHERE BallotID=@ballotId;' +
		'UPDATE resolutions SET CommentID = CommentID*-1 WHERE BallotID=@ballotId;' +
		'COMMIT;',
		[ballotId, startCommentId]);
	const results = await db.query(SQL);
	return getComments(ballotId);
}

function updateResolutionSQL(resolution) {
	const entry = {
		BallotID: resolution.BallotID,
		CommentID: resolution.CommentID,
		ResolutionID: resolution.ResolutionID,
		ResnStatus: resolution.ResnStatus,
		Resolution: resolution.Resolution,
		AssigneeSAPIN: resolution.AssigneeSAPIN,
		AssigneeName: resolution.AssigneeName,
		Submission: resolution.Submission,
		ReadyForMotion: resolution.ReadyForMotion,
		ApprovedByMotion: resolution.ApprovedByMotion,
		EditStatus: resolution.EditStatus,
		EditNotes: resolution.EditNotes,
		EditInDraft: resolution.EditInDraft,
		Notes: resolution.Notes
	}
	for (let key of Object.keys(entry)) {
		if (entry[key] === undefined) {
			delete entry[key]
		}
	}

	return db.format('UPDATE resolutions SET ? WHERE id=?', [entry, resolution.id]);
}

async function updateResolutions(ballotId, resolutions) {

	if (resolutions.length === 0)
		return null;

	const SQL = 
		resolutions.map(r => updateResolutionSQL(r))
		.concat(
			db.format(GET_RESOLUTIONS_SQL + ' WHERE r.id IN (?);', [resolutions.map(r => r.id)])
		)
		.join(';')
	const results = await db.query(SQL);

	return results[results.length-1]
}

async function addResolution(ballotId, commentId, resolution) {
	let resolutionId
	if (!resolution.hasOwnProperty('ResolutionID')) {
		/* Find smallest unused ResolutionID */
		let result = await db.query(
			'SELECT MIN(r.ResolutionID)-1 AS ResolutionID FROM ballots b JOIN comments c ON b.id=c.ballot_id JOIN resolutions r ON r.comment_id=c.id WHERE b.BallotID=? AND c.CommentID=?;',
			[ballotId, commentId]);
		resolutionId = result[0].ResolutionID
		console.log(result)
		if (resolutionId === null) {
			resolutionId = 0
		}
		else if (resolutionId < 0) {
			result = await db.query(
				'SELECT r1.ResolutionID+1 AS ResolutionID FROM ballots b JOIN comments c ON b.id=c.ballot_id JOIN resolutions r1 ON r1.comment_id=c.id ' +
				'LEFT JOIN resolutions AS r2 ON r1.ResolutionID+1=r2.ResolutionID AND r1.comment_id=r2.comment_id ' +
				'WHERE r2.ResolutionID IS NULL AND b.BallotID=? AND c.CommentID=? LIMIT 1;',
				[ballotId, commentId])
			console.log(result)
			resolutionId = result[0].ResolutionID
		}
	}
	else {
		resolutionId = req.body.ResolutionID
	}
	console.log(resolutionId)

	const entry = {
		BallotID: ballotId,
		CommentID: commentId,
		ResolutionID: resolutionId,
		ResnStatus: resolution.ResnStatus,
		Resolution: resolution.Resolution || '',
		AssigneeSAPIN: resolution.AssigneeSAPIN,
		AssigneeName: resolution.AssigneeName,
		Submission: resolution.Submission,
		ReadyForMotion: resolution.ReadyForMotion,
		ApprovedByMotion: resolution.ApprovedByMotion,
		EditStatus: resolution.EditStatus,
		EditNotes: resolution.EditNotes || '',
		EditInDraft: resolution.EditInDraft,
		Notes: resolution.Notes || ''
	}

	const SQL = db.format(
		'INSERT INTO resolutions SET comment_id=(SELECT c.id FROM ballots b JOIN comments c ON b.id=c.ballot_id WHERE b.BallotID=? AND c.CommentID=?), ?',
		[ballotId, commentId, entry]
	);
	console.log(SQL)
	const result = await db.query(SQL)
	return {
		BallotID: ballotId,
		CommentID: commentId,
		ResolutionID: resolutionId
	}
}

async function addResolutions(ballotId, resolutions) {
	console.log(resolutions)

	const resIds = await Promise.all(resolutions.map(r => addResolution(ballotId, r.CommentID, r)))
	console.log(resIds)
	const commentIds = resIds.map(r => r.CommentID)
	const updatedComments = await db.query(
		GET_COMMENTS_SQL + 'WHERE b.BallotID=? AND c.CommentID IN (?);',
		[ballotId, commentIds]
	)
	let data = {
		newComments: [],
		updatedComments: []
	}
	for (let c of updatedComments) {
		if (resIds.find(r => r.CommentID === c.CommentID && r.ResolutionID === c.ResolutionID && c.ResolutionCount > 1)) {
			data.newComments.push(c)
		}
		else {
			data.updatedComments.push(c)
		}
	}
	return data
}

async function deleteResolutions(ballotId, resolutions) {
	console.log(resolutions)

	const commentIds = [...new Set(resolutions.map(r => r.CommentID))]	// array of unique CommentIDs
	const SQL =
		commentIds.map(commentId => {
			const resolutionIds = resolutions.filter(r => r.CommentID === commentId).map(r => r.ResolutionID);
			return db.format(
				'DELETE r FROM ballots b JOIN comments c ON c.ballot_id = b.id JOIN resolutions r ON r.comment_id=c.id WHERE b.BallotID=? AND c.CommentID=? AND r.ResolutionID IN (?)',
				[ballotId, commentId, resolutionIds]
			);
		})
		.concat([
			db.format(
				GET_COMMENTS_SQL + 'WHERE b.BallotID=? AND c.CommentID IN (?);',
				[ballotId, commentIds]
			)
		])
		.join(';')
		
	console.log(SQL)
	const results = await db.query(SQL)
	return {
		updatedComments: results[results.length-1]
	}
}
  
async function deleteComments(ballotId) {
	await db.query(DELETE_COMMENTS_SQL, [ballotId]);
	return true;
}

async function insertComments(ballotId, comments) {
	let SQL = db.format(DELETE_COMMENTS_SQL, [ballotId]);
	if (comments.length) {
		SQL += 
			`SET @ballot_id = (SELECT id FROM ballots WHERE BallotID=${db.escape(ballotId)}); ` +
			`INSERT INTO comments (ballot_id, BallotID, ${Object.keys(comments[0])}) VALUES` +
			comments.map(c => `(@ballot_id, ${db.escape(ballotId)}, ${db.escape(Object.values(c))})`).join(', ') +
			';'
	}
	SQL += db.format(GET_COMMENTS_SQL + 'WHERE b.BallotID=? ORDER BY c.CommentID;', [ballotId])
	SQL += db.format(GET_COMMENTS_SUMMARY_SQL, [ballotId])

	//console.log(SQL);

	const results = await db.query(SQL)
	//console.log(results)
	return {
		BallotID: ballotId,
		comments: results[results.length-2],
		summary: results[results.length-1][0]
	}
}

async function importEpollComments(sess, ballotId, epollNum, startCommentId) {
	const options = {
		url: `https://mentor.ieee.org/802.11/poll-comments.csv?p=${epollNum}`,
		jar: sess.ieeeCookieJar,
		resolveWithFullResponse: true,
		simple: false
	}
	const ieeeRes = await rp.get(options)
	console.log(ieeeRes.headers)
	if (ieeeRes.headers['content-type'] !== 'text/csv') {
		throw 'Not logged in'
	}

	const comments = parseEpollComments(startCommentId, ieeeRes.body);
	console.log(comments[0])

	return insertComments(ballotId, comments)
}

async function uploadComments(ballotId, type, startCommentId, file) {
	let comments
	if (type < 3) {
		comments = parseEpollComments(startCommentId, file.buffer)
	}
	else {
		const isExcel = file.originalname.search(/\.xlsx$/i) !== -1
		comments = await parseMyProjectComments(startCommentId, file.buffer, isExcel)
	}
	return insertComments(ballotId, comments)
}

const FieldsToUpdate = {
	CID: 'cid',
	Comment: 'comment',
	AdHoc: 'adhoc',
	CommentGroup: 'commentgroup',
	Assignee: 'assignee',
	Resolution: 'resolution',
	Editing: 'editing'
};

const MatchAlgo = {
	'elimination': matchByElimination,
	'perfect': matchPerfect,
	'cid': matchCID
};

const MatchUpdate = {
	All: 'all',
	Any: 'any',
	Add: 'add'
};

function updateCommentsSQL(ballotId, matched, toUpdate) {

	// See if any of the comment fields need updating
	let updateComments = [],
		updateResolutions = [],
		newResolutions = [];

	matched.forEach(m => {
		const c = m.dbComment
		const cs = m.sheetComment
		const u = commentUpdate(toUpdate, c, cs)
		if (u)
			updateComments.push(u)
		const r = resolutionUpdate(toUpdate, c, cs)
		if (r) {
			if (r.id)
				updateResolutions.push(r)
			else
				newResolutions.push(r)
		}
	});

	const SQL =
		updateComments.map(c => {
			let id = c.id;
			delete c.id;
			return db.format('UPDATE comments SET ? WHERE id=?;', [c, id]);
		})
		.concat(
			updateResolutions.map(r => {
				let id = r.id;
				delete r.id;
				delete r.comment_id;
				return db.format('UPDATE resolutions SET ? WHERE id=?;', [r, id]);
			})
		)
		.concat(
			newResolutions.map(r => {
				const commentId = r.CommentID;
				delete r.CommentID;
				return db.format(
					'INSERT INTO resolutions (BallotID, comment_id, ??) VALUE (?, (SELECT c.id FROM comments c JOIN ballots b ON b.id=c.ballot_id WHERE b.BallotID=? AND c.CommentID=?), ?)',
					[Object.keys(r), ballotId, ballotId, commentId, Object.values(r)]
				);
			})
		)
		.join(';');

	return SQL;
}

function addCommentsSQL(ballotId, sheetComments, toUpdate) {

	const update = toUpdate.concat(['comment']);	// Make sure we update comment
	const newComments = [];
	const newResolutions = [];

	sheetComments.forEach(cs => {
		let c = {
			CommentID: cs['CID'],
			CommenterName: cs['Commenter'],
			Category: cs['Type of Comment'],
			C_Clause: cs['Clause Number(C)'],
			C_Page: cs['Page(C)'],
			C_Line: cs['Line(C)'],
			Comment: cs['Comment'],
			ProposedChange: cs['Proposed Change'],
			...commentUpdate(update, {}, cs)
		}
		delete c.id;
		newComments.push(c);

		const r = resolutionUpdate(toUpdate, c, cs);
		if (r) {
			delete r.comment_id;
			newResolutions.push(r);
		}
	});

	const SQL =
		newComments.map(c => 
			db.format('INSERT INTO comments (BallotID, ballot_id, ??) VALUE (?, (SELECT id FROM ballots WHERE BallotID=?), ?)', [Object.keys(c), ballotId, ballotId, Object.values(c)])
		)
		.concat(
			newResolutions.map(r => {
				const commentId = r.CommentID;
				delete r.CommentID;
				return db.format(
					'INSERT INTO resolutions (BallotID, comment_id, ??) VALUE (?, (SELECT c.id FROM comments c JOIN ballots b ON b.id=c.ballot_id WHERE b.BallotID=? AND c.CommentID=?), ?)',
					[Object.keys(r), ballotId, ballotId, commentId, Object.values(r)])
			})
		)
		.join(';');

	return SQL;
}

async function uploadResolutions(ballotId, toUpdate, matchAlgorithm, matchUpdate, sheetName, file) {

	toUpdate.forEach(f => {
		if (!Object.values(FieldsToUpdate).includes(f)) {
			throw `Invalid entry in toUpdate array: ${f}. Valid entries are ${Object.values(FieldsToUpdate).join(', ')}.`
		}
	});

	if (!MatchAlgo.hasOwnProperty(matchAlgorithm)) {
		throw `Invalid matchAlgorithm parameter value: ${matchAlgorithm}. Valid options are ${Object.keys(MatchAlgo).join(', ')}.`
	}

	if (!Object.values(MatchUpdate).includes(matchUpdate)) {
		throw `Invalid matchUpdate parameter value: ${matchUpdate}. Valid options are ${Object.values(MatchUpdate).join(', ')}.`
	}

	if (matchAlgorithm === 'elimination' && matchUpdate === MatchUpdate.Any) {
		throw 'For successive elimination, match update cannot be \'any\'';
	}

	const sheetComments = await parseLegacyCommentsSpreadsheet(file.buffer, sheetName);
	const dbComments = await getComments(ballotId);

	let [matched, dbCommentsRemaining, sheetCommentsRemaining] = MatchAlgo[matchAlgorithm](sheetComments, dbComments);
	//console.log(matched.length, dbCommentsRemaining.length, sheetCommentsRemaining.length)

	let SQL;
	if (matchUpdate === MatchUpdate.All) {
		if (dbCommentsRemaining.length > 0) {
			throw `No update\n` +
				`${matched.length} entries match\n` +
				`${dbCommentsRemaining.length} unmatched database entries:\n` +
				dbCommentsRemaining.map(c => c.CommentID).join(', ') + '\n' +
				`${sheetCommentsRemaining.length} unmatched spreadsheet entries:\n` +
				sheetCommentsRemaining.map(c => c['CID']).join(', ')
		}

		SQL = updateCommentsSQL(ballotId, matched, toUpdate);
	}
	else if (matchUpdate === MatchUpdate.Any) {
		SQL = updateCommentsSQL(ballotId, matched, toUpdate);
	}
	else if (matchUpdate === MatchUpdate.Add) {
		SQL = addCommentsSQL(ballotId, sheetCommentsRemaining, toUpdate);
		sheetCommentsRemaining = [];
	}
	SQL += ';'
	SQL += db.format(GET_COMMENTS_SQL + 'WHERE b.BallotID=? ORDER BY c.CommentID;', [ballotId]);
	SQL += db.format(GET_COMMENTS_SUMMARY_SQL, [ballotId]);

	//const fs = require('fs');
	//fs.writeFile("sql.txt", SQL, (err) => {if (err) {console.log(err)}})
	//console.log(SQL);

	const results = await db.query(SQL)
	//console.log(results)
	return {
		BallotID: ballotId,
		comments: results[results.length-2],
		summary: results[results.length-1][0],
		unmatched: sheetCommentsRemaining.map(c => c['CID'])
	}
}

async function exportResolutionsForMyProject(ballotId, filename, file, res) {
	
	const comments = await db.query(
		GET_COMMENTS_SQL + 
		"WHERE b.BallotID=? " +
			"AND r.ApprovedByMotion IS NOT NULL AND r.ApprovedByMotion <> '' " +
			"AND r.ResnStatus IS NOT NULL AND r.ResnStatus <> ''" +
		"ORDER BY c.CommentID;",
		[ballotId]
	);

	let workbook = new ExcelJS.Workbook()
	try {
		await workbook.xlsx.load(file.buffer)
	}
	catch(err) {
		throw "Invalid workbook: " + err
	}

	myProjectAddResolutions(workbook, comments)
	res.attachment(filename || 'comments_resolved.xlsx')
	try {
		await workbook.xlsx.write(res)
	}
	catch(err) {
		throw "Unable to regenerate workbook: " + err
	}
	res.end()
}

async function exportSpreadsheet(ballotId, filename, file, res) {
	
	const [comments, ballots] = await db.query(
		GET_COMMENTS_SQL + "WHERE b.BallotID=? ORDER BY c.CommentID;" +
		"SELECT Document FROM ballots WHERE BallotID=?;",
		[ballotId, ballotId]);
	const doc = ballots.length > 0? ballots[0].Document: ''

	let workbook = new ExcelJS.Workbook()
	try {
		await workbook.xlsx.load(file.buffer)
	}
	catch(err) {
		throw "Invalid workbook: " + err
	}
	let ids = []
	workbook.eachSheet(sheet => {
		if (sheet.name !== 'Title' && sheet.name !== 'Revision History') {
			ids.push(sheet.id)
		}
	})
	for (let id of ids) {
		workbook.removeWorksheet(id)
	}

	let sheet = workbook.addWorksheet('Comments')
	genLegacyWorksheetTable(sheet, ballotId, doc, comments)

	res.attachment(filename || 'comments.xlsx')
	try {
		await workbook.xlsx.write(res)
	}
	catch(err) {
		throw "Unable to regenerate workbook: " + err
	}
	res.end()
}

module.exports = {
	getComments,
	updateComment,
	updateComments,
	setStartCommentId,
	updateResolutions,
	addResolutions,
	deleteResolutions,
	deleteComments,
	importEpollComments,
	uploadComments,
	uploadResolutions,
	exportResolutionsForMyProject,
	exportSpreadsheet
}
