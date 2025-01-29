import { v4 as uuid } from "uuid";
import { parseSpreadsheet, BasicFile } from "../utils/index.js";
import ExcelJS from "exceljs";

import type { Response } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

import db from "../utils/database.js";

import { getMembersSnapshot } from "./members.js";
import { AccessLevel } from "../auth/access.js";
import type { User } from "./users.js";
import type {
	Voter,
	VoterQuery,
	VoterCreate,
	VoterUpdate,
} from "@schemas/voters.js";
import { Ballot } from "@schemas/ballots.js";

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

const createViewVotersCurrent = `
	DROP VIEW IF EXISTS votersCurrent;
	CREATE VIEW votersCurrent AS
	WITH membersCurrent AS (
		SELECT
			SAPIN, SAPIN as CurrentSAPIN, Name, LastName, FirstName, MI, Email, Affiliation, Status, groupId
		FROM members WHERE Status<>'Obsolete'
		UNION ALL
		SELECT
			m1.SAPIN, m1.ReplacedBySAPIN as CurrentSAPIN, m2.Name, m2.LastName, m2.FirstName, m2.MI, m2.Email, m2.Affiliation, m2.Status, m2.groupId
		FROM members m1
			LEFT JOIN members m2 ON m1.groupId=m2.groupId AND m2.SAPIN=m1.ReplacedBySAPIN
		WHERE m1.Status='Obsolete'
	)
	SELECT
		v.id,
		v.SAPIN,
		m.CurrentSAPIN, m.Name, m.LastName, m.FirstName, m.MI, m.Email, m.Affiliation,
		v.Status,
		v.Excused,
		b.id as ballot_id,
		b.initial_id,
		m.groupId
	FROM wgVoters v
		LEFT JOIN ballotsStage b ON b.initial_id=v.ballot_id
		LEFT JOIN membersCurrent m ON v.SAPIN=m.SAPIN AND b.workingGroupId=m.groupId;
`;

export function init() {
	return db.query(createViewVotersCurrent);
}

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

export function getVoters(constraints?: VoterQuery): Promise<Voter[]> {
	// prettier-ignore
	let sql =
		"SELECT " +
			"BIN_TO_UUID(id) AS id, " +
			"SAPIN, " + 
			"CurrentSAPIN, Name, LastName, FirstName, MI, Email, Affiliation, " +
			"BIN_TO_UUID(groupId) as groupId, " +
			"Status, " +
			"Excused, " +
			"ballot_id, " +
			"initial_id " +
		"FROM votersCurrent";

	if (constraints) {
		const wheres: string[] = [];
		if (constraints.ballot_id)
			wheres.push(db.format("ballot_id IN (?)", [constraints.ballot_id]));
		if (constraints.sapin)
			wheres.push(db.format("SAPIN IN (?)", [constraints.sapin]));
		if (constraints.id)
			wheres.push(db.format("BIN_TO_UUID(id) IN (?)", [constraints.id]));
		if (wheres.length) sql += " WHERE " + wheres.join(" AND ");
	}

	sql += " ORDER BY ballot_id, SAPIN;";

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

export async function addVoters(
	workingGroupId: string,
	ballot_id: number,
	votersIn: VoterCreate[]
) {
	let voters = votersIn.map((voter) => ({
		...voter,
		ballot_id,
		id: voter.id || uuid(),
	}));
	const results = voters.map((voter) => {
		const { id, ...voterDB } = voter;
		return db.query<ResultSetHeader>(
			"INSERT INTO wgVoters SET ?, id=UUID_TO_BIN(?);",
			[voterDB, id]
		);
	});
	await Promise.all(results);
	voters = await getVoters({ id: voters.map((voter) => voter.id) });
	const ballots = await getVoterBallotUpdates(ballot_id);
	return { voters, ballots };
}

export async function updateVoters(
	workingGroupId: string,
	updates: VoterUpdate[]
) {
	const results = updates.map(({ id, changes }) =>
		db.query<ResultSetHeader>(
			"UPDATE wgVoters SET ? WHERE id=UUID_TO_BIN(?)",
			[changes, id]
		)
	);
	await Promise.all(results);
	const voters = await getVoters({ id: updates.map((u) => u.id) });
	return { voters };
}

export async function deleteVoters(ids: string[]) {
	const sql = db.format("DELETE FROM wgVoters WHERE BIN_TO_UUID(id) IN (?)", [
		ids,
	]);
	const result = await db.query<ResultSetHeader>(sql);
	return result.affectedRows;
}

async function insertVoters(
	workingGroupId: string,
	ballot_id: number,
	votersIn: Partial<Voter>[]
) {
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
	workingGroupId: string,
	ballot_id: number,
	file: Express.Multer.File
) {
	const voters = await parseVoters(file);
	return insertVoters(workingGroupId, ballot_id, voters);
}

export async function votersFromMembersSnapshot(
	user: User,
	workingGroupId: string,
	ballot_id: number,
	date: string
) {
	const members = await getMembersSnapshot(
		AccessLevel.admin,
		workingGroupId,
		date
	);
	const voters = members.filter(
		(m) => m.Status === "Voter" || m.Status === "ExOfficio"
	);
	return insertVoters(workingGroupId, ballot_id, voters);
}

function populateVotersWorksheet(
	ws: ExcelJS.Worksheet,
	ballot: Ballot,
	voters: Voter[]
) {
	/* Create a table with the voters */
	const columns = [
		{ dataKey: "LastName", label: "Family Name", width: 30 },
		{ dataKey: "FirstName", label: "Given Name", width: 30 },
		{ dataKey: "MI", label: "Middle Initial", width: 18 },
		{ dataKey: "Status", label: "Status", width: 20 },
	];

	const cell = ws.getRow(1).getCell(1);
	cell.value = `Voters List for ${ballot.BallotID}\n(${ballot.Document})`;
	cell.alignment = {
		horizontal: "center",
		vertical: "middle",
		wrapText: true,
	};
	cell.font = { bold: true, size: 16 };
	ws.mergeCells(1, 1, 1, columns.length);
	ws.getRow(1).height = 100;

	ws.addTable({
		name: `${ballot.BallotID}Voters`,
		ref: "A2",
		headerRow: true,
		totalsRow: false,
		style: {
			theme: "TableStyleLight16",
			showRowStripes: true,
		},
		columns: columns.map((col) => ({
			name: col.label,
			filterButton: true,
		})),
		rows: voters.map((row) => columns.map((col) => row[col.dataKey])),
	});
	columns.forEach((col, i) => {
		ws.getColumn(i + 1).width = col.width;
	});
}

export async function exportVoters(user: User, ballot: Ballot, res: Response) {
	const voters = await getVoters({ ballot_id: ballot.id });
	console.log(`ballot ${ballot.BallotID} has ${voters.length} voters`);

	const workbook = new ExcelJS.Workbook();
	workbook.creator = user.Name;

	const ws = workbook.addWorksheet("Voters");
	populateVotersWorksheet(ws, ballot, voters);
	res.attachment(`${ballot.BallotID}_voters.xlsx`);
	return workbook.xlsx.write(res);
}
