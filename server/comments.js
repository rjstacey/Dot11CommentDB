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

function parsePollComments(startCommentId, pollCommentsCsv) {
	var cid = startCommentId;

	const p = csvParse(pollCommentsCsv, {columns: false});
	if (p.length === 0) {
		throw 'Got empty poll-comments.csv';
	}

	// Row 0 is the header
	var expected = ['Index', 'Date', 'SA PIN', 'Name', 'Comment', 'Category', 'Page Number', 'Subclause', 'Line Number', 'Proposed Change', 'Must Be Satisfied'];
	if (expected.reduce((r, v, i) => v !== p[0][i], false)) {
		throw `Unexpected column headings ${p[0].join()}. Expected ${expected.join()}.`
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
			C_Page: c[6].trim(),
			C_Clause: c[7].trim(),
			C_Line: c[8].trim(),
			Page: parseFloat(c[6]) + parseFloat(c[8])/100,
			Clause: c[7],
			ProposedChange: c[9],
			MustSatisfy: !!(c[10] === '1')
		};
		if (isNaN(e.Page)) {e.Page = 0}
		return e;
	})
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

module.exports = function (db, rp) {
	var module = {};

	module.getComments = async (req, res, next) => {
		//console.log(req.query)

		const ballotId = req.query.BallotID;
		if (!ballotId) {
			return Promise.reject('Missing parameter BallotID');
		}

		/*const SQL = 
			'SELECT c.*, r.Vote FROM comments AS c LEFT JOIN results AS r ON (c.BallotID = r.BallotID AND c.CommenterSAPIN = r.SAPIN) WHERE c.BallotID = ?; ' +
			'SELECT r.*, u.Name AS AssigneeName FROM resolutions AS r LEFT JOIN users AS u ON (r.AssigneeSAPIN = u.SAPIN) WHERE BallotID = ?;'*/
		const SQL = 
			'SELECT ' +
				'c.*, ' +
				'IF(r.ResolutionID, c.CommentID + r.ResolutionID/10, c.CommentID) AS CommentID, ' +
				'(SELECT COUNT(*) FROM resolutions AS r WHERE c.BallotID = r.BallotID AND c.CommentID = r.CommentID) AS ResolutionCount, ' +
				'r.ResolutionID, r.AssigneeSAPIN, r.ResnStatus, r.Resolution, r.Submission, r.ApprovalRef, ' + 
				'results.Vote, users.Name AS AssigneeName ' +
			'FROM comments AS c ' +
				'LEFT JOIN resolutions AS r ON c.BallotID = r.BallotID AND c.CommentID = r.CommentID ' +
				'LEFT JOIN results ON c.BallotID = results.BallotID AND c.CommenterSAPIN = results.SAPIN ' +
				'LEFT JOIN users ON r.AssigneeSAPIN = users.SAPIN ' +
			'WHERE c.BallotID = ?;'
		//console.log(SQL);
		const comments = await db.query(SQL, [ballotId])
		/*for (let c of comments) {
			if (c.ResolutionCount > 1) {
				c.CommentID = c.CommentID + c.ResolutionID/10
			}
		}*/
		return comments

		/*
		// Join the comments and resolutions tables. Each comment has an array of resolutions.
		var comments = results[0];
		//var resolutions = results[1];
		for (let c of comments) {
			if (c.Vote !== 'Disapprove') {
				c.MustSatisfy = 0
			}
			c.resolutions = [];
			resolutions.forEach(r => {
				if (c.BallotID === r.BallotID && c.CommentID === r.CommentID) {
					delete r.BallotID;
					delete r.CommentID;
					c.resolutions.push(r);
				}
			})
		}
		return comments*/
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

	module.updateResolution = (req, res, next) => {
		console.log(req.body);

		if (!req.body.hasOwnProperty('BallotID') ||
			!req.body.hasOwnProperty('CommentID') ||
			!req.body.hasOwnProperty('ResolutionID')) {
			return Promise.reject('Missing BallotID, CommentID and/or ResolutionID');
		}

		var ballotId = req.body.BallotID;
		var commentId = req.body.CommentID;
		var resolutionId = req.body.ResolutionID;
		delete req.body.BallotID;
		delete req.body.CommentID;
		delete req.body.ResolutionID;

		return db.query("UPDATE resolutions SET ? WHERE (BallotID=? AND CommentID=? AND ResolutionID=?)",
			[req.body, ballotId, commentId, resolutionId])
	}

	module.addResolution = (req, res, next) => {
		console.log(req.body);

		if (!req.body.hasOwnProperty('BallotID') ||
		    !req.body.hasOwnProperty('CommentID') ||
		    !req.body.hasOwnProperty('ResolutionID')) {
			return Promise.reject('Missing BallotID, CommentID and/or ResolutionID')
		}
		var SQL =
			db.format('INSERT INTO resolutions SET ?;',
				[req.body]) +
			db.format('SELECT r.*, u.Name AS AssigneeName FROM resolutions AS r LEFT JOIN users AS u ON (r.AssigneeSAPIN = u.SAPIN) WHERE BallotID=? AND CommentID=? AND ResolutionID=?',
				[req.body.BallotID, req.body.CommentID, req.body.ResolutionID]);

		return db.query(SQL)
			.then(results => {
				if (results.length !== 2 || results[1].length !== 1) {
					throw "Unexpected result"
				}
				console.log(results[1][0])
				return results[1][0];
			})
	}

	module.deleteResolution = (req, res, next) => {
		console.log(req.body);

		if (!req.body.hasOwnProperty('BallotID') ||
		    !req.body.hasOwnProperty('CommentID') ||
		    !req.body.hasOwnProperty('ResolutionID')) {
			return Promise.reject('Missing BallotID, CommentID and/or ResolutionID')
		}

		return db.query('DELETE FROM resolutions WHERE BallotID=? AND CommentID=? AND ResolutionID=?',
			[req.body.BallotID, req.body.CommentID, req.body.ResolutionID])
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

	module.uploadComments = function (req, res, next) {
		console.log(req.body);

		const ballotId = req.body.BallotID;
		const startCommentId = req.body.StartCID || 1;
		if (!ballotId) {
			return Promise.reject('Missing parameter BallotID')
		}

		console.log(req.file)
		if (!req.file) {
			return Promise.reject('Missing file')
		}
		var comments = parsePollComments(startCommentId, req.file.buffer);
		//console.log(comments);

		var SQL = db.format('DELETE FROM comments WHERE BallotID=?;', [ballotId]);
		if (comments.length) {
			SQL += `INSERT INTO comments (BallotID, ${Object.keys(comments[0])}) VALUES`;
			comments.forEach((c, i) => {
				SQL += (i > 0? ',': '') + `(${db.escape(ballotId)}, ${db.escape(Object.values(c))})`;
			});
			SQL += ';'
		}
		SQL += db.format('SELECT COUNT(*) AS Count, MIN(CommentID) AS CommentIDMin, MAX(CommentID) AS CommentIDMax FROM comments WHERE BallotID=?', [ballotId])
		//console.log(SQL);

		return db.query(SQL)
			.then(results => {
				var summary = results[results.length-1][0]
				return {
					BallotID: ballotId,
					CommentsSummary: summary
				}
			})
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
		var workbook = xlsx.read(req.file.buffer, {type: 'buffer'});
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

	return module;
}