'use strict';

const db = require('../util/database')
import {genCommentsSpreadsheet} from './commentsSpreadsheet';
import {myProjectAddResolutions} from './myProjectSpreadsheets';

const GET_RESOLUTIONS_SQL =
	'SELECT ' +
		'r.id, b.BallotID, c.CommentID, r.ResolutionID, r.AssigneeSAPIN, r.ResnStatus, r.Resolution, r.Submission, r.ReadyForMotion, r.ApprovedByMotion, ' + 
		'r.EditStatus, r.EditInDraft, r.EditNotes, r.Notes, ' +
		'users.Name AS AssigneeName ' +
	'FROM ballots b JOIN comments c ON b.id=c.ballot_id JOIN resolutions r ON c.id=r.comment_id ' +
		'LEFT JOIN users ON r.AssigneeSAPIN = users.SAPIN ';

async function addResolution(userId, resolution) {
	let resolutionId
	if (!resolution.comment_id) {
		throw 'Missing comment_id'
	}
	if (!resolution.hasOwnProperty('ResolutionID') || resolution.ResolutionID === null) {
		/* Find smallest unused ResolutionID */
		let result = await db.query(
			'SELECT MIN(r.ResolutionID)-1 AS ResolutionID FROM resolutions r WHERE comment_id=?;',
			[resolution.comment_id]
		);
		resolutionId = result[0].ResolutionID
		//console.log(result)
		if (resolutionId === null) {
			resolutionId = 0
		}
		else if (resolutionId < 0) {
			result = await db.query(
				'SELECT ' +
					'r1.ResolutionID+1 AS ResolutionID ' +
				'FROM resolutions r1 LEFT JOIN resolutions r2 ON r1.ResolutionID+1=r2.ResolutionID AND r1.comment_id=r2.comment_id ' +
				'WHERE r2.ResolutionID IS NULL AND r1.comment_id=? LIMIT 1;',
				[resolution.comment_id]
			);
			//console.log(result)
			resolutionId = result[0].ResolutionID
		}
	}
	else {
		resolutionId = resolution.ResolutionID
	}
	//console.log(resolutionId)

	const entry = {
		comment_id: resolution.comment_id,
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
	}
	for (let key of Object.keys(entry)) {
		if (entry[key] === undefined) {
			delete entry[key]
		}
	}

	const [result] = await db.query2('INSERT INTO resolutions SET ?, LastModifiedBy=?, LastModifiedTime=NOW();', [entry, userId]);
	return result.insertId
}

export async function addResolutions(userId, resolutions) {
	//console.log(resolutions)
	const resolution_ids = await Promise.all(resolutions.map(r => addResolution(userId, r)));
	const comment_ids = resolutions.map(r => r.comment_id)
	const comments = await db.query('SELECT * FROM commentResolutions WHERE comment_id IN (?);', [comment_ids]);
	const newCIDs = resolution_ids.map(id => {
		const c = comments.find(c => c.resolution_id === id)
		return c? c.CID: '';
	})
	return {
		comments,
		newCIDs
	}
}

function resolutionEntry(changes) {
	const entry = {
		comment_id: changes.comment_id,
		ResolutionID: changes.ResolutionID,
		AssigneeSAPIN: changes.AssigneeSAPIN,
		AssigneeName: changes.AssigneeName,
		ResnStatus: changes.ResnStatus,
		Resolution: changes.Resolution,
		Submission: changes.Submission,
		ReadyForMotion: changes.ReadyForMotion,
		ApprovedByMotion: changes.ApprovedByMotion,
		EditStatus: changes.EditStatus,
		EditNotes: changes.EditNotes,
		EditInDraft: changes.EditInDraft
	}

	for (let key of Object.keys(entry)) {
		if (entry[key] === undefined)
			delete entry[key]
	}

	return entry;
}

async function updateResolution(userId, id, changes) {
	const entry = resolutionEntry(changes);
	if (Object.keys(entry).length > 0)
		await db.query('UPDATE resolutions SET ?, LastModifiedBy=?, LastModifiedTime=NOW() WHERE id=?;', [entry, userId, id]);
	const [comment] = await db.query("SELECT id, resolution_id, CID, ??, LastModifiedBy, LastModifiedTime FROM commentResolutions WHERE resolution_id=?;", [Object.keys(changes), id]);
	return comment;
}

export async function updateResolutions(userId, updates) {
	// Validate request
	for (const u of updates) {
		if (typeof u !== 'object' || !u.id || typeof u.changes !== 'object')
			throw 'Expected array of objects with shape {id, changes}'
	}
	const comments = await Promise.all(updates.map(u => updateResolution(userId, u.id, u.changes)));
	return {comments};
}

export async function deleteResolutions(userId, ids) {
	if (ids.length > 0) {
		const rows = await db.query('SELECT comment_id FROM resolutions WHERE id IN (?);', [ids]);
		if (rows.length) {
			const comment_ids = rows.map(r => r.comment_id);
			await db.query('DELETE FROM resolutions WHERE id IN (?);', [ids]);
			const comments = await db.query('SELECT * FROM commentResolutions WHERE comment_id IN (?);', [comment_ids]);
			return {comments}
		}
	}
	return {comments: []};
}

export async function exportResolutionsForMyProject(ballotId, filename, file, res) {
	
	const comments = await db.query(
		"SELECT * FROM commentResolutions " + 
			"WHERE BallotID=? " +
				"AND ApprovedByMotion IS NOT NULL AND ApprovedByMotion <> '' " +
				"AND ResnStatus IS NOT NULL AND ResnStatus <> '' " +
			"ORDER BY CommentID, ResolutionID;",
		[ballotId]
	);

	res.attachment(filename || 'comments_resolved.xlsx');
	await myProjectAddResolutions(file.buffer, comments, res);
	res.end();
}

export async function exportSpreadsheet(user, ballot_id, filename, format, style, file, res) {
	const SQL =
		db.format('SELECT * FROM commentResolutions WHERE ballot_id=? ORDER BY CommentID, ResolutionID; ', [ballot_id]) +
		db.format('SELECT BallotID, Document FROM ballots WHERE id=?;', [ballot_id]);
	const [comments, ballots] = await db.query(SQL);
	let doc = '';
	let ballotId = '';
	if (ballots.length > 0) {
		doc = ballots[0].Document;
		ballotId = ballots[0].BallotID;
	}

	res.attachment(filename || 'comments.xlsx');
	await genCommentsSpreadsheet(user, ballotId, format, style, doc, comments, file, res);
	res.end();
}
