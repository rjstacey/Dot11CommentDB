'use strict'

const csvParse = require('csv-parse/lib/sync')
const ExcelJS = require('exceljs')
const db = require('../util/database')

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
			LastName: c[1],
			FirstName: c[2],
			MI: c[3],
			Email: c[4],
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


async function getVotingPoolsLocal() {
	const SQL =
		'SELECT VotingPoolID, COUNT(*) AS VoterCount FROM wgVoters GROUP BY VotingPoolID;' +
		'SELECT VotingPoolID, COUNT(*) AS VoterCount FROM saVoters GROUP BY VotingPoolID;'
	const results = await db.query(SQL)
	const votingPools =
		results[0].map(v => {return Object.assign({}, v, {PoolType: 'WG'})})
		.concat(
			results[1].map(v => {return Object.assign({}, v, {PoolType: 'SA'})})
		)
	return votingPools
}

async function getVotingPoolLocal(votingPoolType, votingPoolName) {
	const table = votingPoolType === 'SA'? 'saVoters': 'wgVoters'
	const results = await db.query(
		'SELECT VotingPoolID, COUNT(*) AS VoterCount FROM ?? WHERE VotingPoolID = ?;',
		[table, votingPoolName])
	if (results.length !== 1) {
		throw 'Unexpected result from SQL query'
	}
	return Object.assign({}, results[0], {PoolType: votingPoolType})
}

async function getVotingPools() {
	const votingPools = await getVotingPoolsLocal()
	return {votingPools}
}

async function deleteVotingPools(votingPools) {
	let saVotingPoolIds = [], wgVotingPoolIds = []
	for (let vp of votingPools) {
		if (vp.PoolType === 'SA') {
			saVotingPoolIds.push(vp.VotingPoolID)
		}
		else if (vp.PoolType === 'WG') {
			saVotingPoolIds.push(vp.VotingPoolID)
		}
		else {
			throw `Invalid pool type ${vp.PoolType} for ${vp.VotingPool}`
		}
	}
	let SQL = ''
	if (saVotingPoolIds.length > 0) {
		SQL += db.format('DELETE FROM saVoters WHERE VotingPoolID IN (?);', [saVotingPoolIds])
	}
	if (wgVotingPoolIds.length > 0) {
		SQL += db.format('DELETE FROM wgVoters WHERE VotingPoolID IN (?);', [wgVotingPoolIds])
	}
	if (SQL) {
		await db.query(SQL)
	}

	votingPools = await getVotingPoolsLocal()
	return {votingPools}
}

async function getVotersLocal(votingPoolType, votingPoolId) {
	const table = votingPoolType === 'WG'? 'wgVoters': 'saVoters'
	return db.query('SELECT * FROM ?? WHERE VotingPoolID=?;', [table, votingPoolId])
}

async function getVoters(votingPoolType, votingPoolId) {
	const voters = await getVotersLocal(votingPoolType, votingPoolId)
	const votingPool = await getVotingPoolLocal(votingPoolType, votingPoolId)
	return {
		voters,
		votingPool
	}
}

async function addVoter(votingPoolType, votingPoolId, voter) {
	let entry = {
		VotingPoolID: votingPoolId,
		Email: voter.Email
	}
	let table, key
	if (votingPoolType == 'SA') {
		entry = Object.assign(entry, {
			Name: voter.Name
		})
		table = 'saVoters'
		key = 'Email'
	}
	else {
		entry = Object.assign(entry, {
			SAPIN: voter.SAPIN,
			LastName: voter.LastName,
			FirstName: voter.FirstName,
			MI: voter.MI,
			Status: voter.Status
		})
		table = 'wgVoters'
		key = 'SAPIN'
	}
	const SQL =
		db.format('INSERT INTO ?? (??) VALUES (?);',
			[table, Object.keys(entry), Object.values(entry)]) +
		db.format('SELECT * FROM ?? WHERE VotingPoolID = ? AND ?? = ?',
			[table, votingPoolId, key, entry[key]])
	try {
		const results = await db.query(SQL)
		if (results.length !== 2 && results[1].length === 1) {
			console.log(results)
			throw new Error("Unexpected SQL result")
		}
		const voter = results[1][0]
		const votingPool = await getVotingPoolLocal(votingPoolType, votingPoolId)
		return {
			voter,
			votingPool
		}
	}
	catch(err) {
		if (err.code === 'ER_DUP_ENTRY') {
			let msg = 
				`Cannot add voter with ${key} ${entry[key]} to voting pool ${entry.VotingPoolID}; ` +
				`a voter with that ${key} already exists.`
			throw new Error(msg)
		}
		throw err
	}
}

async function updateVoter(votingPoolType, votingPoolId, voterId, voter) {
	
	let entry = {
		VotingPoolID: voter.VotingPoolID,
		Email: voter.Email
	}
	let table, key
	if (votingPoolType == 'SA') {
		entry = Object.assign(entry, {
			Name: voter.Name
		})
		table = 'saVoters'
		key = 'Email'
	}
	else {
		voterId = parseInt(voterId, 10)
		if (voterId === NaN) {
			throw 'Expected a number for SAPIN'
		}
		entry = Object.assign(entry, {
			SAPIN: voterId,
			LastName: voter.LastName,
			FirstName: voter.FirstName,
			MI: voter.MI,
			Status: voter.Status
		})
		table = 'wgVoters'
		key = 'SAPIN'
	}
	for (let k of Object.keys(entry)) {
		if (entry[k] === undefined) {
			delete entry[k]
		}
	}
	if (Object.keys(entry).length === 0) {
		return null
	}
	const SQL = 
		db.format('UPDATE ?? SET ? WHERE VotingPoolID=? AND ??=?;',
			[table, entry, votingPoolId, key, voterId]) +
		db.format('SELECT * FROM ?? WHERE VotingPoolID=? AND ??=?',
			[table, entry.VotingPoolID? entry.VotingPoolID: votingPoolId, key, entry[key]? entry[key]: voterId])

	try {
		const results = await db.query(SQL)
		if (results[0].affectedRows !== 1 || results[1].length !== 1) {
			console.log(results)
			throw new Error("Unexpected result from SQL UPDATE")
		}
		const voter = results[1][0]
		const votingPool = await getVotingPoolLocal(votingPoolType, votingPoolId)
		return {
			voter,
			votingPool
		}
	}
	catch(err) {
		if (err.code === 'ER_DUP_ENTRY') {
			let msg = null;
			if (votingPoolType === 'WG') {
				if (entry.VotingPoolID && entry.SAPIN) {
					msg = 
						`Cannot move voter with SAPIN ${entry.SAPIN} to voting pool ${entry.VotingPoolID}. ` +
						`A voter with SAPIN ${entry.SAPIN} already exists in voting pool ${entry.VotingPoolID}.`
				}
				else if (entry.VotingPoolID) {
					msg = 
						`Cannot move voter with SAPIN ${id} to voting pool ${entry.VotingPoolID}. ` +
						`A voter with SAPIN ${id} already exists in voting pool ${entry.VotingPoolID}.`
				}
				else if (entry.SAPIN) {
					msg = 
						`Cannot change SAPIN from ${id} to ${entry.SAPIN}. ` +
						`A voter with SAPIN ${entry.SAPIN} already exists in voting pool ${votingPoolId}.`
				}
			}
			else {
				if (entry.VotingPoolID && entry.Email) {
					msg = 
						`Cannot move voter with email ${entry.Email} to voting pool ${entry.VotingPoolID}. ` +
						`A voter with email ${entry.Email} already exists in voting pool ${entry.VotingPoolID}.`
				}
				else if (entry.VotingPoolID) {
					msg = 
						`Cannot move voter with email ${id} to voting pool ${entry.VotingPoolID}. ` +
						`A voter with email ${id} already exists in voting pool ${entry.VotingPoolID}.`
				}
				else if (entry.Email) {
					msg = 
						`Cannot change email from ${id} to ${entry.Email}. ` +
						`A voter with email ${entry.Email} already exists in voting pool ${votingPoolId}.`
				}
			}

			if (msg) {
				throw msg
			}
		}
		throw err
	}
}

async function deleteVoters(votingPoolType, votingPoolId, voterIds) {
	let SQL
	if (votingPoolType === 'SA') {
		SQL = db.format('DELETE FROM saVoters WHERE VotingPoolID=? AND Email IN (?)', [votingPoolId, voterIds])
	}
	else {
		SQL = db.format('DELETE FROM wgVoters WHERE VotingPoolID=? AND SAPIN IN (?)', [votingPoolId, voterIds])
	}
	await db.query(SQL)
	const votingPool = await getVotingPoolLocal(votingPoolType, votingPoolId)
	return {votingPool}
}

async function uploadVoters(votingPoolType, votingPoolId, file) {
	let table
	let voters
	if (votingPoolType === 'SA') {
		table = 'saVoters'
		const isExcel = file.originalname.search(/\.xlsx$/i) !== -1
		voters = await parseMyProjectVoters(req.file.buffer, isExcel)
	}
	else {
		table = 'wgVoters'
		voters = parseVoters(file.buffer)
	}

	await db.query('DELETE FROM ?? WHERE VotingPoolID=?', [table, votingPoolId])

	if (voters.length === 0) {
		return {voters: []}
	}

	const SQL =
		db.format('INSERT INTO ?? (VotingPoolID, ??) VALUES ', [table, Object.keys(voters[0])]) +
		voters.map(v => db.format('(?, ?)', [votingPoolId, Object.values(v)])).join(', ') +
		';'

	try {
		await db.query(SQL)
	}
	catch(err) {
		throw err.code === 'ER_DUP_ENTRY'? "Entry already exists with this ID": err
	}

	voters = await getVotersLocal(votingPoolType, votingPoolId)
	const votingPool = await getVotingPoolLocal(votingPoolType, votingPoolId)
	return {
		voters,
		votingPool
	}
}

module.exports = {
	getVotingPools,
	deleteVotingPools,
	getVoters,
	addVoter,
	deleteVoters,
	uploadVoters
}
