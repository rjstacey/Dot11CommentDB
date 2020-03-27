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
	'Index', 'Date', 'SA PIN', 'Name', 'Comment', 'Category', 'Page Number', 'Subclause', 'Line Number', 
	'Proposed Change', 'Must Be Satisfied'
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
		throw `Unexpected column headings ${p[0].join()}. Expected ${myProjectCommentsHeader.join()}.`
	}
	p.shift()	// remove column heading row

	var cid = startCommentId
	return p.map(c => {
		const c_page = c[12] !== undefined? c[12]: ''
		const c_line = c[14] !== undefined? c[14]: ''
		var page = parseFloat(c_page) + parseFloat(c_line)/100
		if (isNaN(page)) {page = 0}
		return {
			CommentID: cid++,
			//C_CommentID: c[0],
			C_Index: c[7],
			//Date: c[1],
			CommenterSAPIN: null,
			CommenterName: c[3],
			CommenterEmail: c[4],
			//CommenterPhone: c[5],
			Comment: c[15],
			Category: c[11]? c[11].charAt(0): '',   // First letter only (G, T or E)
			C_Page: c_page,
			C_Clause: c[13]? c[13]: '',
			C_Line: c_line,
			Page: page,
			Clause: c[13]? c[13]: '',
			ProposedChange: c[18],
			MustSatisfy: !!(c[17] === '1')
		}
	})
}

const mapToDispositionStatus = {
	A: 'ACCEPTED',
	R: 'REVISED',
	J: 'REJECTED'
}

function myProjectCommentsWorkbook(comments) {

	let wb = new ExcelJS.Workbook()
	wb.creator = '802.11'
	let sheet = wb.addWorksheet('export_resolved_comments')

	sheet.addRow(myProjectCommentsHeader)
	for (let c of comments) {

		const row = [
			c.C_CommentID,
			c.Date,
			c.C_CommentNum,	// Comment #
			c.CommenterName,
			c.CommenterEmail, // Email
			'',				// Phone
			'Ballot',		// Style
			c.C_Index,		// Index #
			'',				// Classification
			c.Vote,
			'',				// Affiliation
			c.Category,
			c.C_Page,
			c.Clause,		// Subclause
			c.C_Line,
			c.Comment,
			c.File,
			c.MustSatisfy,
			c.ProposedChange,
			mapToDispositionStatus[c.ResnStatus] || '',	// Disposition Status
			c.Resolution,	// Disposition Detail
			'',
			'',
			''
		]

		sheet.addRow(row)
	}

	return wb
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

async function parseLegacyCommentsSpreadsheet(buffer) {

	var workbook = new ExcelJS.Workbook()
	await workbook.xlsx.load(buffer)
	const worksheet = workbook.getWorksheet('Comments')
	//console.log(worksheet.rowCount)

	// Row 0 is the header
	var header = worksheet.getRow(1).values
	header.shift()	// Remove column 0
	if (legacyCommentsHeader.reduce((r, v, i) => r || v !== header[i], false)) {
		throw `Unexpected column headings ${header.join()}. Expected ${legacyCommentsHeader.join()}.`
	}

	var comments = []
	worksheet.eachRow(row => {
		const entry = legacyCommentsHeader.reduce((entry, key, i) => {entry[key] = row.getCell(i+1).text; return entry}, {})
		comments.push(entry)
	})
	comments.shift()	// remove header
	//console.log(comments.slice(0, 4))

	return comments;
}


const comparisons = [
	(dbC, sC) => dbC.CommenterName === sC['Commenter'],
	(dbC, sC) => dbC.Category === sC['Type of Comment'],
	(dbC, sC) => dbC.C_Clause.substring(0, sC['Clause Number(C)'].length) === sC['Clause Number(C)'],				// Legacy might trucate
	(dbC, sC) => dbC.C_Page === sC['Page(C)'] || Math.round(parseFloat(dbC.C_Page)) === parseInt(sC['Page(C)']),	// Legacy converts page to int
	(dbC, sC) => dbC.C_Line === sC['Line(C)'] || Math.round(parseFloat(dbC.C_Line)) === parseInt(sC['Line(C)']),	// Legacy converts line to int
	(dbC, sC) => dbC.Comment === sC['Comment'],
	(dbC, sC) => dbC.ProposedChange === sC['Proposed Change']
]

/*
 * Successivly match columns, elimating rows that don't match as we go
 * Once we are down to one row, that is the match.
 * The idea is to first match columns that aren't likely to have issues and then use additional columns as needed.
 */
function matchByElimination(sheetComments, dbComments) {

	if (sheetComments.length !== dbComments.length) {
		throw `Number of rows in spreadsheet must match number of comments in database ` +
			`(${sheetComments.length} != ${dbComments.length})`
	}

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
		let scr = sheetCommentsRemaining.slice()
		for (let comp of comparisons) {
			scr = scr.filter(sC => comp(dbC, sC))
			if (scr.length === 0) {
				dbCommentsRemaining.push(dbC)
				break
			}
			if (scr.length === 1) {
				// Found match
				matched.push({dbComment: dbC, sheetComment: scr[0]})
				const i = sheetCommentsRemaining.findIndex(sC => sC === scr[0])
				sheetCommentsRemaining.splice(i, 1)
				break
			}
		}
	}
	console.log('result: ', matched.length, dbCommentsRemaining.length)
	return [matched, dbCommentsRemaining, sheetCommentsRemaining]
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
function matchByCommentId(sheetComments, dbComments) {
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

function commentUpdate(c, cs) {
	var u = {}

	const cid = c.CommentID
	if (c.CommentID !== cs['CID']) {
		u.CommentID = cs['CID']
	}
	if (c.CommentGroup !== cs['Comment Group']) {
		u.CommentGroup = cs['Comment Group']
	}
	if (cs['Clause'] && c.Clause !== cs['Clause']) {
		u.Clause = cs['Clause']
	}
	var page = parseFloat(cs['Page'])
	if (page && c.Page !== page) {
		u.Page = page
	}

	if (Object.keys(u).length) {
		u.PrevCommentID = cid
		return u
	}

	return null
}

function resolutionUpdate(cs) {
	// Does the comment have an assignee, resolution, submission?
	if (cs['Resn Status'] || cs['Resolution'] || cs['Submission'] || cs['Assignee']) {
		var n = {
			CommentID: cs['CID'],
			ResnStatus: cs['Resn Status'] || '',
			Resolution: cs['Resolution'] || '',
			Submission: cs['Submission'] || '',
			ApprovedByMotion: cs['Motion Number'] || '',
			AssigneeName: cs['Assignee'] || '',
			EditStatus: cs['Edit Status'] || '',
			EditNotes: cs['Edit Notes'] || '',
			EditInDraft: cs['Edited in Draft'] || ''
		}
		return n
	}
	return null
}

const GET_COMMENTS_SQL =
	'SELECT ' +
		'c.*, ' +
		'(SELECT COUNT(*) FROM resolutions AS r WHERE c.BallotID = r.BallotID AND c.CommentID = r.CommentID) AS ResolutionCount, ' +
		'IF((SELECT COUNT(*) FROM resolutions AS r WHERE c.BallotID = r.BallotID AND c.CommentID = r.CommentID) > 1, ' + 
			'CONCAT(CONVERT(c.CommentID, CHAR), ".", CONVERT(r.ResolutionID, CHAR)), ' + 
			'CONVERT(c.CommentID, CHAR)) AS CID, ' +
		'r.ResolutionID, r.AssigneeSAPIN, r.ResnStatus, r.Resolution, r.Submission, r.ReadyForMotion, r.ApprovedByMotion, ' + 
		'r.EditStatus, r.EditInDraft, r.EditNotes, r.Notes, ' +
		'results.Vote, users.Name AS AssigneeName ' +
	'FROM comments AS c ' +
		'LEFT JOIN resolutions AS r ON c.BallotID = r.BallotID AND c.CommentID = r.CommentID ' +
		'LEFT JOIN results ON c.BallotID = results.BallotID AND c.CommenterSAPIN = results.SAPIN ' +
		'LEFT JOIN users ON r.AssigneeSAPIN = users.SAPIN ';

const GET_COMMENTS_SUMMARY_SQL =
	'SELECT COUNT(*) AS Count, MIN(CommentID) AS CommentIDMin, MAX(CommentID) AS CommentIDMax ' +
	'FROM comments WHERE BallotID=?';

async function getComments(ballotId) {
	return db.query(GET_COMMENTS_SQL + ' WHERE c.BallotID=?', [ballotId])
}

function updateComment(ballotId, commentId, comment) {

	if (comment.hasOwnProperty('resolutions')) {
		// If there are resolutions then they may need to be inserted or updated
		if (!Array.isArray(comment.resolutions)) {
			throw 'Expected array for resolutions'
		}
		var resolutions = comment.resolutions
		delete comment.resolutions

		// Need to know what is already present
		return db.query('SELECT * FROM resolutions WHERE (BallotID=? AND CommentID=?)', [ballotId, commentId])
			.then(results => {
				// Each resolution entry is either an update or an insertion
				// an update if already present; an insertion if not present
				let queries = [];
				resolutions.forEach(r1 => {
					console.log('r1=', r1)
					let present = false;
					results.forEach(r2 => {
						if (r2.ResolutionID === r1.ResolutionID) {
							present = true;
						}
					})
					if (present) {
						// present so it is an update
						let resolutionId = r1.ResolutionID;
						delete r1.BallotID;
						delete r1.CommentID;
						delete r1.ResolutionID;
						if (Object.keys(r1).length !== 0) {
							queries.push(db.format('UPDATE resolutions SET ? WHERE (BallotID=? AND CommentID=? AND ResolutionID=?)', [r1, ballotId, commentId, resolutionId]));
						}
					}
					else {
						// not present so it must be an insert
						r1.BallotID = ballotId;
						r1.CommentID = commentId;
						queries.push(db.format('INSERT INTO resolutions SET ?', r1));
					}
				});

				// If there are additional changes to the comment, then make these too
				if (Object.keys(comment).length !== 0) {
					queries.push(db.format('UPDATE comments SET ? WHERE (BallotID=? AND CommentID=?)', [comment, ballotId, commentId]));
				}

				// It is possible that we end up with nothing to do
				if (queries.length === 0) {
					return Promise.resolve(null);
				}

				var query = queries.join(';');
				console.log(query);
				return db.query(query);
			})
	}
	else if (Object.keys(comment).length !== 0) {
		return db.query("UPDATE comments SET ? WHERE (BallotID=? AND CommentID=?)", [comment, ballotId, commentId]);
	}
	else {
		// Nothing to do
		return Promise.resolve(null);
	}
}

function getResolutionIds(CIDs) {
	return CIDs.split(',').map(cid => {
		const m = cid.match(/(\d+)\.(\d+)/)
		return m?
			{
				CommentID: parseInt(m[1], 10),
				ResolutionID: parseInt(m[2], 10)
			}:
			{
				CommentID: parseInt(cid, 10)
			}
	})
}

async function updateResolution(ballotId, commentId, resolutionId, resolution) {
	const entry = {
		BallotID: resolution.BallotID,
		CommentID: resolution.CommentID,
		ResolutionID: resolution.ResolutionID,
		CommentGroup: resolution.CommentGroup,
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
	console.log(entry)
	let SQL = ''
	if (Object.keys(entry).length) {
		SQL += db.format(
				'UPDATE resolutions SET ? WHERE (BallotID=? AND CommentID=? AND ResolutionID=?);',
				[entry, ballotId, commentId, resolutionId]
			)
		if (entry.BallotID) {
			ballotId = entry.BallotID
		}
		if (entry.CommentID) {
			commentId = entry.CommentID
		}
		if (entry.ResolutionID) {
			resolutionId = entry.ResolutionID
		}
	}
	SQL += db.format(
			'SELECT * FROM resolutions WHERE (BallotID=? AND CommentID=? AND ResolutionID=?);',
			[ballotId, commentId, resolutionId]
		)
	const results = await db.query(SQL)
	return results[results.length-1][0]
}

async function updateResolutions(ballotId, CIDs, resolutions) {
	// If the optional parameter CIDs is not given, then use the identifiers in the resolutions
	let resIds
	if (CIDs) {
		resIds = getResolutionIds(CIDs)
		if (resolutions.length !== resIds.length) {
			throw 'The CIDs array and resolutions array have different lengths'
		}
	}
	else {
		resIds = resolutions.map(r => ({CommentID: r.CommentID, ResolutionID: r.ResolutionID}))
	}

	return Promise.all(resolutions.map((r, i) => updateResolution(ballotId, resIds[i].CommentID, resIds[i].ResolutionID, r)))
}

async function addResolution(ballotId, commentId, resolution) {
	let resolutionId
	if (!resolution.hasOwnProperty('ResolutionID')) {
		/* Find smallest unused ResolutionID */
		let result = await db.query(
			'SELECT MIN(ResolutionID)-1 AS ResolutionID FROM resolutions WHERE BallotID=? AND CommentID=?;',
			[ballotId, commentId])
		resolutionId = result[0].ResolutionID
		console.log(result)
		if (resolutionId === null) {
			resolutionId = 0
		}
		else if (resolutionId < 0) {
			result = await db.query(
				'SELECT r1.ResolutionID+1 AS ResolutionID FROM resolutions AS r1 ' +
				'LEFT JOIN resolutions AS r2 ON r1.ResolutionID+1=r2.ResolutionID AND r1.BallotID=r2.BallotID AND r1.CommentID=r2.CommentID ' +
				'WHERE r2.ResolutionID IS NULL AND r1.BallotID=? AND r1.CommentID=? LIMIT 1;',
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

	const result = await db.query('INSERT INTO resolutions SET ?', [entry])
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
		GET_COMMENTS_SQL + 'WHERE c.BallotID=? AND c.CommentID IN (?);',
		[ballotId, commentIds]
	)
	let data = {
		newComments: [],
		updatedComments: []
	}
	for (let c of updatedComments) {
		if (resIds.find(r => r.CommentID === c.CommentID && r.ResolutionID === c.ResolutionID)) {
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

	const SQL =
		resolutions.map(r => 
			db.format(
				'DELETE FROM resolutions WHERE BallotID=? AND CommentID=? AND ResolutionID=?;',
				[ballotId, r.CommentID, r.ResolutionID]
			)
		).join('') +
		db.format(
			GET_COMMENTS_SQL +
			'WHERE c.BallotID=? AND c.CommentID IN (?);',
			[ballotId, resolutions.map(r => r.CommentID)]
		)

	console.log(SQL)
	const results = await db.query(SQL)
	return {
		updatedComments: results[results.length-1]
	}
}
  
async function deleteComments(ballotId) {
	await db.query(
		'START TRANSACTION;' +
		'DELETE FROM comments WHERE BallotID=?;' +
		'DELETE FROM resolutions WHERE BallotID=?;' +
		'COMMIT;',
		[ballotId, ballotId])
	return true
}

async function insertComments(ballotId, comments) {
	var SQL = db.format('DELETE FROM comments WHERE BallotID=?;', [ballotId])
	if (comments.length) {
		SQL +=
			`INSERT INTO comments (BallotID, ${Object.keys(comments[0])}) VALUES` +
			comments.map(c => `(${db.escape(ballotId)}, ${db.escape(Object.values(c))})`).join(', ') +
			';'
	}
	SQL += db.format(GET_COMMENTS_SQL + 'WHERE c.BallotID=?;', [ballotId])
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

	const comments = parseEpollComments(startCommentId, ieeeRes.body)
	//console.log(comments);

	return insertComments(ballotId, comments)
}

async function uploadComments(req, res, next) {
	let comments
	if (type < 3) {
		comments = parseEpollComments(startCommentId, req.file.buffer)
	}
	else {
		const isExcel = req.file.originalname.search(/\.xlsx$/i) !== -1
		comments = await parseMyProjectComments(startCommentId, req.file.buffer, isExcel)
	}
	//console.log('comment=', comments)
	return insertComments(ballotId, comments)
}

async function uploadResolutions(ballotId, matchAlgorithm, matchAll, file) {
	const match = {
		'elimination': matchByElimination,
		'perfect': matchPerfect,
		'cid': matchByCommentId
	}
	const valid = Object.keys(match).join('|')
	console.log('huh', matchAlgorithm, typeof matchAlgorithm !== 'string', matchAlgorithm.search(valid) === -1)
	if (!matchAlgorithm || 
		typeof matchAlgorithm !== 'string' ||
		matchAlgorithm.search(valid) === -1) {
		throw 'Parameter matchAlgorithm either missing or has value other than ' + valid + '.'
	}

	const sheetComments = await parseLegacyCommentsSpreadsheet(file.buffer)
	const dbComments = await db.query('SELECT * FROM comments WHERE BallotID=?', [ballotId])

	const [matched, dbCommentsRemaining, sheetCommentsRemaining] = match[matchAlgorithm](sheetComments, dbComments)
	console.log(sheetCommentsRemaining)
	if (matchAll && (sheetCommentsRemaining.length || dbCommentsRemaining.length)) {
		throw `No update\n` +
			`${matched.length} matched entries\n` +
			`${dbCommentsRemaining.length} unmatch database entries\n` +
			`${sheetCommentsRemaining.length} unmatch spreadsheet entries:\n` +
			sheetCommentsRemaining.map(c => c['CID']).join(', ')
	}

	// See if any of the comment fields need updating
	var updateComments = []
	var newResolutions = []
	for (let m of matched) {
		const c = m.dbComment
		const cs = m.sheetComment
		const u = commentUpdate(c, cs)
		if (u) {
			updateComments.push(u)
		}
		const r = resolutionUpdate(cs)
		if (r) {
			newResolutions.push(r)
		}
	}

	var SQL = db.format('DELETE FROM resolutions WHERE BallotID=?;', [ballotId]);
	if (updateComments.length) {
		for (let c of updateComments) {
			var cid = c.PrevCommentID;
			delete c.PrevCommentID;
			SQL += db.format('UPDATE comments SET ? WHERE BallotID=? AND CommentID=?;', [c, ballotId, cid]);
		}
	}

	if (newResolutions.length) {
		SQL +=
			db.format('INSERT INTO resolutions (BallotID, ??) VALUES ', [Object.keys(newResolutions[0])]) +
			newResolutions.map(r => db.format('(?, ?)', [ballotId, Object.values(r)])).join(',') +
			';'
	}
	SQL += db.format(GET_COMMENTS_SQL + 'WHERE c.BallotID=?;', [ballotId])
	SQL += db.format(GET_COMMENTS_SUMMARY_SQL, [ballotId])

	//const fs = require('fs');
	//fs.writeFile("sql.txt", SQL, (err) => {if (err) {console.log(err)}})
	//console.log(SQL);

	const results = await db.query(SQL)
	//console.log(results)
	return {
		BallotID: ballotId,
		comments: results[results.length-2],
		summary: results[results.length-1][0],
		unmatch: sheetCommentsRemaining.map(c => c['CID'])
	}
}

async function exportMyProjectComments(ballotId, res) {
	
	const comments = await db.query(GET_COMMENTS_SQL + "WHERE r.ResnStatus IS NOT NULL AND r.ResnStatus <> '' AND c.BallotID = ?;", [ballotId])
	//console.log(comments)

	let wb = myProjectCommentsWorkbook(comments)

	res.attachment(ballotId + '_comments.xlsx')

	await wb.xlsx.write(res)
	res.end()
}

module.exports = {
	getComments,
	updateComment,
	updateResolutions,
	addResolutions,
	deleteResolutions,
	deleteComments,
	importEpollComments,
	uploadComments,
	uploadResolutions,
	exportMyProjectComments
}
