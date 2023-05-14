
import { v4 as uuid, validate as validateUUID } from 'uuid';
import { csvParse, csvStringify, isPlainObject, validateSpreadsheetHeader } from '../utils';
import type { Response } from 'express';

import db from '../utils/database';
import type {OkPacket} from '../utils/database';

import { getMembersSnapshot } from './members';

export type VotingPool = {
	VotingPoolID: string;
	VoterCount: number;
}

export type Voter = {
	id: string;
	SAPIN: number;
	CurrentSAPIN: number;
	Name: string;
	Email: string;
	Affiliation: string;
	Status: string;
	Excused: boolean;
	VotingPoolID: string;
}

type VoterUpdate = {
	id: Voter["id"];
	changes: Partial<Voter>;
}

type VoterFromSpreadsheet = {
	SAPIN: number;
	Status: string;
}

const membersHeader = [
	'SA PIN', 'LastName', 'FirstName', 'MI', 'Email', 'Status'
] as const;

async function parseVoters(buffer: Buffer) {

	const p = await csvParse(buffer, {columns: false});
	if (p.length === 0)
		throw TypeError('Got empty .csv file');

	// Row 0 is the header
	validateSpreadsheetHeader(p.shift()!, membersHeader);

	return p.map(c => {
		const voter: VoterFromSpreadsheet = {
			SAPIN: Number(c[0]),
			//LastName: c[1],
			//FirstName: c[2],
			//MI: c[3],
			//Email: c[4],
			Status: c[5]
		}
		return voter;
	});
}


const getVotingPoolSQL = (votingPoolId: string) => 
	db.format('SELECT VotingPoolID, COUNT(*) AS VoterCount FROM wgVoters WHERE VotingPoolID=?;', [votingPoolId]);

const getVotersFullSQL = (votingPoolId?: string, sapins?: number[], ids?: string[]) => {
	let sql =
		'SELECT ' +
			'v.*, ' + 
			'BIN_TO_UUID(v.id) AS id, ' +
			'COALESCE(m.SAPIN, o.CurrentSAPIN) AS CurrentSAPIN, ' +
			'COALESCE(m.Name, o.Name) AS Name, ' +
			'COALESCE(m.Email, o.Email) AS Email, ' +
			'COALESCE(m.Affiliation, o.Affiliation) AS Affiliation ' +
		'FROM wgVoters v ' + 
			'LEFT JOIN members m ON m.Status<>\'Obsolete\' AND m.SAPIN=v.SAPIN ' +
			'LEFT JOIN (SELECT ' + 
					'm2.SAPIN AS OldSAPIN, m1.SAPIN AS CurrentSAPIN, m1.Name, m1.Email, m1.Affiliation ' + 
				'FROM members m1 LEFT JOIN members m2 ON m1.SAPIN=m2.ReplacedBySAPIN AND m2.Status=\'Obsolete\') AS o ON v.SAPIN=o.OldSAPIN';
	let conditions: string[] = [];
	if (votingPoolId)
		conditions.push(db.format('VotingPoolID=?', [votingPoolId]));
	if (sapins && sapins.length)
		conditions.push(db.format('v.SAPIN IN (?)', [sapins]));
	if (ids && ids.length)
		conditions.push('v.id in (' + ids.map(id => `UUID_TO_BIN('${id}')`).join(',') + ')');
	if (conditions.length)
		sql += ' WHERE ' + conditions.join(' AND ');
	sql += ' ORDER BY SAPIN;';
	return sql;
}

export async function getVotingPools() {
	const votingPools = await db.query('SELECT VotingPoolID, COUNT(*) AS VoterCount FROM wgVoters GROUP BY VotingPoolID;') as VotingPool[];
	return {votingPools}
}

export async function deleteVotingPools(votingPoolIds: string[]): Promise<number> {
	const result = await db.query('DELETE FROM wgVoters WHERE VotingPoolID IN (?);', [votingPoolIds]) as OkPacket;
	return result.affectedRows;
}

export async function updateVotingPool(votingPoolId: string, changes: {VotingPoolID: string}) {
	if (changes.hasOwnProperty('VotingPoolID') && votingPoolId !== changes.VotingPoolID) {
		const [votingPool] = await db.query(getVotingPoolSQL(changes.VotingPoolID)) as VotingPool[];
		if (votingPool.VotingPoolID !== null)
			throw new TypeError(`${changes.VotingPoolID} already in use`);
		await db.query('UPDATE wgVoters SET VotingPoolID=? WHERE VotingPoolID=?;', [changes.VotingPoolID, votingPoolId]);
		votingPoolId = changes.VotingPoolID;
	}
	const [votingPool] = await db.query(getVotingPoolSQL(votingPoolId)) as VotingPool[];
	return {votingPool}
}

export async function getVoters(votingPoolId: string) {
	const sql =
		getVotersFullSQL(votingPoolId) +
		getVotingPoolSQL(votingPoolId);
	const [voters, votingPools] = await db.query(sql) as [Voter[], VotingPool[]];
	const votingPool = votingPools[0];
	votingPool.VotingPoolID = votingPoolId;
	return {
		voters,
		votingPool
	}
}

type VotersForBallots = {
	SAPIN: number;
	byBallots: {
		ballot_id: number;
		voter_id: string;
		SAPIN: number;
		Excused: boolean
	}[];
}

export async function getVotersForBallots(ballot_ids: number[]) {
	let sql =
		'SELECT ' +
			'm.SAPIN, v.byBallots ' +
		'FROM ' +
			'(SELECT ' +
				'COALESCE(o.ReplacedBySAPIN, voters.SAPIN) as SAPIN, ' +	// current SAPIN
				'JSON_ARRAYAGG(JSON_OBJECT( ' +
					'"ballot_id", b.id, ' +
					'"SAPIN", voters.SAPIN, ' +		// SAPIN in voting pool
					'"voter_id", BIN_TO_UUID(voters.id), ' +
					'"Excused", voters.Excused' +
				')) as byBallots ' +
			'FROM wgVoters voters ' + 
				'LEFT JOIN ballots b ON b.VotingPoolID = voters.VotingPoolID ' +
				'LEFT JOIN members o ON o.Status = "Obsolete" AND o.SAPIN = voters.SAPIN ' +
			'WHERE b.id IN (?) ' +
			'GROUP BY SAPIN) as v ' +
		'LEFT JOIN members m ON m.SAPIN = v.SAPIN ';
	
	return db.query(sql, [ballot_ids]) as Promise<VotersForBallots[]>;
}

async function getVoter(votingPoolId: string, sapin: number) {
	const sql = getVotersFullSQL(votingPoolId, [sapin]);
	const voters = await db.query(sql) as Voter[];
	return voters[0];
}

function votersEntry(v: Partial<Voter>) {
	const entry = {
		VotingPoolID: v.VotingPoolID,
		SAPIN: v.SAPIN,
		Excused: v.Excused,
		Status: v.Status
	}
	for (const key of Object.keys(entry)) {
		if (entry[key] === undefined)
			delete entry[key]
	}
	return entry;
}

export async function addVoters(votingPoolId: string, voters: Voter[]) {
	voters = voters.map(voter => {
		if (!voter.SAPIN)
			throw new TypeError('Must provide SAPIN');
		return {
			...voter,
			VotingPoolID: votingPoolId,
			id: validateUUID(voter.id)? voter.id: uuid()
		}
	});
	const results = voters.map(voter => {
		let {id, ...voterDB} = voter;
		return db.query('INSERT INTO wgVoters SET ?, id=UUID_TO_BIN(?);', [voterDB, id]) as Promise<OkPacket>;
	});
	await Promise.all(results);
	voters = await db.query(getVotersFullSQL(undefined, undefined, voters.map(voter => voter.id))) as Voter[];
	const [votingPool] = await db.query(getVotingPoolSQL(votingPoolId)) as VotingPool[];
	return {
		voters,
		votingPool
	}
}


export async function updateVoter(votingPoolId: string, sapin: number, changes: Partial<Voter>) {
	await db.query('UPDATE wgVoters SET ? WHERE VotingPoolID=? AND SAPIN=?', [changes, votingPoolId, sapin]);
	const [voter] = await db.query(getVotersFullSQL(votingPoolId, [sapin])) as Voter[];
	return voter;
}

function validUpdate(update: any): update is VoterUpdate {
	return isPlainObject(update) &&
		typeof update.id === 'string' && update.id &&
		isPlainObject(update.changes);
}

function validUpdates(updates: any): updates is VoterUpdate[] {
	return Array.isArray(updates) && updates.every(validUpdate);
}

export async function updateVoters(updates: any) {
	if (!validUpdates(updates))
		throw new TypeError("Bad updates array; expect array with shape {id: number, changes: object}");
	let results = updates.map(({id, changes}) =>
		db.query('UPDATE wgVoters SET ? WHERE id=UUID_TO_BIN(?)', [changes, id]) as Promise<OkPacket>
	);
	await Promise.all(results);
	const voters = await db.query(getVotersFullSQL(undefined, undefined, updates.map(u => u.id))) as Voter[];
	return voters.map(v => ({id: v.id, changes: v}));
}

export async function deleteVoters(votingPoolId: string, ids: string[]) {
	const sql = 'DELETE FROM wgVoters WHERE id IN (' +
			ids.map(id => `UUID_TO_BIN('${id}')`).join(',') +
		')';
	const result = await db.query(sql) as OkPacket;
	return result.affectedRows;
}

async function insertVoters(votingPoolId: string, voters: Partial<Voter>[]) {
	let sql = db.format('DELETE FROM wgVoters WHERE VotingPoolID=?;', [votingPoolId]);
	if (voters.length > 0) {
		sql +=
			db.format('INSERT INTO wgVoters (VotingPoolID, ??) VALUES ', [Object.keys(votersEntry(voters[0]))]) +
			voters.map(v => db.format('(?, ?)', [votingPoolId, Object.values(votersEntry(v))])).join(', ') +
			';'
	}
	sql +=
		getVotersFullSQL(votingPoolId) +
		getVotingPoolSQL(votingPoolId);
	const results = await db.query(sql) as any[];
	const votingPool: VotingPool = results[results.length-1][0];
	votingPool.VotingPoolID = votingPoolId;
	return {
		voters: results[results.length-2] as Voter[],
		votingPool
	}
}

export async function votersFromSpreadsheet(votingPoolId: string, file: any) {
	if (file.originalname.search(/\.csv$/i) === -1)
		throw new TypeError("Expected a .csv file");
	let voters = await parseVoters(file.buffer);
	return await insertVoters(votingPoolId, voters);
}

export async function votersFromMembersSnapshot(votingPoolId: string, date: string) {
	const members = await getMembersSnapshot(date);
	const voters = members.filter(m => m.Status === 'Voter' || m.Status === 'ExOfficio');
	return await insertVoters(votingPoolId, voters);
}

export async function exportVoters(votingPoolId: string, res: Response) {
	const {voters} = await getVoters(votingPoolId);
	const arr = voters.map(v => [v.SAPIN, v.Name, v.Email]);
	arr.unshift(['SA PIN', 'Name', 'Email']);
	const csv = await csvStringify(arr, {});
	res.attachment(votingPoolId + '_voters.csv');
	res.status(200).send(csv);
}
