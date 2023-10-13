/*
 * Handle results spreadsheet
 */
import ExcelJS from "exceljs";
import type { Response } from "express";
import type { User } from "./users";
import type { Ballot } from "./ballots";
import type { Result, ResultsCoalesced } from "./results";
import { getSheetName } from "./commentsSpreadsheet";

function populateResultsWorksheet(
	ws: ExcelJS.Worksheet,
	ballot: Ballot,
	results: Result[]
) {
	const b = ballot;
	const r = ballot.Results!;
	const votingPoolSize = r.VotingPoolSize;

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

	const returns = r.TotalReturns;
	const returnsPct = returns / r.ReturnsPoolSize;
	const returnsReqStr =
		(returnsPct > 0.5 ? "Meets" : "Does not meet") +
		" return requirement (>50%)";
	const abstainsPct = r.Abstain / votingPoolSize;
	const abstainsReqStr =
		(abstainsPct < 0.3 ? "Meets" : "Does not meet") +
		" abstain requirement (<30%)";

	/* Create a table with the results */
	const columns = [
		{ dataKey: "SAPIN", label: "SA PIN", width: 10 },
		{ dataKey: "Name", label: "Name", width: 30 },
		{ dataKey: "Affiliation", label: "Affiliation", width: 40 },
		{ dataKey: "Email", label: "Email", width: 30 },
		{ dataKey: "Vote", label: "Vote", width: 15 },
		{ dataKey: "CommentCount", label: "Comments", width: 15 },
		{ dataKey: "Notes", label: "Notes", width: 30 },
	];

	ws.addTable({
		name: `${b.BallotID}ResultsTable`,
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

	/* Create a summary column off to the side */
	const colNum = columns.length + 2;
	ws.getColumn(colNum).width = 25;
	var labelCol = [
		"Ballot",
		"Opened:",
		"Closed:",
		"Duration:",
		"Voting pool:",
		,
		"Result",
		"Approval rate:",
		"Approve:",
		"Disapprove:",
		"Abstain:",
	];
	if (votingPoolSize) {
		labelCol = labelCol.concat([
			,
			"Invalid Votes",
			"Not in pool:",
			"Disapprove without comment:",
			"Abstain reason:",
			,
			"Other Criteria",
			"Total returns:",
			"Returns as % of pool:",
			returnsReqStr,
			"Abstains as % of pool:",
			abstainsReqStr,
		]);
	}
	ws.getColumn(colNum).values = labelCol;

	ws.getColumn(colNum + 1).width = 15;
	let dataCol = [
		"",
		opened,
		closed,
		duration,
		votingPoolSize,
		,
		"",
		approvalRate,
		r.Approve,
		r.Disapprove,
		r.Abstain,
	];
	if (votingPoolSize) {
		dataCol = dataCol.concat([
			,
			"",
			r.InvalidVote,
			r.InvalidDisapprove,
			r.InvalidAbstain,
			,
			"",
			returns,
			returnsPct,
			,
			abstainsPct,
		]);
	}
	ws.getColumn(colNum + 1).values = dataCol;

	var sectNameRows = [1, 7];
	if (votingPoolSize) {
		sectNameRows = sectNameRows.concat([13, 18]);
	}
	sectNameRows.forEach((rowNum) => {
		ws.getCell(rowNum, colNum).font = { bold: true };
		ws.getCell(rowNum, colNum).alignment = {
			vertical: "middle",
			horizontal: "left",
		};
		ws.mergeCells(rowNum, colNum, rowNum, colNum + 1);
	});

	[2, 3, 4].forEach((rowNum) => {
		ws.getCell(rowNum, colNum + 1).alignment = {
			vertical: "middle",
			horizontal: "right",
		};
	});

	var pctRows = [8];
	if (votingPoolSize) {
		pctRows = pctRows.concat([20, 22]);
	}
	pctRows.forEach(
		(rowNum) => (ws.getCell(rowNum, colNum + 1).numFmt = "0.0%")
	);

	if (votingPoolSize) {
		[21, 23].forEach((rowNum) => {
			ws.mergeCells(rowNum, colNum, rowNum, colNum + 1);
		});
	}
}

export async function genResultsSpreadsheet(
	user: User,
	results: ResultsCoalesced[],
	res: Response
) {
	const workbook = new ExcelJS.Workbook();
	workbook.creator = user.Name;
	for (let r of results) {
		let ws = workbook.addWorksheet(getSheetName(r.ballot.BallotID));
		populateResultsWorksheet(ws, r.ballot, r.results);
	}
	return workbook.xlsx.write(res);
}
