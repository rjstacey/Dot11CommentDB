
import { v4 as uuid, validate as validateUUID } from 'uuid';
import ExcelJS from 'exceljs';
import { csvParse, csvStringify } from '../utils';

import db from '../utils/database';
import type {OkPacket} from '../utils/database';

import {getMembersSnapshot} from './members';

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

type VoterFromSpreadsheet = {
	SAPIN: number;
	Status: string;
}

const membersHeader = [
	'SA PIN', 'LastName', 'FirstName', 'MI', 'Email', 'Status'
] as const;

async function parseVoters(buffer: Buffer): Promise<VoterFromSpreadsheet[]> {

	const p = await csvParse(buffer, {columns: false});
	if (p.length === 0)
		throw TypeError('Got empty .csv file');

	// Row 0 is the header
	if (membersHeader.reduce((r, v, i) => v !== p[0][i], false))
		throw new TypeError(`Unexpected column headings ${p[0].join()}. Expected ${membersHeader.join()}.`);
	p.shift();

	return p.map(c => {
		return {
			SAPIN: Number(c[0]),
			//LastName: c[1],
			//FirstName: c[2],
			//MI: c[3],
			//Email: c[4],
			Status: c[5]
		}
	});
}

const myProjectBallotMembersHeader = [
	'Name', 'EMAIL', 'Affiliations(s)', 'Voter Classification', 'Current Vote', 'Comments'
]
async function parseMyProjectVoters(buffer: Buffer, isExcel: boolean) {
	var p: any[][] = [] 	// an array of arrays
	if (isExcel) {
		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(buffer);

		workbook.getWorksheet(1).eachRow(row => Array.isArray(row.values) && p.push(row.values.slice(1, myProjectBallotMembersHeader.length+1)))
	}
	else {
		throw new TypeError("Can't handle .csv file");
	}

	if (p.length < 2) {
		throw new Error('File has less than 2 rows');
	}

	p.shift();	// PAR #
	if (myProjectBallotMembersHeader.reduce((r, v, i) => r || typeof p[0][i] !== 'string' || p[0][i].toLowerCase() !== v.toLowerCase(), false)) {
		throw new Error(`Unexpected column headings:\n${p[0].join()}\n\nExpected:\n${myProjectBallotMembersHeader.join()}`);
	}
	p.shift();	// remove heading row

	return p.map(c => ({
		Name: c[0],
		Email: c[1],
		//Affiliation: c[2],
		//Vote: c[4]
	}))
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

export async function updateVotingPool(votingPoolId: string, changes: {VotingPoolID: string}): Promise<{votingPool: VotingPool}> {
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

export async function getVoters(votingPoolId: string): Promise<{voters: Voter[], votingPool: VotingPool}> {
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

async function getVoter(votingPoolId: string, sapin: number): Promise<Voter> {
	const sql = getVotersFullSQL(votingPoolId, [sapin]);
	const voters = await db.query(sql);
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
	let results: any[] = [];
	let ids: string[] = [];
	for (const voter of voters) {
		if (!voter.SAPIN)
			throw 'Must provide SAPIN';
		voter.VotingPoolID = votingPoolId;
		const id = validateUUID(voter.id)? voter.id: uuid();
		// @ts-ignore
		delete voter.id;
		results.push(db.query('INSERT INTO wgVoters SET ?, id=UUID_TO_BIN(?);', [voter, id]));
		ids.push(id);
	}
	results = await Promise.all(results);
	voters = await db.query(getVotersFullSQL(undefined, undefined, ids)) as Voter[];
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

export async function updateVoters(updates) {
	let results: any[] = [];
	for (const {id, changes} of updates) {
		if (!id || !changes)
			throw 'Expect updates with shape {id, changes}';
		results.push(db.query('UPDATE wgVoters SET ? WHERE id=UUID_TO_BIN(?)', [changes, id]));
	}
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
	let voters = await parseVoters(file.buffer);
	return await insertVoters(votingPoolId, voters);
}

export async function votersFromMembersSnapshot(votingPoolId: string, date: string) {
	const members = await getMembersSnapshot(date);
	const voters = members.filter(m => m.Status === 'Voter' || m.Status === 'ExOfficio');
	return await insertVoters(votingPoolId, voters);
}

export async function exportVoters(votingPoolId: string, res) {
	const {voters, votingPool} = await getVoters(votingPoolId);
	const arr = voters.map(v => [v.SAPIN, v.Name, v.Email]);
	arr.unshift(['SA PIN', 'Name', 'Email']);
	const csv = await csvStringify(arr, {});
	res.attachment(votingPoolId + '_voters.csv');
	res.status(200).send(csv);
}
