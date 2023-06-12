
import { v4 as uuid, validate as validateUUID } from 'uuid';

import db from '../utils/database';

import { selectComments } from './comments';
import { User } from './users';
import type { OkPacket } from 'mysql2';
import { isPlainObject } from '../utils';

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

type ResolutionCreate = {
	comment_id: bigint;
} & Partial<Omit<Resolution, "comment_id">>;

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

function validResolutionCreate(resolution: any): resolution is ResolutionCreate {
	return isPlainObject(resolution) &&
		typeof resolution.comment_id === 'number' &&	// Must be present
		(!resolution.hasOwnProperty('ResolutionID') || typeof resolution.ResolutionID === 'number') &&
		(!resolution.hasOwnProperty('AssigneeSAPIN') || [null, 'number'].includes(typeof resolution.AssigneeSAPIN)) &&
		(!resolution.hasOwnProperty('AssigneeName') || [null, 'string'].includes(typeof resolution.AssigneeName)) &&
		(!resolution.hasOwnProperty('ResnStatus') || [null, 'A', 'V', 'J'].includes(resolution.ResnStatus)) &&
		(!resolution.hasOwnProperty('Resolution') || [null, 'string'].includes(typeof resolution.Resolution));
}

export function validResolutions(resolutions: any): resolutions is ResolutionCreate[] {
	return Array.isArray(resolutions) && resolutions.every(validResolutionCreate);
}

async function addResolution(user: User, resolution: ResolutionCreate) {

	const id = validateUUID(resolution.id || '')? resolution.id!: uuid();
	delete resolution.id;

	let ResolutionID: number | null | undefined = resolution.ResolutionID;
	if (typeof ResolutionID !== 'number') {
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
	//console.log(resolutionId)

	const entry = {
		...defaultResolution,
		...resolution,
		ResolutionID
	}

	await db.query('INSERT INTO resolutions SET id=UUID_TO_BIN(?), ?, LastModifiedBy=?, LastModifiedTime=UTC_TIMESTAMP();', [id, entry, user.SAPIN]);
	return id;
}

/** 
 * Add resolutions
 * @param user The user executing the add
 * @param ballot_id The ballot identifier associated with the resolution updates and used to autherize the updates.
 * @param resolution An array of resolutions to be added.
 * @param modifiedSince Option ISO date string. Comments modfied since this date will be returned.
 * @returns An array of comment resolutions as added plus additional comment resolutions with changes after `modifiedSince`. 
 */
export async function addResolutions(
	user: User,
	ballot_id: number,
	resolutions: ResolutionCreate[],
	modifiedSince?: string
) {
	await Promise.all(resolutions.map(r => addResolution(user, r)));
	const comments = await selectComments({comment_id: resolutions.map(r => r.comment_id)}, {ballot_id, modifiedSince});
	return {comments}
}

/*function resolutionEntry(changes) {
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
}*/

async function updateResolution(user: User, ballot_id: number, id: string, changes: Partial<Resolution>) {

	if (Object.keys(changes).length > 0) {
		/* The ballot_id in WHERE clause is to qualify the update on the ballot_id since the update was authorized using 
		 * the declared ballot_id. We don't want the user updating a resolution for an unrelated ballot. */
		const sql = db.format(
			'UPDATE resolutions r LEFT JOIN comments c ON c.id=r.comment_id ' + 
				'SET ?, r.LastModifiedBy=?, r.LastModifiedTime=UTC_TIMESTAMP() ' + 
			'WHERE c.ballot_id=? AND r.id=UUID_TO_BIN(?)',
			[changes, user.SAPIN, ballot_id, id]
		)
		await db.query(sql);
	}

	//const [comment] = await db.query({sql: "SELECT id, resolution_id, CID, ??, LastModifiedBy, LastModifiedTime FROM commentResolutions WHERE resolution_id=?;", dateStrings: true}, [Object.keys(changes), id]) as CommentResolution[];
	//console.log(comment)
	//return comment;
}

type ResolutionUpdate = {
	id: string;
	changes: Partial<Resolution>;
}

function validResolutionUpdate(update: any): update is ResolutionUpdate {
	return isPlainObject(update) &&
		typeof update.id === 'string' &&
		isPlainObject(update.changes);
}

export function validResolutionUpdates(updates: any): updates is ResolutionUpdate[] {
	return Array.isArray(updates) && updates.every(validResolutionUpdate);
}

/**
 * Update resolutions
 * @param user The user executing the add
 * @param ballot_id The ballot identifier associated with the resolution updates and used to authorize the updates.
 * @param updates An array of resolution updates.
 * @param modifiedSince Optional ISO date string. Comments modfied since this date will be returned.
 * @returns An array of modified comment resolutions plus additional comment resolutions with changes after `modifiedSince`.
 */
export async function updateResolutions(
	user: User,
	ballot_id: number,
	updates: ResolutionUpdate[],
	modifiedSince?: string
) {
	console.log(modifiedSince)
	await Promise.all(updates.map(u => updateResolution(user, ballot_id, u.id, u.changes)));
	const comments = await selectComments({resolution_id: updates.map(u => u.id)}, {ballot_id, modifiedSince});
	return {comments};
}

export function validResolutionIds(ids: any): ids is string[] {
	return Array.isArray(ids) && ids.every(id => typeof id === 'string');
}

/** 
 * Delete resolutions
 * 
 * @param user The user executing the delete
 * @param ballot_id The ballot identifier associated with the resolutions to be deleted. Autherization is based on the ballot identifier.
 * @param ids An array of resolution identifiers to delete. Must be associated with the ballot identifier.
 * @param modifiedSince ISO Date string. Comments that have been modified since this date will be returned.
 */
export async function deleteResolutions(
	user: User,
	ballot_id: number,
	ids: string[],
	modifiedSince?: string
) {
	if (ids.length > 0)
		await db.query('DELETE r FROM resolutions r LEFT JOIN comments c ON r.comment_id=c.id WHERE c.ballot_id=? AND BIN_TO_UUID(id) IN (?)', [ballot_id, ids]) as OkPacket;
	const comments = await selectComments({ballot_id, modifiedSince});
	return {comments};
}

