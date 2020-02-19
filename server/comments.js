'use strict';

var csvParse = require('csv-parse/lib/sync');
var xlsx = require('xlsx');
const ExcelJS = require('exceljs');

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
			//CommenterEmail: c[4],
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

function exportMyProjectComments(comments) {
	var workbook = new ExcelJS.Workbook()
	var sheet = workbook.addWorksheet('export_resolved_comments')
	sheet.addRow(myProjectCommentsHeader)
	for (let c of comments) {
		const row = [
			c.C_CommentID,
			c.Date,
			c.C_CommentNum,	// Comment #
			c.CommenterName,
			'',				// Email
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
			c.ResnStatus,	// Disposition Status
			c.Resolution,	// Disposition Detail
			'',
			'',
			''
		]

		sheet.addRow(row)
	}

	return workbook.xlsx.writeBuffer()
}

function parseResolution(cs) {
	// Does the comment have an assignee, resolution, submission?
	if (cs['Resn Status'] || cs['Resolution'] || cs['Submission'] || cs['Assignee']) {
		var n = {
			CommentID: cs['CID'],
			ResnStatus: cs['Resn Status'] || '',
			Resolution: cs['Resolution'] || '',
			Submission: cs['Submission'] || '',
			ApprovalRef: cs['Motion Number'] || '',
			AssigneeName: cs['Assignee'] || '',
			EditStatus: cs['Edit Status'] || '',
			EditNotes: cs['Edit Notes'] || '',
			EditInDraft: cs['Edited in Draft'] || ''
		}
		return n
	}
	return null
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

const GET_COMMENTS_SQL =
	'SELECT ' +
		'c.*, ' +
		'IF(r.ResolutionID, c.CommentID + r.ResolutionID/10, c.CommentID) AS CommentID, ' +
		'(SELECT COUNT(*) FROM resolutions AS r WHERE c.BallotID = r.BallotID AND c.CommentID = r.CommentID) AS ResolutionCount, ' +
		'r.ResolutionID, r.AssigneeSAPIN, r.ResnStatus, r.Resolution, r.Submission, r.ReadyForMotion, r.ApprovedByMotion, ' + 
		'r.EditStatus, r.EditInDraft, r.EditNotes, r.Notes, ' +
		'results.Vote, users.Name AS AssigneeName ' +
	'FROM comments AS c ' +
		'LEFT JOIN resolutions AS r ON c.BallotID = r.BallotID AND c.CommentID = r.CommentID ' +
		'LEFT JOIN results ON c.BallotID = results.BallotID AND c.CommenterSAPIN = results.SAPIN ' +
		'LEFT JOIN users ON r.AssigneeSAPIN = users.SAPIN ';

module.exports = function (db, rp) {
	var module = {};

	module.getComments = (req, res, next) => {
		//console.log(req.query)

		const ballotId = req.query.BallotID;
		if (!ballotId) {
			return Promise.reject('Missing parameter BallotID');
		}

		const SQL = GET_COMMENTS_SQL + 'WHERE c.BallotID=?;'
		//console.log(SQL);
		return db.query(SQL, [ballotId])
	}

	module.updateComment = (req, res, next) => {
		console.log(req.body);

		if (!req.body.hasOwnProperty('BallotID') || !req.body.hasOwnProperty('CommentID')) {
			return Promise.reject('Missing BallotID and/or CommentID');
		}

		const ballotId = req.body.BallotID;
		const commentId = req.body.CommentID;
		delete req.body.BallotID;
		delete req.body.CommentID;

		if (req.body.hasOwnProperty('resolutions')) {
			// If there are resolutions then they may need to be inserted or updated
			if (!Array.isArray(req.body.resolutions)) {
				return Promise.reject('Expected array for resolutions');
			}
			var resolutions = req.body.resolutions;
			delete req.body.resolutions;

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
					if (Object.keys(req.body).length !== 0) {
						queries.push(db.format('UPDATE comments SET ? WHERE (BallotID=? AND CommentID=?)', [req.body, ballotId, commentId]));
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
		else if (Object.keys(req.body).length !== 0) {
			return db.query("UPDATE comments SET ? WHERE (BallotID=? AND CommentID=?)", [req.body, ballotId, commentId]);
		}
		else {
			// Nothing to do
			return Promise.resolve(null);
		}
	}

	async function updateResolution(resolution) {
		console.log(resolution)

		if (!resolution.hasOwnProperty('BallotID') ||
			!resolution.hasOwnProperty('CommentID') ||
			!resolution.hasOwnProperty('ResolutionID')) {
			return Promise.reject('Missing BallotID, CommentID and/or ResolutionID');
		}

		const ballotId = resolution.BallotID;
		const commentId = Math.floor(resolution.CommentID);
		const resolutionId = resolution.ResolutionID;
		const entry = {
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
		if (Object.keys(entry).length === 0) {
			return Promise.reject('Nothing to update')
		}

		const results = await db.query(
			"UPDATE resolutions SET ? WHERE (BallotID=? AND CommentID=? AND ResolutionID=?)",
			[entry, ballotId, commentId, resolutionId])
		console.log(results)
		return null
	}

	module.updateResolution = async (req, res, next) => {
		console.log(req.body);

		return updateResolution(req.body)
	}

	module.updateResolutions = async (req, res, next) => {

		if (!req.body.hasOwnProperty('resolutions') ||
			!Array.isArray(req.body.resolutions)) {
			return Promise.reject('Badly formed request: missing resolutions array')
		}

		return Promise.all(req.body.resolutions.map(r => updateResolution(r)))
	}


	module.addResolution = async (req, res, next) => {
		console.log(req.body);

		if (!req.body.hasOwnProperty('BallotID') ||
		    !req.body.hasOwnProperty('CommentID')) {
			return Promise.reject('Missing BallotID and/or CommentID')
		}
		const ballotId = req.body.BallotID
		const commentId = req.body.CommentID
		let resolutionId
		if (!req.body.hasOwnProperty('ResolutionID')) {
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
			ResnStatus: req.body.ResnStatus,
			Resolution: req.body.Resolution,
			AssigneeSAPIN: req.body.AssigneeSAPIN,
			AssigneeName: req.body.AssigneeName,
			Submission: req.body.Submission,
			ReadyForMotion: req.body.ReadyForMotion,
			ApprovedByMotion: req.body.ApprovedByMotion,
			EditStatus: req.body.EditStatus,
			EditNotes: req.body.EditNotes,
			EditInDraft: req.body.EditInDraft,
			Notes: req.body.Notes
		}

		const SQL =
			db.format(
				'INSERT INTO resolutions SET ?;',
				[entry]) +
			db.format(
				GET_COMMENTS_SQL +
				'WHERE c.BallotID=? AND c.CommentID=?;',
				[req.body.BallotID, req.body.CommentID]);
		console.log(SQL)
		const results = await db.query(SQL)
		if (results.length !== 2 || results[1].length < 1) {
			throw "Unexpected result"
		}
		console.log(results[0])
		return {
			BallotID: ballotId,
			CommentID: commentId,
			ResolutionID: resolutionId,
			updatedComments: results[1]
		}
	}

	module.deleteResolution = async (req, res, next) => {
		console.log(req.body);

		if (!req.body.hasOwnProperty('BallotID') ||
		    !req.body.hasOwnProperty('CommentID') ||
		    !req.body.hasOwnProperty('ResolutionID')) {
			return Promise.reject('Missing BallotID, CommentID and/or ResolutionID')
		}
		const ballotId = req.body.BallotID
		const commentId = req.body.CommentID
		const resolutionId = req.body.ResolutionID

		const SQL =
			db.format(
				'DELETE FROM resolutions WHERE BallotID=? AND CommentID=? AND ResolutionID=?; ',
				[ballotId, commentId, resolutionId]) +
			db.format(
				GET_COMMENTS_SQL +
				'WHERE c.BallotID=? AND c.CommentID=?;',
				[ballotId, commentId]);
		const results = await db.query(SQL)
		if (results.length !== 2 || results[1].length < 1) {
			throw "Unexpected result"
		}
		return {
			BallotID: ballotId,
			CommentID: commentId,
			ResolutionID: resolutionId,
			updatedComments: results[1]
		}
	}
  
	module.deleteByBallotID = function (req, res, next) {
		console.log(req.body);

		const ballotId = req.body.BallotID;
		return db.query('DELETE FROM comments WHERE BallotID=?', [ballotId])
	}

	module.importComments = function (req, res, next) {
		console.log(req.body);

		if (!req.body.hasOwnProperty('BallotID') ||
			!req.body.hasOwnProperty('EpollNum')) {
			return Promise.reject("Missing BallotID and/or EpollNum parameter")
		}

		const ballotId = req.body.BallotID;
		const epollNum = req.body.EpollNum;
		const startCommentId = req.body.StartCID || 1;

		const sess = req.session;

		var options = {
			url: `https://mentor.ieee.org/802.11/poll-comments.csv?p=${epollNum}`,
			jar: sess.ieeeCookieJar,
			resolveWithFullResponse: true,
			simple: false
		}
		return rp.get(options)
			.then(ieeeRes => {
				console.log(ieeeRes.headers);
				if (ieeeRes.headers['content-type'] !== 'text/csv') {
					return Promise.reject('Not logged in')
				}

				var comments = parsePollComments(startCommentId, ieeeRes.body);
				//console.log(comments);

				var SQL = db.format('DELETE FROM comments WHERE BallotID=?;', [ballotId]);
				if (comments.length) {
					SQL += `INSERT INTO comments (BallotID, ${Object.keys(comments[0])}) VALUES`;
					comments.forEach((c, i) => {
						SQL += (i > 0? ',': '') + `(${db.escape(ballotId)},${db.escape(Object.values(c))})`;
					});
					SQL += ';'
				}
				SQL += db.format('SELECT COUNT(*) AS Count, MIN(CommentID) AS CommentIDMin, MAX(CommentID) AS CommentIDMax FROM comments WHERE BallotID=?', [ballotId])
				//console.log(SQL);

				return db.query(SQL)
			})
			.then(results => {
				// Two or three results are present
				var summary = results[results.length-1][0]
				return {
					BallotID: ballotId,
					CommentsSummary: summary
				}
			})
	}

	module.uploadComments = async function(req, res, next) {
		console.log(req.body);

		if (!req.body.BallotID ||
			!req.body.Type) {
			return Promise.reject("Missing BallotID and/or Type parameter")
		}
		const ballotId = req.body.BallotID
		const type = req.body.Type
		const startCommentId = req.body.StartCID || 1

		console.log(req.file)
		if (!req.file) {
			return Promise.reject('Missing file')
		}

		let comments;
		if (type < 3) {
			comments = parseEpollComments(startCommentId, req.file.buffer)
		}
		else {
			const isExcel = req.file.originalname.search(/\.xlsx$/i) !== -1
			comments = await parseMyProjectComments(startCommentId, req.file.buffer, isExcel)
		}
		//console.log('comment=', comments)

		var SQL = db.format('DELETE FROM comments WHERE BallotID=?;', [ballotId])
		if (comments.length) {
			SQL +=
				`INSERT INTO comments (BallotID, ${Object.keys(comments[0])}) VALUES` +
				comments.map(c => `(${db.escape(ballotId)}, ${db.escape(Object.values(c))})`).join(', ') +
				';'
		}
		SQL += db.format(GET_COMMENTS_SQL + 'WHERE c.BallotID=?;', [ballotId])
		//console.log(SQL);

		const results = await db.query(SQL)
		//console.log(results)
		return {
			BallotID: ballotId,
			comments: results[2]
		}
	}

	module.uploadResolutions = function (req, res, next) {
		console.log(req.body);

		const ballotId = req.body.BallotID;
		if (!ballotId) {
			return Promise.reject('Missing parameter BallotID');
		}
		//console.log(req.file)
		if (!req.file) {
			return Promise.reject('Missing file');
		}
			
		//console.log(workbook.SheetNames)
		var ws = workbook.Sheets['Comments'];

		var SQL = db.format('SELECT * FROM comments WHERE BallotID=?', [ballotId]);
		return db.query(SQL)
			.then(results => {
				//console.log(results)
				var updateComments = [];
				var newComments = [];
				var newResolutions = [];

				parseCommentsSheet(ws, results, updateComments, newComments, newResolutions);
				//console.log(comments)

				SQL = db.format('DELETE FROM resolutions WHERE BallotID=?;', [ballotId]);
				if (updateComments.length) {
					updateComments.forEach((c, i) => {
						var cid = c.PrevCommentID;
						delete c.PrevCommentID;
						SQL += db.format('UPDATE comments SET ? WHERE BallotID=? AND CommentID=?;', [c, ballotId, cid]);
					});
				}
				if (newComments.length) {
					SQL += db.format('INSERT INTO comments (BallotID, ??) VALUES ', [Object.keys(newComments[0])]);
					newComments.forEach((c, i) => {
						SQL += i? ',': '';
						SQL += db.format('(?, ?)', [ballotId, Object.values(c)])
					});
					SQL += ';'
				}
				if (newResolutions.length) {
					SQL += db.format('INSERT INTO resolutions (BallotID, ??) VALUES ', [Object.keys(newResolutions[0])]);
					newResolutions.forEach((r, i) => {
						SQL += i? ',': '';
						SQL += db.format('(?, ?)', [ballotId, Object.values(r)]);
					})
					SQL += ';'
				}
				const fs = require('fs');
				fs.writeFile("sql.txt", SQL, (err) => {if (err) {console.log(err)}})
				//console.log('updateComments ', updateComments.length, ' newComments ', newComments.length, ' newResolutions ', newResolutions.length)

				return db.query(SQL)
			})
			.then(results => {
				return null
			})
	}

	module.exportMyProjectComments = async function(req, res, next) {
		const ballotId = req.query.BallotID;
		if (!ballotId) {
			return Promise.reject('Missing parameter BallotID');
		}
		const comments = await db.query(GET_COMMENTS_SQL + "WHERE c.ResnStatus <> '' AND c.BallotID = ?;", [ballotId])
		const buffer = await exportMyProjectComments(comments)
		res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
		res.status(200).send(buffer)
	}

	return module;
}