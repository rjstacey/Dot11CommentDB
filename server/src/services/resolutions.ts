
import { v4 as uuid, validate as validateUUID } from 'uuid';

import db from '../utils/database';

import {getComments, CommentResolution} from './comments';
import {genCommentsSpreadsheet} from './commentsSpreadsheet';
import {myProjectAddResolutions} from './myProjectSpreadsheets';

export type Resolution = {
	id: string;
	comment_id: bigint;
	ResolutionID: number;
	AssigneeSAPIN: number | null;
	AssigneeName: string | null;
	ResnStatus: 'A' | 'V' | 'J' | null;
	Resolution: string | null;
	ApprovedByMotion: string;
	ReadyForMotion: boolean;
	Submission: string;
	EditStatus: string;
	EditNotes: string;
	EditInDraft: string;
	LastModifiedBy: number;
	LastModifiedTime: string;
}

const defaultResolution = {
	ResolutionID: 0,
	AssigneeSAPIN: 0,
	AssigneeName: '',
	ResnStatus: '',
	Resolution: '',
	Submission: '',
	ReadyForMotion: 0,
	ApprovedByMotion: '',
	EditStatus: '',
	EditInDraft: '',
	EditNotes: '',
};

async function addResolution(userId: number, resolution: Partial<Resolution>) {

	if (!resolution.comment_id)
		throw new TypeError('Missing comment_id');

	const id = validateUUID(resolution.id || '')? resolution.id!: uuid();
	delete resolution.id;

	let ResolutionID: number | null | undefined;
	ResolutionID = resolution.ResolutionID;
	if (ResolutionID === undefined) {
		/* Find smallest unused ResolutionID */
		let result = await db.query(
			'SELECT MIN(r.ResolutionID)-1 AS ResolutionID FROM resolutions r WHERE comment_id=?;',
			[resolution.comment_id]
		) as [{ResolutionID: number | null}];
		ResolutionID = result[0].ResolutionID
		//console.log(result)
		if (ResolutionID === null) {
			ResolutionID = 0;
		}
		else if (ResolutionID < 0) {
			let result = await db.query(
				'SELECT ' +
					'r1.ResolutionID+1 AS ResolutionID ' +
				'FROM resolutions r1 LEFT JOIN resolutions r2 ON r1.ResolutionID+1=r2.ResolutionID AND r1.comment_id=r2.comment_id ' +
				'WHERE r2.ResolutionID IS NULL AND r1.comment_id=? LIMIT 1;',
				[resolution.comment_id]
			) as [{ResolutionID: number}];
			//console.log(result)
			ResolutionID = result[0].ResolutionID
		}
	}
	else if (typeof ResolutionID !== 'number') {
		throw new TypeError('Invalid ResolutionID; must be number');
	}
	//console.log(resolutionId)

	const entry = {
		...defaultResolution,
		...resolution,
		ResolutionID
	}

	await db.query2('INSERT INTO resolutions SET id=UUID_TO_BIN(?), ?, LastModifiedBy=?, LastModifiedTime=NOW();', [id, entry, userId]);
	return id;
}

export async function addResolutions(userId: number, resolutions: Partial<Resolution>[], ballot_id: number, modifiedSince: string) {
	//console.log(resolutions)
	const resolution_ids = await Promise.all(resolutions.map(r => addResolution(userId, r)));
	const comment_ids = resolutions.map(r => r.comment_id)
	//const comments = await db.query('SELECT * FROM commentResolutions WHERE comment_id IN (?);', [comment_ids]);
	const comments = await getComments(ballot_id, modifiedSince);
	return {comments}
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

async function updateResolution(userId: number, id: string, changes: Partial<Resolution>) {
	if (Object.keys(changes).length > 0)
		await db.query('UPDATE resolutions SET ?, LastModifiedBy=?, LastModifiedTime=NOW() WHERE id=UUID_TO_BIN(?);', [changes, userId, id]);
	//const [comment] = await db.query("SELECT id, resolution_id, CID, ??, LastModifiedBy, LastModifiedTime FROM commentResolutions WHERE resolution_id=?;", [Object.keys(changes), id]);
	//return comment;
}

type ResolutionUpdate = {
	id: string;
	changes: Partial<Resolution>;
}
export async function updateResolutions(userId: number, updates: ResolutionUpdate[], ballot_id: number, modifiedSince?: string) {
	// Validate request
	for (const u of updates) {
		if (typeof u !== 'object' || !u.id || typeof u.changes !== 'object')
			throw new TypeError('Expected array of objects with shape {id, changes}');
	}
	await Promise.all(updates.map(u => updateResolution(userId, u.id, u.changes)));
	const comments = await getComments(ballot_id, modifiedSince);
	return {comments};
}

export async function deleteResolutions(userId: number, ids: string[], ballot_id: number, modifiedSince?: string) {
	if (ids.length === 0)
		return 0;
	const results = await db.query('DELETE FROM resolutions WHERE BIN_TO_UUID(id) IN (?)', [ids]);
	const comments = await getComments(ballot_id, modifiedSince);
	//return results.affectedRows;
	return {comments};
}

export async function exportResolutionsForMyProject(ballot_id: number, filename: string, file: any, res) {
	
	const comments = await db.query(
		"SELECT * FROM commentResolutions " + 
			"WHERE ballot_id=? " +
				"AND ApprovedByMotion IS NOT NULL AND ApprovedByMotion <> '' " +
				"AND ResnStatus IS NOT NULL AND ResnStatus <> '' " +
			"ORDER BY CommentID, ResolutionID;",
		[ballot_id]
	) as CommentResolution[];

	res.attachment(filename || 'comments_resolved.xlsx');
	await myProjectAddResolutions(file.buffer, comments, res);
	res.end();
}

export async function exportSpreadsheet(
	user,
	ballot_id: number,
	filename: string,
	format,
	style,
	file,
	res
) {
	const SQL =
		db.format('SELECT * FROM commentResolutions WHERE ballot_id=? ORDER BY CommentID, ResolutionID; ', [ballot_id]) +
		db.format('SELECT BallotID, Document FROM ballots WHERE id=?;', [ballot_id]);
	const [comments, ballots] = await db.query(SQL) as [CommentResolution[], {BallotID: string, Document: string}[]];
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