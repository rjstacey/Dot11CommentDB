'use strict'

const db = require('../util/database');

import {parseLegacyCommentsSpreadsheet} from './legacyCommentSpreadsheet'
import {getComments, GET_COMMENTS_SQL, GET_COMMENTS_SUMMARY_SQL} from './comments'

const matchClause = (dbValue, sValue) => {
	if (dbValue === sValue)
		return true;
	if (dbValue.replace(/[0]+$/g, '') === sValue) // Legacy strips trailing 0
		return true;
	if ((sValue.length >= 50 && dbValue.substring(0, sValue.length) === sValue)) // Legacy has 50 character limit for this field
		return true;
	return false;
};

const matchPageLine = (dbValue, sValue) => {
	if (dbValue === sValue)
		return true;
	if (Math.round(parseFloat(dbValue)) === parseInt(sValue)) // Legacy converts page to int
		return true;
	if (isNaN(dbValue)) // Legacy ignores things that aren't numbers
		return true;
	return false;
}

//const pattern = /[^\x20-\x7f]/gm;
//const matchText = (dbValue, sValue) => dbValue === sValue || dbValue.replace(pattern, '') === sValue.replace(pattern, '');


/* For the Comment and Proposed Change columns, compare only basic text.
 *   Line endings might differ: database has \n line endings while spreadsheet has \r\n line endings.
 *   Only compare ASCII characters that are not control characters.
 *   A ' at the begining of the comment is interpreted as a text identified in Excel
 *
 * The Access database mangles the comment text when it has unicode characters:
 *   μ becomes ++ or Î¼
 *   § becomes -║
 *   × becomes +∙
 *   Φ becomes +¬
 *   α becomes ªª
 *   。 becomes ╥╟Θ
 */
const matchText = (dbValue, sValue) => {
	if (dbValue === sValue)
		return true;
	const garbledDbValue = Buffer.from(dbValue, 'utf8').toString('latin1');
	const pattern = /^'|[^(\x20-\x7f)]|\+|-/gm;	// ASCII, no control characters
	//console.log(garbledDbValue.replace(pattern, ''))
	//console.log(sValue.replace(pattern, ''))
	if (garbledDbValue.replace(pattern, '') === sValue.replace(pattern, ''))
		return true;
	return false;
}

const comparisons = [
	(dbC, sC) => dbC.Category === sC['Type of Comment'],
	(dbC, sC) => matchClause(dbC.C_Clause, sC['Clause Number(C)']),
	(dbC, sC) => matchPageLine(dbC.C_Page, sC['Page(C)']),
	(dbC, sC) => matchPageLine(dbC.C_Line, sC['Line(C)']),
	(dbC, sC) => matchText(dbC.Comment, sC['Comment']),
	(dbC, sC) => matchText(dbC.ProposedChange, sC['Proposed Change']),
	//(dbC, sC) => dbC.CommenterName === sC['Commenter'],
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

	const comps = comparisons.slice()
	for (let i = 0; i < comparisons.length; i++) {
		console.log('trial', i)
		let matched = [];				// paired dbComments and sheetComments
		let dbCommentsRemaining = [];	// dbComments with no match
		let sheetCommentsRemaining = sheetComments.slice();
		dbComments.sort((a, b) => a.C_Index - b.C_Index);
		dbComments.forEach(dbC => {
			let sC = findMatchByEliminationUsingTheseComparisons(dbC, sheetCommentsRemaining, comps);
			if (sC) {
				matched.push({dbComment: dbC, sheetComment: sC});
				const i = sheetCommentsRemaining.findIndex(c => c === sC);
				sheetCommentsRemaining.splice(i, 1);
			}
			else {
				dbCommentsRemaining.push(dbC);
			}
		});
		if (dbCommentsRemaining.length === 0)
			return [matched, dbCommentsRemaining, sheetCommentsRemaining];
		comps.push(comps.shift())
	}

	return [[], dbComments, sheetComments];
}

/*
 * Try to find a match for each comment in turn
 */
function matchComment(sheetComments, dbComments) {

	let matched = [];				// paired dbComments and sheetComments
	let dbCommentsRemaining = [];	// dbComments with no match
	let sheetCommentsRemaining = sheetComments.slice();
	dbComments.forEach(dbC => {
		// The reducer function runs through each of the comparisons and as long as it passes (returns true)
		// it continues. If a comparisong fails the result fails.
		const i = sheetCommentsRemaining.findIndex(sC => comparisons.reduce((acc, comp) => acc && comp(dbC, sC), true));
		if (i >= 0) {
			matched.push({dbComment: dbC, sheetComment: sheetCommentsRemaining[i]});
			sheetCommentsRemaining.splice(i, 1);
		}
		else {
			dbCommentsRemaining.push(dbC);
		}
	});

	return [matched, dbCommentsRemaining, sheetCommentsRemaining];
}

/*
 * Match by comment ID
 */
function matchCID(sheetComments, dbComments) {
	let matched = [];				// paired dbComments and sheetComments
	let dbCommentsRemaining = [];	// dbComments with no match
	let sheetCommentsRemaining = sheetComments.slice();
	dbComments.forEach(dbC => {
		const i = sheetCommentsRemaining.findIndex(sC => parseInt(sC['CID']) === dbC.CommentID);
		if (i >= 0) {
			matched.push({dbComment: dbC, sheetComment: sheetCommentsRemaining[i]});
			sheetCommentsRemaining.splice(i, 1);
		}
		else {
			dbCommentsRemaining.push(dbC);
		}
	});

	return [matched, dbCommentsRemaining, sheetCommentsRemaining]
}

const FieldsToUpdate = {
	CID: 'cid',
	ClausePage: 'clausepage',
	AdHoc: 'adhoc',
	CommentGroup: 'commentgroup',
	Assignee: 'assignee',
	Resolution: 'resolution',
	Editing: 'editing'
};

const MatchAlgo = {
	'cid': matchCID,
	'comment': matchComment,
	'elimination': matchByElimination
};

const MatchUpdate = {
	All: 'all',
	Any: 'any',
	Add: 'add'
};

function commentUpdate(toUpdate, c, cs) {
	const u = {}

	if (toUpdate.includes(FieldsToUpdate.CID)) {
		u.CommentID = cs['CID'];
	}

	if (toUpdate.includes(FieldsToUpdate.ClausePage)) {
		u.Clause = cs['Clause'];
		u.Page = parseFloat(cs['Page']);
		if (isNaN(u.Page)) {u.Page = 0}
	}

	if (toUpdate.includes(FieldsToUpdate.CommentGroup)) {
		u.CommentGroup = cs['Comment Group'];
	}

	if (toUpdate.includes(FieldsToUpdate.AdHoc)) {
		u.AdHoc = cs['Owning Ad-hoc'];
	}

	return Object.keys(u).length? u: null;
}

function resolutionUpdate(toUpdate, c, cs) {
	const n = {}

	if (toUpdate.includes(FieldsToUpdate.CID)) {
		n.CommentID = cs['CID'];
	}

	if (toUpdate.includes(FieldsToUpdate.Assignee)) {
		n.AssigneeName = cs['Assinee'] || '';
	}

	if (toUpdate.includes(FieldsToUpdate.Resolution)) {
		n.ResnStatus = cs['Resn Status'] || '';
		n.Resolution = cs['Resolution'] || '';
		n.ApprovedByMotion = cs['Motion Number'] || '';
	}

	if (toUpdate.includes(FieldsToUpdate.Editing)) {
		n.EditStatus = cs['Edit Status'] || '';
		n.EditNotes = cs['Edit Notes'] || '';
		n.EditInDraft = cs['Edited in Draft'] || '';
	}

	return Object.keys(n).length? n: null;
}

function updateCommentsSQL(ballotId, matched, toUpdate) {

	// See if any of the comment fields need updating
	let updateComments = [],
		updateResolutions = [],
		newResolutions = [];

	matched.forEach(m => {
		const c = m.dbComment
		const cs = m.sheetComment
		const u = commentUpdate(toUpdate, c, cs);
		if (u) {
			u.id = c.id;
			updateComments.push(u);
		}
		const r = resolutionUpdate(toUpdate, c, cs);
		if (r) {
			if (c.resolution_id) {
				r.id = c.resolution_id;
				updateResolutions.push(r);
			}
			else {
				r.comment_id = c.id;
				newResolutions.push(r);
			}
		}
	});

	const SQL =
		updateComments.map(c => {
			const id = c.id;
			delete c.id;
			return db.format('UPDATE comments SET ? WHERE id=?', [c, id]);
		})
		.concat(
			updateResolutions.map(r => {
				const id = r.id;
				delete r.id;
				return db.format('UPDATE resolutions SET ? WHERE id=?', [r, id]);
			})
		)
		.concat(
			newResolutions.map(r => {
				return db.format(
					'INSERT INTO resolutions (BallotID, ??) VALUE (?, ?)',
					[Object.keys(r), ballotId, Object.values(r)]
				);
			})
		)
		.join(';');

	return SQL;
}

function addCommentsSQL(ballotId, sheetComments, toUpdate) {

	const update = toUpdate.filter(f => f !== FieldsToUpdate.CID).concat(FieldsToUpdate.ClausePage)
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
		newComments.push(c);

		const r = resolutionUpdate(update, c, cs);
		if (r) {
			r.CommentID = c.CommentID;
			newResolutions.push(r);
		}
	});

	const SQL =
		newComments.map(c => 
			db.format(
				'INSERT INTO comments (BallotID, ballot_id, ??) VALUE (?, (SELECT id FROM ballots WHERE BallotID=?), ?)',
				[Object.keys(c), ballotId, ballotId, Object.values(c)]
			)
		)
		.concat(
			newResolutions.map(r => {
				const commentId = r.CommentID;
				delete r.CommentID;
				return db.format(
					'INSERT INTO resolutions (BallotID, comment_id, ??) VALUE (?, (SELECT c.id FROM comments c JOIN ballots b ON b.id=c.ballot_id WHERE b.BallotID=? AND c.CommentID=?), ?)',
					[Object.keys(r), ballotId, ballotId, commentId, Object.values(r)]
				)
			})
		)
		.join(';');

	return SQL;
}

export async function uploadResolutions(ballotId, toUpdate, matchAlgorithm, matchUpdate, sheetName, file) {

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
		throw `For successive elimination, match update cannot be \'${MatchUpdate.Any}\'.`;
	}

	const t1 = Date.now();
	const sheetComments = await parseLegacyCommentsSpreadsheet(file.buffer, sheetName);
	const t2 = Date.now();
	const dbComments = await getComments(ballotId);
	const t3 = Date.now();

	let [matched, dbCommentsRemaining, sheetCommentsRemaining] = MatchAlgo[matchAlgorithm](sheetComments, dbComments);
	//console.log(matched.length, dbCommentsRemaining.length, sheetCommentsRemaining.length)

	const t4 = Date.now();
	let SQL;
	let unmatched = [], added = [], remaining = [];
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
		matched = matched.map(m => m.dbComment.CommentID);
		remaining = sheetCommentsRemaining.map(c => c['CID']);
	}
	else if (matchUpdate === MatchUpdate.Any) {
		SQL = updateCommentsSQL(ballotId, matched, toUpdate);
		matched = matched.map(m => m.dbComment.CommentID);
		unmatched = dbCommentsRemaining.map(c => c.CommentID);
		remaining = sheetCommentsRemaining.map(c => c['CID']);
	}
	else if (matchUpdate === MatchUpdate.Add) {
		SQL = addCommentsSQL(ballotId, sheetCommentsRemaining, toUpdate);
		matched = [];
		added = sheetCommentsRemaining.map(c => c['CID']);
	}
	if (SQL)
		SQL += ';'
	SQL += db.format(GET_COMMENTS_SQL + 'WHERE b.BallotID=? ORDER BY c.CommentID;', [ballotId]);
	SQL += db.format(GET_COMMENTS_SUMMARY_SQL, [ballotId]);
	const t5 = Date.now();

	//const fs = require('fs');
	//fs.writeFile("sql.txt", SQL, (err) => {if (err) {console.log(err)}})
	//console.log(SQL);

	const results = await db.query(SQL)
	const t6 = Date.now();

	console.log(`parse spreadsheet: ${t2-t1}ms`)
	console.log(`get comments: ${t3-t2}ms`)
	console.log(`match algo: ${t4-t3}ms`)
	console.log(`generate sql: ${t5-t4}ms`)
	console.log(`update database: ${t6-t5}ms`)
	console.log(`total: ${t6-t1}ms`)

	//console.log(results)
	return {
		BallotID: ballotId,
		comments: results[results.length-2],
		summary: results[results.length-1][0],
		matched,
		unmatched,
		added,
		remaining
	}
}
