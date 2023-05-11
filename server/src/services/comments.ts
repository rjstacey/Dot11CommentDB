
import { DateTime } from 'luxon';

import db from '../utils/database';
import type { OkPacket } from 'mysql2';

import {parseEpollCommentsCsv} from './epoll';
import {parseMyProjectComments, myProjectAddResolutions} from './myProjectSpreadsheets';
import {BallotType, getBallot} from './ballots';
import type { Resolution } from './resolutions';

export type Comment = {
	id: bigint;
	ballot_id: number;
	CommentID: number;
	CommenterSAPIN: number | null;
	CommenterName: string;
	CommenterEmail: string;
	Category: string;
	C_Clause: string;
	C_Page: string;
	C_Line: string;
	C_Index: number;
	MustSatisfy: boolean;
	Clause: string;
	Page: number;
	Comment: string;
	AdHoc: string;
	Notes: string;
	CommentGroup: string;
	ProposedChange: string;
	LastModifiedBy: number;
	LastModifiedTime: string;
}

export type CommentResolution = Omit<Comment, "id"> & Omit<Resolution, "id"> & {
	resolution_id: string;
	ResolutionID: number;
	ResolutionCount: number;
	CID: string;
	Vote: string;
}

export type CommentsSummary = {
	Count: number;
	CommentIDMin: number;
	CommentIDMax: number;
}

const createViewCommentResolutionsSQL = 
	'CREATE VIEW commentResolutions AS SELECT ' +
		'b.id AS ballot_id, ' +
		'c.id AS comment_id, ' +
		'BIN_TO_UUID(r.id) AS resolution_id, ' +
		//'IF((SELECT count(0) from resolutions r WHERE (c.id = r.comment_id)) > 1, concat(cast(c.id as CHAR), "-", cast(r.id as CHAR)), cast(c.id as CHAR)) AS id, ' +
		'IF(r.id IS NOT NULL, BIN_TO_UUID(r.id), cast(c.id as CHAR)) AS id, ' +
		'IF((SELECT count(0) from resolutions r WHERE (c.id = r.comment_id)) > 1, concat(c.CommentID, ".", r.ResolutionID), c.CommentID) AS CID, ' +
		'b.BallotID AS BallotID, ' +
		'c.CommentID AS CommentID, ' +
		'r.ResolutionID AS ResolutionID, ' +
		'(SELECT count(0) from resolutions r WHERE (c.id = r.comment_id)) AS ResolutionCount, ' +
		'c.CommenterSAPIN AS CommenterSAPIN, ' +
		'c.CommenterEmail AS CommenterEmail, ' +
		'c.CommenterName AS CommenterName, ' +
		'results.Vote AS Vote, ' +
		'c.MustSatisfy AS MustSatisfy, ' +
		'c.Category AS Category, ' +
		'c.Clause AS Clause, ' +
		'c.Page AS Page, ' +
		'c.Comment AS Comment, ' +
		'c.ProposedChange AS ProposedChange, ' +
		'c.C_Page AS C_Page, ' +
		'c.C_Line AS C_Line, ' +
		'c.C_Clause AS C_Clause, ' +
		'c.C_Index AS C_Index, ' +
		'c.AdHoc AS AdHoc, ' +
		'c.CommentGroup AS CommentGroup, ' +
		'c.Notes AS Notes, ' +
		'r.AssigneeSAPIN AS AssigneeSAPIN, ' +
		'r.ResnStatus AS ResnStatus, ' +
		'r.Resolution AS Resolution, ' +
		'r.Submission AS Submission, ' +
		'r.ReadyForMotion AS ReadyForMotion, ' +
		'r.ApprovedByMotion AS ApprovedByMotion, ' +
		'r.EditStatus AS EditStatus, ' +
		'r.EditInDraft AS EditInDraft, ' +
		'r.EditNotes AS EditNotes, ' +
		'COALESCE(m.Name, r.AssigneeName) AS AssigneeName, ' +
		'IF(c.LastModifiedTime > r.LastModifiedTime, c.LastModifiedBy, r.LastModifiedBy) AS LastModifiedBy, ' +
		'IF(c.LastModifiedTime > r.LastModifiedTime, c.LastModifiedTime, r.LastModifiedTime) AS LastModifiedTime ' +
	'FROM ballots b JOIN comments c ON (b.id = c.ballot_id) ' + 
		'LEFT JOIN resolutions r ON (c.id = r.comment_id) ' + 
		'LEFT JOIN members m ON (r.AssigneeSAPIN = m.SAPIN) ' + 
		'LEFT JOIN results ON (b.id = results.ballot_id AND c.CommenterSAPIN = results.SAPIN); ';

export async function initCommentsTables() {
	const SQL =
		'DROP VIEW IF EXISTS commentResolutions;\n' +
		createViewCommentResolutionsSQL;

	//console.log(SQL);

	await db.query(SQL);
}

function selectComments(constraints: object) {
	let sql = 'SELECT * FROM commentResolutions';
	if (Object.keys(constraints).length > 0) {
		sql += ' WHERE ' + Object.entries(constraints).map(
			([key, value]) => {
				if (key === 'modifiedSince')
					return db.format('LastModifiedTime > ?', [value]);
				return db.format(Array.isArray(value)? '?? IN (?)': '??=?', [key, value]);
			}
		).join(' AND ');
	}
	sql += ' ORDER BY CommentID, ResolutionID';
	return db.query(sql) as Promise<CommentResolution[]>;
}

export function getComments(ballot_id?: number, modifiedSince?: string) {
	const constraints: {ballot_id?: number; modifiedSince?: string} = {};
	if (ballot_id)
		constraints.ballot_id = ballot_id;
	if (modifiedSince)
		constraints.modifiedSince = DateTime.fromISO(modifiedSince).toSQL({includeOffset: false});
	return selectComments(constraints);
}

export async function getCommentsSummary(ballot_id: number): Promise<CommentsSummary | undefined> {
	const [summary] = await db.query(
		'SELECT ' +
			'COUNT(*) AS Count, ' +
			'MIN(CommentID) AS CommentIDMin, ' +
			'MAX(CommentID) AS CommentIDMax ' +
		'FROM comments c WHERE ballot_id=?',
		[ballot_id]
	) as [CommentsSummary | undefined];
	return summary;
}

/* Update comment and return an array of comments (from commentResolutions) that change */
async function updateComment(userId: number, id: number, changes: Partial<Comment>) {
	if (Object.keys(changes).length > 0)
		await db.query("UPDATE comments SET ?, LastModifiedBy=?, LastModifiedTime=NOW() WHERE id=?; ", [changes, userId, id]);
	const comments = await db.query("SELECT id, comment_id, CID, ??, LastModifiedBy, LastModifiedTime FROM commentResolutions WHERE comment_id=?;", [Object.keys(changes), id]);
	return comments;
}

export async function updateComments(userId: number, updates, ballot_id: number, lastModified: string) {
	for (const u of updates) {
		if (typeof u !== 'object' || !u.id || typeof u.changes !== 'object')
			throw 'Expected array of objects with shape {id, changes}'
	}
	const results = await Promise.all(updates.map(u => updateComment(userId, u.id, u.changes)));
	/* reduce the results array of arrays to a single array */
	//const comments = results.reduce((all, comments) => all.concat(comments), []);
	const comments = await getComments(ballot_id, lastModified);
	return {comments};
}

export async function setStartCommentId(userId: number, ballot_id: number, startCommentId: number) {
	const SQL = db.format(
		'SET @userId=?;' +
		'SET @ballot_id = ?;' +
		'SET @startCommentId = ?;' +
		'SET @offset = @startCommentId - (SELECT MIN(CommentID) FROM comments WHERE ballot_id=@ballot_id);' +
		'UPDATE comments ' +
			'SET LastModifiedBy=@userId, CommentID=CommentID+@offset ' +
			'WHERE ballot_id=@ballot_id;',
		[userId, ballot_id, startCommentId]
	);
	const results = await db.query(SQL);
	const comments = await getComments(ballot_id);
	const summary = await getCommentsSummary(ballot_id);
	return {
		comments,
		ballot: {id: ballot_id, Comments: summary}
	}
}

export async function deleteComments(userId: number, ballot_id: number) {
	// The order of the deletes is import; from resolutions table first and then from comments table.
	// This is because the a delete from resolutions tables adds a history log and a delete from comments then removes it.
	const sql = db.format(
		'DELETE r, c ' +
			'FROM comments c LEFT JOIN resolutions r ON r.comment_id=c.id ' +
			'WHERE c.ballot_id=?;',
		[ballot_id]
	);
	const result = await db.query(sql) as OkPacket;
	return result.affectedRows as number;
}

async function insertComments(userId: number, ballot_id: number, comments: Partial<Comment>[]) {

	// Delete existing comments (and resolutions) for this ballot_id
	await deleteComments(userId, ballot_id);

	if (comments.length) {
		// Insert the comments
		const sql1 =
			db.format('INSERT INTO comments (`ballot_id`, LastModifiedBy, LastModifiedTime, ??) VALUES ', [Object.keys(comments[0])]) +
			comments.map(c => db.format('(?, ?, NOW(), ?)', [ballot_id, userId, Object.values(c)])).join(', ');
		await db.query(sql1);

		// Insert a null resolution for each comment
		const sql2 =
			db.format('INSERT INTO resolutions (`comment_id`, `ResolutionID`, `LastModifiedBy`, `LastModifiedTime`) SELECT id, 0, ?, NOW() FROM comments WHERE `ballot_id`=?;', [userId, ballot_id]);
		await db.query(sql2);
	}

	comments = await getComments(ballot_id);
	const summary = await getCommentsSummary(ballot_id);

	const ballot = {
		id: ballot_id,
		Comments: summary
	};
	
	return {
		comments,
		ballot,
	}
}

export async function importEpollComments(user, ballot_id: number, epollNum: number, startCommentId: number) {

	if (!user.ieeeClient)
		throw new Error('Not logged in');

	const response = await user.ieeeClient.get(`https://mentor.ieee.org/802.11/poll-comments.csv?p=${epollNum}`, {responseType: 'arraybuffer'});

	if (response.headers['content-type'] !== 'text/csv')
		throw new Error('Not logged in');

	const comments = await parseEpollCommentsCsv(response.data, startCommentId);
	//console.log(comments[0])

	return insertComments(user.SAPIN, ballot_id, comments);
}

export async function uploadComments(userId: number, ballot_id: number, startCommentId: number, file: any) {
	const ballot = await getBallot(ballot_id);
	let comments: Partial<Comment>[]
	const isExcel = file.originalname.search(/\.xlsx$/i) !== -1;
	if (ballot.Type === BallotType.SA) {
		comments = await parseMyProjectComments(startCommentId, file.buffer, isExcel);
	}
	else {
		if (isExcel)
			throw new TypeError('Expecting .csv file');
		try {
			comments = await parseEpollCommentsCsv(file.buffer, startCommentId);
		}
		catch (error: any) {
			throw new TypeError('Parse error: ' + error.toString());
		}
	}
	return insertComments(userId, ballot_id, comments);
}
