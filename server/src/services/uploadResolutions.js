
import { v4 as uuid } from 'uuid';

import db from '../utils/database';

import {parseCommentsSpreadsheet} from './commentsSpreadsheet';
import {getComments, getCommentsSummary} from './comments';

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
	//const pattern = /^'|[^(\x20-\x7f)]|\+|-/gm;	// ASCII, no control characters
	const pattern = /^'|[^(\x20-\x7f)]|\+|-| /gm;	// ASCII, no control characters, no space (myProject converts newline to space)
	if (garbledDbValue.replace(pattern, '') === sValue.replace(pattern, ''))
		return true;
	return false;
}

const comparisons = [
	(dbC, sC) => dbC.Category === sC.Category,
	(dbC, sC) => matchClause(dbC.C_Clause, sC.C_Clause),
	(dbC, sC) => matchPageLine(dbC.C_Page, sC.C_Page),
	(dbC, sC) => matchPageLine(dbC.C_Line, sC.C_Line),
	(dbC, sC) => matchText(dbC.Comment, sC.Comment),
	(dbC, sC) => matchText(dbC.ProposedChange, sC.ProposedChange),
	//(dbC, sC) => dbC.CommenterName === sC.CommenterName,
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
		const i = sheetCommentsRemaining.findIndex(sC => parseInt(sC.CID) === dbC.CommentID);
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
		u.CommentID = cs.CID;
	}

	if (toUpdate.includes(FieldsToUpdate.ClausePage)) {
		if ((c.Clause || cs.Clause) && c.Clause !== cs.Clause)
			u.Clause = cs.Clause;
		if ((c.Clause || cs.Clause) && c.Page !== cs.Page)
			u.Page = c.Page;
	}

	if (toUpdate.includes(FieldsToUpdate.AdHoc)) {
		if ((c.AdHoc || cs.AdHoc) && c.AdHoc !== cs.AdHoc)
			u.AdHoc = cs.AdHoc || '';
		if ((c.CommentGroup || cs.CommentGroup) && c.CommentGroup !== cs.CommentGroup)
			u.CommentGroup = cs.CommentGroup || '';
		if ((c.Notes || cs.Notes) && c.Notes !== cs.Notes)
			u.Notes = cs.Notes || '';
	}

	return Object.keys(u).length? u: null;
}

function resolutionUpdate(toUpdate, c, cs) {
	const n = {}

	if (toUpdate.includes(FieldsToUpdate.Assignee)) {
		if ((c.AssigneeName || cs.AssigneeName) && c.AssigneeName !== cs.AssigneeName) {
			n.AssigneeName = cs.AssigneeName || '';
			n.AssigneeSAPIN = 0;
		}
	}

	if (toUpdate.includes(FieldsToUpdate.Resolution)) {
		if ((c.Submission || cs.Submission) && c.Submission !== cs.Submission)
			n.Submission = cs.Submission;
		if ((c.Resolution || cs.Resolution) && c.Resolution !== cs.Resolution)
			n.Resolution = cs.Resolution;
		if ((c.ResnStatus || cs.ResnStatus) && c.ResnStatus !== cs.ResnStatus)
			n.ResnStatus = cs.ResnStatus;
		// In the legacy spreadsheet there is no "Ready For Motion" column (value is undefiend)
		// For the legacy spreadsheet we leave this unchanged
		if (cs.ReadyForMotion !== undefined && (c.ReadyForMotion || cs.ReadyForMotion) && c.ReadyForMotion !== cs.ReadyForMotion)
			n.ReadyForMotion = cs.ReadyForMotion || '';
		if ((c.ApprovedByMotion || cs.ApprovedByMotion) && c.ApprovedByMotion !== cs.ApprovedByMotion)
			n.ApprovedByMotion = cs.ApprovedByMotion || '';
	}

	if (toUpdate.includes(FieldsToUpdate.Editing)) {
		if ((c.EditStatus || cs.EditStatus) && c.EditStatus !== cs.EditStatus)
			n.EditStatus = cs.EditStatus || '';
		if ((c.EditNotes || cs.EditNotes) && c.EditNotes !== cs.EditNotes)
			n.EditNotes = cs.EditNotes || '';
		if ((c.EditInDraft || cs.EditInDraft) && c.EditInDraft !== cs.EditInDraft)
			n.EditInDraft = cs.EditInDraft || '';
	}

	return Object.keys(n).length? n: null;
}

async function updateComments(userId, ballot_id, matched, toUpdate) {

	// See if any of the comment fields need updating
	let updateComments = [],
		updateResolutions = [],
		newResolutions = [];

	let count = 0;
	matched.forEach(m => {
		const c = m.dbComment
		const cs = m.sheetComment
		const u = commentUpdate(toUpdate, c, cs);
		if (u) {
			u.id = c.comment_id;
			updateComments.push(u);
		}
		const r = resolutionUpdate(toUpdate, c, cs);
		if (r) {
			if (c.resolution_id) {
				r.id = c.resolution_id;
				updateResolutions.push(r);
			}
			else {
				r.comment_id = c.comment_id;
				newResolutions.push(r);
			}
		}
		if (u || r)
			count++;
	});

	//console.log('comments updated: ', updateComments.length, 'resolutions updated: ', updateResolutions.length, 'new resolutions: ', newResolutions.length);

	let SQL = '';

	SQL +=
		updateComments.map(c => {
			const id = c.id;
			delete c.id;
			c.LastModifiedBy = userId;
			return db.format('UPDATE comments SET ?, LastModifiedTime=NOW() WHERE id=?', [c, id]);
		})
		.concat(
			updateResolutions.map(r => {
				const id = r.id;
				delete r.id;
				r.LastModifiedBy = userId;
				return db.format('UPDATE resolutions SET ?, LastModifiedTime=NOW() WHERE id=UUID_TO_BIN(?)', [r, id]);
			})
		)
		.join(';');

	if (SQL)
		SQL += ';'

	/* A single insert statement with 'duplicate on key update' is slightly faster than individual update statements.
	 * But, as an insert, it is logged as an 'add'. And has side effects like failing if there is an unset column
	 * without a default value. */
/*
	let kvPairs = {};
	updateComments.forEach(c => {
		c.LastModifiedBy = userId;
		const keys = Object.keys(c).join(',');
		if (!kvPairs[keys])
			kvPairs[keys] = [];
		kvPairs[keys].push(db.escape(Object.values(c)));
	})
	for (const [keys, values] of Object.entries(kvPairs)) {
		const K = keys.split(',').filter(k => k !== 'id');
		SQL += `INSERT INTO comments (${keys},LastModifiedTime) VALUES ` +
			values.map(v => `(${v}, NOW())`).join(',') +
			' ON DUPLICATE KEY UPDATE ' +
			K.map(k => `${k}=VALUES(${k})`).join(', ') + ', LastModifiedTime=VALUES(LastModifiedTime)' +
			';'
	}

	kvPairs = {};
	updateResolutions.forEach(r => {
		r.LastModifiedBy = userId;
		const keys = Object.keys(r).join(',');
		if (!kvPairs[keys])
			kvPairs[keys] = [];
		kvPairs[keys].push(db.escape(Object.values(r)));
	})
	for (const [keys, values] of Object.entries(kvPairs)) {
		const K = keys.split(',').filter(k => k !== 'id');
		SQL += `INSERT INTO resolutions (${keys},LastModifiedTime) VALUES ` +
			values.map(v => `(${v}, NOW())`).join(',') +
			' ON DUPLICATE KEY UPDATE ' +
			K.map(k => `${k}=VALUES(${k})`).join(', ') + ', LastModifiedTime=VALUES(LastModifiedTime)' +
			';'
	}
*/

	/* A single insert statement is much faster than individual insert statements. */
	let kvPairs = {};
	newResolutions.forEach(r => {
		r.LastModifiedBy = userId;
		const keys = Object.keys(r).join(',');
		if (!kvPairs[keys])
			kvPairs[keys] = [];
		kvPairs[keys].push(db.escape(Object.values(r)));
	});
	for (const [keys, values] of Object.entries(kvPairs)) {
		SQL += `INSERT INTO resolutions (id,${keys},LastModifiedTime) VALUES ` +
			values.map(v => `(UUID_TO_BIN(${uuid()}), ${v}, NOW())`).join(',') +
			';'
	}

	//console.log(SQL)
	if (SQL)
		await db.query(SQL);

	return count;
}

async function addComments(userId, ballot_id, sheetComments, toUpdate) {

	const update = toUpdate.filter(f => f !== FieldsToUpdate.CID).concat(FieldsToUpdate.ClausePage)
	const newComments = [];
	const newResolutions = [];

	sheetComments.forEach(cs => {
		let c = {
			CommentID: cs.CID,
			CommenterName: cs.CommenterName,
			Category: cs.Category,
			C_Clause: cs.C_Clause,
			C_Page: cs.C_Page,
			C_Line: cs.C_Line,
			Comment: cs.Comment,
			ProposedChange: cs.ProposedChange,
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
		newComments.map(c => {
			c.LastModifiedBy = userId;
			return db.format(
				'INSERT INTO comments (ballot_id, ??, LastModifiedTime) VALUE (?, ?, NOW())',
				[Object.keys(c), ballot_id, Object.values(c)]
			)
		})
		.concat(
			newResolutions.map(r => {
				const commentId = r.CommentID;
				delete r.CommentID;
				r.LastModifiedBy = userId;
				return db.format(
					'INSERT INTO resolutions ' +
						'(comment_id, ??, LastModifiedTime) ' + 
						'VALUE ((SELECT id FROM comments WHERE ballot_id=? AND CommentID=?), ?, NOW())',
					[Object.keys(r), ballot_id, commentId, Object.values(r)]
				)
			})
		)
		.join(';');

	await db.query(SQL);
}

export async function uploadResolutions(userId, ballot_id, toUpdate, matchAlgorithm, matchUpdate, sheetName, file) {

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
	const sheetComments = await parseCommentsSpreadsheet(file.buffer, sheetName);
	const t2 = Date.now();
	const dbComments = await getComments(ballot_id);
	const t3 = Date.now();

	let [matched, dbCommentsRemaining, sheetCommentsRemaining] = MatchAlgo[matchAlgorithm](sheetComments, dbComments);
	console.log(matched.length, dbCommentsRemaining.length, sheetCommentsRemaining.length)

	const t4 = Date.now();
	let SQL, updated = 0;
	let unmatched = [], added = [], remaining = [];
	if (matchUpdate === MatchUpdate.All) {
		if (dbCommentsRemaining.length > 0) {
			throw `No update\n` +
				`${matched.length} entries match\n` +
				`${dbCommentsRemaining.length} unmatched database entries:\n` +
				dbCommentsRemaining.map(c => c.CommentID).join(', ') + '\n' +
				`${sheetCommentsRemaining.length} unmatched spreadsheet entries:\n` +
				sheetCommentsRemaining.map(c => c.CID).join(', ')
		}

		updated = await updateComments(userId, ballot_id, matched, toUpdate);
		matched = matched.map(m => m.dbComment.CommentID);
		remaining = sheetCommentsRemaining.map(c => c.CID);
	}
	else if (matchUpdate === MatchUpdate.Any) {
		updated = await updateComments(userId, ballot_id, matched, toUpdate);
		matched = matched.map(m => m.dbComment.CommentID);
		unmatched = dbCommentsRemaining.map(c => c.CommentID);
		remaining = sheetCommentsRemaining.map(c => c.CID);
	}
	else if (matchUpdate === MatchUpdate.Add) {
		await addComments(userId, ballot_id, sheetCommentsRemaining, toUpdate);
		matched = [];
		added = sheetCommentsRemaining.map(c => c.CID);
	}

	const t5 = Date.now();

	const comments = await getComments(ballot_id);
	const summary = await getCommentsSummary(ballot_id);
	delete summary.id;

	const t6 = Date.now();

	console.log(`parse spreadsheet: ${t2-t1}ms`)
	console.log(`get comments: ${t3-t2}ms`)
	console.log(`match algo: ${t4-t3}ms`)
	console.log(`update database: ${t5-t4}ms`)
	console.log(`get updated comments: ${t6-t5}ms`)
	console.log(`total: ${t6-t1}ms`)

	const ballot = {
		id: ballot_id,
		Comments: summary
	};

	return {
		comments,
		ballot,
		matched,
		unmatched,
		remaining,
		added,
		updated
	}
}
