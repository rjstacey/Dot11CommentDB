import { v4 as uuid, validate as validateUUID } from "uuid";
import {
	csvStringify,
	isPlainObject,
	parseSpreadsheet,
	BasicFile,
} from "../utils";

import type { Response } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

import db from "../utils/database";

import { getMembersSnapshot } from "./members";

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
	ballot_id: number;
};

type VoterUpdate = {
	id: Voter["id"];
	changes: Partial<Voter>;
};

type VoterFromSpreadsheet = {
	SAPIN: number;
	Status: string;
};

const membersHeader = [
	"SA PIN",
	"LastName",
	"FirstName",
	"MI",
	"Email",
	"Status",
] as const;

async function parseVoters(file: BasicFile) {
	const rows = await parseSpreadsheet(file, membersHeader);

	return rows.map((c) => {
		const voter: VoterFromSpreadsheet = {
			SAPIN: Number(c[0]),
			//LastName: c[1],
			//FirstName: c[2],
			//MI: c[3],
			//Email: c[4],
			Status: c[5],
		};
		return voter;
	});
}

type VotersQueryConstraints = {
	id?: string | string[];
	ballot_id?: number | number[];
	sapin?: number | number[];
};

export function getVoters(
	constraints?: VotersQueryConstraints
): Promise<Voter[]> {
	// prettier-ignore
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

	if (constraints) {
		let wheres: string[] = [];
		if (constraints.ballot_id)
			wheres.push(db.format("ballot_id IN (?)", [constraints.ballot_id]));
		if (constraints.sapin)
			wheres.push(db.format("v.SAPIN IN (?)", [constraints.sapin]));
		if (constraints.id)
			wheres.push(
				db.format("BIN_TO_UUID(v.id) IN (?)", [constraints.id])
			);
		if (wheres.length) sql += " WHERE " + wheres.join(" AND ");
	}

	sql += " ORDER BY ballot_id, SAPIN;";

	//return (await db.query<(Voter)[]>(sql)) as Voter[];
	return db.query<(RowDataPacket & Voter)[]>(sql);
}

type VotersForBallots = {
	SAPIN: number;
	byBallots: {
		ballot_id: number;
		voter_id: string;
		SAPIN: number;
		Excused: boolean;
	}[];
};

export function getVotersForBallots(
	ballot_ids: number[]
): Promise<VotersForBallots[]> {
	const e_ballot_ids = db.escape(ballot_ids);
	// prettier-ignore
	const sql =
		'SELECT ' +
			'm.SAPIN, v.byBallots ' +
		'FROM ' +
			'(SELECT ' +
				'COALESCE(o.ReplacedBySAPIN, voters.SAPIN) as SAPIN, ' +	// current SAPIN
				'JSON_ARRAYAGG(JSON_OBJECT( ' +
					'"ballot_id", voters.ballot_id, ' +
					'"SAPIN", voters.SAPIN, ' +		// SAPIN in voting pool
					'"voter_id", BIN_TO_UUID(voters.id), ' +
					'"Excused", voters.Excused' +
				')) as byBallots ' +
			'FROM wgVoters voters ' + 
				'LEFT JOIN members o ON o.Status = "Obsolete" AND o.SAPIN = voters.SAPIN ' +
			`WHERE voters.ballot_id IN (${e_ballot_ids}) ` +
			'GROUP BY SAPIN) as v ' +
		'LEFT JOIN members m ON m.SAPIN = v.SAPIN ';

	return db.query<(RowDataPacket & VotersForBallots)[]>(sql);
}

type BallotVoters = {
	id: number;
	Voters: number;
};

async function getVoterBallotUpdates(
	ballot_id: number | number[]
): Promise<BallotVoters[]> {
	const sql = db.format(
		"SELECT ballot_id as id, COUNT(*) as Voters FROM wgVoters WHERE ballot_id IN (?) GROUP BY ballot_id",
		[ballot_id]
	);
	return db.query<(RowDataPacket & BallotVoters)[]>(sql);
}

function votersEntry(v: Partial<Voter>) {
	const entry = {
		ballot_id: v.ballot_id,
		SAPIN: v.SAPIN,
		Excused: v.Excused,
		Status: v.Status,
	};
	for (const key of Object.keys(entry)) {
		if (entry[key] === undefined) delete entry[key];
	}
	return entry;
}

function validVoters(voters: any): voters is Voter[] {
	return Array.isArray(voters) && voters.every(isPlainObject);
}

export async function addVoters(ballot_id: number, votersIn: any) {
	if (!validVoters(votersIn))
		throw new TypeError(
			"Bad or missing body: expected an array of voter objects"
		);

	let voters: Voter[] = votersIn.map((voter) => {
		if (!voter.SAPIN) throw new TypeError("Must provide SAPIN");
		return {
			...voter,
			ballot_id,
			id: validateUUID(voter.id) ? voter.id : uuid(),
		};
	});
	const results = voters.map((voter) => {
		let { id, ...voterDB } = voter;
		return db.query("INSERT INTO wgVoters SET ?, id=UUID_TO_BIN(?);", [
			voterDB,
			id,
		]) as Promise<ResultSetHeader>;
	});
	await Promise.all(results);
	voters = await getVoters({ id: voters.map((voter) => voter.id) });
	const ballots = await getVoterBallotUpdates(ballot_id);
	return { voters, ballots };
}

function validUpdate(update: any): update is VoterUpdate {
	return (
		isPlainObject(update) &&
		typeof update.id === "string" &&
		update.id &&
		isPlainObject(update.changes)
	);
}

function validUpdates(updates: any): updates is VoterUpdate[] {
	return Array.isArray(updates) && updates.every(validUpdate);
}

export async function updateVoters(updates: any) {
	if (!validUpdates(updates))
		throw new TypeError(
			"Bad or missing updates array; expect array with shape {id: number, changes: object}"
		);
	let results = updates.map(({ id, changes }) =>
		db.query<ResultSetHeader>(
			"UPDATE wgVoters SET ? WHERE id=UUID_TO_BIN(?)",
			[changes, id]
		)
	);
	await Promise.all(results);
	const voters = await getVoters({ id: updates.map((u) => u.id) });
	return { voters };
}

function validVoterIds(ids: any): ids is string[] {
	return Array.isArray(ids) && ids.every((id) => typeof id === "string");
}

export async function deleteVoters(ids: any) {
	if (!validVoterIds(ids))
		throw new TypeError("Bad voter identifier array; expected string[]");

	const sql = db.format("DELETE FROM wgVoters WHERE BIN_TO_UUID(id) IN (?)", [
		ids,
	]);
	const result = await db.query<ResultSetHeader>(sql);
	return result.affectedRows;
}

async function insertVoters(ballot_id: number, votersIn: Partial<Voter>[]) {
	let sql = db.format("DELETE FROM wgVoters WHERE ballot_id=?;", [ballot_id]);
	if (votersIn.length > 0) {
		sql +=
			db.format("INSERT INTO wgVoters (ballot_id, ??) VALUES ", [
				Object.keys(votersEntry(votersIn[0])),
			]) +
			votersIn
				.map((v) =>
					db.format("(?, ?)", [
						ballot_id,
						Object.values(votersEntry(v)),
					])
				)
				.join(", ") +
			";";
	}
	await db.query(sql);
	const voters = await getVoters({ ballot_id });
	const ballots = await getVoterBallotUpdates(ballot_id);
	return { voters, ballots };
}

export async function uploadVoters(
	ballot_id: number,
	file: Express.Multer.File
) {
	const voters = await parseVoters(file);
	return insertVoters(ballot_id, voters);
}

export async function votersFromMembersSnapshot(
	groupId: string,
	ballot_id: number,
	date: string
) {
	const members = await getMembersSnapshot(groupId, date);
	const voters = members.filter(
		(m) => m.Status === "Voter" || m.Status === "ExOfficio"
	);
	return insertVoters(ballot_id, voters);
}

export async function exportVoters(ballot_id: number, res: Response) {
	const voters = await getVoters({ ballot_id });
	const arr = voters.map((v) => [v.SAPIN, v.Name, v.Email]);
	arr.unshift(["SA PIN", "Name", "Email"]);
	const csv = await csvStringify(arr, {});
	res.attachment("voters.csv");
	res.status(200).send(csv);
}
