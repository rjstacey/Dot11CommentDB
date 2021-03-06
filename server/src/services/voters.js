'use strict'

const csvParse = require('csv-parse/lib/sync')
const ExcelJS = require('exceljs')
const db = require('../util/database')

import {getMembersSnapshot} from './members'

const membersHeader = [
	'SA PIN', 'LastName', 'FirstName', 'MI', 'Email', 'Status'
]

function parseVoters(buffer) {

	const p = csvParse(buffer, {columns: false});
	if (p.length === 0) {
		throw 'Got empty .csv file';
	}

	// Row 0 is the header
	if (membersHeader.reduce((r, v, i) => v !== p[0][i], false)) {
		throw `Unexpected column headings ${p[0].join()}. Expected ${expected.join()}.`
	}
	p.shift();

	return p.map(c => {
		return {
			SAPIN: c[0],
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

async function parseMyProjectVoters(buffer, isExcel) {
	var p = [] 	// an array of arrays
	if (isExcel) {
		var workbook = new ExcelJS.Workbook()
		await workbook.xlsx.load(buffer)

		workbook.getWorksheet(1).eachRow(row => {
			p.push(row.values.slice(1, 7))
		})
	}
	else {
		throw "Can't handle .csv file"
	}

	if (p.length < 2) {
		throw 'File has less than 2 rows'
	}

	p.shift()	// PAR #
	if (myProjectBallotMembersHeader.reduce((r, v, i) => r || typeof p[0][i] !== 'string' || p[0][i].toLowerCase() !== v.toLowerCase(), false)) {
		throw `Unexpected column headings:\n${p[0].join()}\n\nExpected:\n${myProjectBallotMembersHeader.join()}`
	}
	p.shift()	// remove heading row

	return p.map(c => {
		return {
			Name: c[0],
			Email: c[1],
			//Affiliation: c[2],
			//Vote: c[4]
		}
	})
}

const getVotingPoolsSQL = () => 'SELECT VotingPoolID, COUNT(*) AS VoterCount FROM wgVoters GROUP BY VotingPoolID;';

const getVotingPoolSQL = (votingPoolId) => 
	db.format('SELECT VotingPoolID, COUNT(*) AS VoterCount FROM wgVoters WHERE VotingPoolID=?;', [votingPoolId]);

const getVotersSQL = (votingPoolId) =>
	db.format('SELECT * FROM wgVoters WHERE VotingPoolID=?;', [votingPoolId]);

const getVotersFullSQL = (votingPoolId, sapins) =>
		'SELECT ' +
			'v.*, ' + 
			'COALESCE(m.SAPIN, o.CurrentSAPIN) AS CurrentSAPIN, ' +
			'COALESCE(m.Name, o.Name) AS Name, ' +
			'COALESCE(m.Email, o.Email) AS Email, ' +
			'COALESCE(m.Affiliation, o.Affiliation) AS Affiliation ' +
		'FROM wgVoters v ' + 
			'LEFT JOIN members m ON m.Status<>\'Obsolete\' AND m.SAPIN=v.SAPIN ' +
			'LEFT JOIN (SELECT ' + 
					'm2.SAPIN AS OldSAPIN, m1.SAPIN AS CurrentSAPIN, m1.Name, m1.Email, m1.Affiliation ' + 
				'FROM members m1 LEFT JOIN members m2 ON m1.SAPIN=m2.ReplacedBySAPIN AND m2.Status=\'Obsolete\') AS o ON v.SAPIN=o.OldSAPIN ' +
			'WHERE VotingPoolID=' + db.escape(votingPoolId) +
			(sapins? db.format(' AND v.SAPIN IN (?) ', [sapins]): ' ') +
		'ORDER BY SAPIN;';

export async function getVotingPools() {
	const votingPools = await db.query(getVotingPoolsSQL());
	return {votingPools}
}

export async function deleteVotingPools(votingPoolIds) {
	await db.query('DELETE FROM wgVoters WHERE VotingPoolID IN (?);', [votingPoolIds]);
}

export async function updateVotingPool(votingPoolId, newVotingPool) {
	const newVotingPoolId = newVotingPool.VotingPoolID;
	let [votingPool] = await db.query(getVotingPoolSQL(newVotingPoolId));
	if (votingPool.VotingPoolID !== null)
		throw `${newVotingPoolId} already in use`;
	const sql = 
		db.format('UPDATE wgVoters SET VotingPoolID=? WHERE VotingPoolID=?;', [newVotingPoolId, votingPoolId]) +
		getVotingPoolSQL(newVotingPoolId);
	const [noop, votingPools] = await db.query(sql);
	votingPool = votingPools[0];
	return {votingPool}
}

export async function getVoters(votingPoolId) {
	const sql =
		getVotersFullSQL(votingPoolId) +
		getVotingPoolSQL(votingPoolId);
	const [voters, votingPools] = await db.query(sql);
	const votingPool = votingPools[0];
	votingPool.VotingPoolID = votingPoolId;
	return {
		voters,
		votingPool
	}
}

async function getVoter(votingPoolId, sapin) {
	const sql = getVotersFullSQL(votingPoolId, [sapin]);
	const voters = await db.query(sql);
	return voters[0];
}

function votersEntry(v) {
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

export async function addVoter(votingPoolId, voter) {

	if (!voter.SAPIN)
		throw 'Must provide SAPIN';

	const entry = votersEntry(voter);
	entry.VotingPoolID = votingPoolId;

	const sql =
		db.format('INSERT INTO wgVoters SET ?;', [entry]) +
		getVotersFullSQL(votingPoolId, [voter.SAPIN]) + 
		getVotingPoolSQL(votingPoolId);
	const [noop, voters, votingPools] = await db.query(sql);
	const votingPool = votingPools[0];
	votingPool.VotingPoolID = votingPoolId;
	return {
		voter: voters[0],
		votingPool
	}
}

export async function updateVoter(votingPoolId, sapin, voter) {
	const sql =
		db.format(
			'UPDATE wgVoters SET ? WHERE VotingPoolID=? AND SAPIN=?;',
			[votersEntry(voter), votingPoolId, sapin]) +
		getVotersFullSQL(votingPoolId, [voter.SAPIN || sapin]);
	const [noop, voters] = await db.query(sql);
	return {voter: voters[0]};
}

export async function deleteVoters(votingPoolId, ids) {
	const sql =
		db.format('DELETE FROM wgVoters WHERE VotingPoolID=?', [votingPoolId]) +
		(ids? db.format(' AND id IN (?); ', [ids]): '; ') + 
		getVotersFullSQL(votingPoolId) +
		getVotingPoolSQL(votingPoolId);
	const [noop, voters, votingPools] = await db.query(sql);
	const votingPool = votingPools[0];
	votingPool.VotingPoolID = votingPoolId;
	return {
		voters,
		votingPool
	}
}

async function insertVoters(votingPoolId, voters) {
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
	const results = await db.query(sql);
	const votingPool = results[results.length-1][0];
	votingPool.VotingPoolID = votingPoolId;
	return {
		voters: results[results.length-2],
		votingPool
	}
}

export async function votersFromSpreadsheet(votingPoolId, file) {
	let voters = parseVoters(file.buffer);
	return await insertVoters(votingPoolId, voters);
}

export async function votersFromMembersSnapshot(votingPoolId, date) {
	const members = await getMembersSnapshot(date);
	const voters = members.filter(m => m.Status === 'Voter' || m.Status === 'ExOfficio');
	return await insertVoters(votingPoolId, voters);
}