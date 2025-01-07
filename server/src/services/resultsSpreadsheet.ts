/*
 * Handle results spreadsheet
 */
import ExcelJS from "exceljs";
import type { Response } from "express";
import type { User } from "./users.js";
import type { Ballot } from "@schemas/ballots.js";
import type { Result } from "@schemas/results.js";
import { getSheetName } from "./commentsSpreadsheet.js";

function populateSummaryWorksheet(ws: ExcelJS.Worksheet, ballots: Ballot[]) {
	let colNum = 1;
	let labelCol = [
		"Ballot",
		"Opened:",
		"Closed:",
		"Duration:",
		"Voting pool:",
		,
		"Result",
		"Approve:",
		"Disapprove:",
		"Abstain:",
		"Total returns:",
		,
		"Invalid Votes",
		"Not in pool:",
		"Disapprove without comment:",
		"Abstain reason:",
		,
		"Approval Criteria",
		"Approval rate (> 75%):",
		"Returns as % of pool (> 50%):",
		"Abstains as % of pool (< 30%):",
	];
	ws.getColumn(colNum).width = 25;
	ws.getColumn(colNum).values = labelCol;
	[1, 7, 13, 18].forEach((rowNum) => {
		ws.getCell(rowNum, colNum).font = { bold: true };
		ws.getCell(rowNum, colNum).alignment = {
			vertical: "middle",
			horizontal: "left",
		};
	});

	for (const b of ballots) {
		colNum++;

		const r = b.Results!;

		let opened = "",
			closed = "",
			duration = "";
		if (b.Start && b.End) {
			const dStart = new Date(b.Start);
			const dEnd = new Date(b.End);
			opened = dStart.toLocaleString("en-US", {
				year: "numeric",
				month: "numeric",
				day: "numeric",
				timeZone: "America/New_York",
			});
			closed = dEnd.toLocaleString("en-US", {
				year: "numeric",
				month: "numeric",
				day: "numeric",
				timeZone: "America/New_York",
			});
			const _MS_PER_DAY = 1000 * 60 * 60 * 24;
			const dur = Math.floor(
				(dEnd.valueOf() - dStart.valueOf()) / _MS_PER_DAY
			);
			if (!isNaN(dur)) duration = `${dur} days`;
		}

		const approvalRate = r.Approve / (r.Approve + r.Disapprove);
		const returnsRate = r.TotalReturns / r.ReturnsPoolSize;
		const abstainsRate = r.Abstain / (r.VotingPoolSize || 0);

		let dataCol = [
			b.BallotID,
			opened,
			closed,
			duration,
			r.VotingPoolSize,
			,
			"",
			r.Approve,
			r.Disapprove,
			r.Abstain,
			r.TotalReturns,
			,
			"",
			r.InvalidVote,
			r.InvalidDisapprove,
			r.InvalidAbstain,
			,
			"",
			approvalRate,
			returnsRate,
			abstainsRate,
		];
		ws.getColumn(colNum).width = 15;
		ws.getColumn(colNum).values = dataCol;

		ws.getCell(1, colNum).alignment = {
			vertical: "middle",
			horizontal: "center",
		};
		ws.getCell(1, colNum).font = { bold: true };

		[2, 3, 4].forEach((rowNum) => {
			ws.getCell(rowNum, colNum).alignment = {
				vertical: "middle",
				horizontal: "right",
			};
		});

		[19, 20, 21].forEach(
			(rowNum) => (ws.getCell(rowNum, colNum).numFmt = "0.0%")
		);

		ws.getCell(19, colNum).fill = {
			type: "pattern",
			pattern: "solid",
			fgColor: { argb: approvalRate > 0.75 ? "FFD3ECD3" : "fff3c0c0" },
		};
		ws.getCell(20, colNum).fill = {
			type: "pattern",
			pattern: "solid",
			fgColor: { argb: returnsRate > 0.5 ? "FFD3ECD3" : "fff3c0c0" },
		};
		ws.getCell(21, colNum).fill = {
			type: "pattern",
			pattern: "solid",
			fgColor: { argb: abstainsRate < 0.3 ? "FFD3ECD3" : "fff3c0c0" },
		};
	}
}

function populateResultsWorksheet(
	ws: ExcelJS.Worksheet,
	ballot: Ballot,
	results: Result[]
) {
	/* Create a table with the results */
	const columns = [
		{ dataKey: "SAPIN", label: "SA PIN", width: 10 },
		{ dataKey: "Name", label: "Name", width: 30 },
		{ dataKey: "Affiliation", label: "Affiliation", width: 40 },
		{ dataKey: "Email", label: "Email", width: 30 },
		{ dataKey: "Status", label: "Status", width: 15 },
		{ dataKey: "vote", label: "Vote", width: 15 },
		{ dataKey: "lastBallotName", label: "From Ballot", width: 15 },
		{ dataKey: "commentCount", label: "Comments", width: 15 },
		{ dataKey: "notes", label: "Notes", width: 30 },
	];

	ws.addTable({
		name: `${ballot.BallotID}ResultsTable`,
		ref: "A1",
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
		rows: results.map((row) => columns.map((col) => row[col.dataKey])),
	});
	columns.forEach((col, i) => {
		ws.getColumn(i + 1).width = col.width;
	});
}

export async function genResultsSpreadsheet(
	user: User,
	ballots: Ballot[],
	resultsArr: Result[][],
	res: Response
) {
	const workbook = new ExcelJS.Workbook();
	workbook.creator = user.Name;

	const ballotEntities: Record<number, Ballot> = {};
	for (const b of ballots) ballotEntities[b.id] = b;

	let ws = workbook.addWorksheet("Summary");
	populateSummaryWorksheet(ws, ballots);

	resultsArr.forEach((results, i) => {
		const ballot = ballots[i];
		ws = workbook.addWorksheet(getSheetName(ballot.BallotID));
		const results2 = results.map((r) => {
			let lastBallotName = "";
			if (r.lastBallotId && r.lastBallotId !== r.ballot_id)
				lastBallotName =
					ballotEntities[r.lastBallotId]?.BallotID || "??";
			return { ...r, lastBallotName };
		});
		populateResultsWorksheet(ws, ballot, results2);
	});

	return workbook.xlsx.write(res);
}
