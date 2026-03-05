import ExcelJS from "exceljs";
import type { Response } from "express";
import { validateSpreadsheetHeader } from "../utils/index.js";
import {
	MembershipEvent,
	MembershipEventCreate,
} from "@schemas/membershipOverTime.js";
import type { UserContext } from "./users.js";

const header = ["Date", "Voters"] as const;

function parseEntry(u: ExcelJS.CellValue[]) {
	const entry: MembershipEventCreate = {
		date: u[0] ? (u[0] as Date).toISOString().split("T")[0] : "",
		count: parseInt((u[1] as string) || "0"),
		note: u[2] ? (u[2] as string) : null,
	};
	return entry;
}

export async function parseMembershipOverTimeSpreadsheet(buffer: Buffer) {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

	const rows: ExcelJS.CellValue[][] = []; // an array of arrays
	workbook.getWorksheet(1)?.eachRow((row) => {
		if (Array.isArray(row.values))
			rows.push(row.values.slice(1, header.length + 1));
	});

	if (rows.length === 0) throw new TypeError("Got empty file");

	// Check the column names to make sure we have the right file
	const headerRow = rows.shift()!.map((v) => v?.toString() || "");
	validateSpreadsheetHeader(headerRow, header);

	// Parse each row
	return rows.map(parseEntry);
}

export async function genMembershipOverTimeSpreadsheet(
	user: UserContext,
	events: MembershipEvent[],
	res: Response,
) {
	const workbook = new ExcelJS.Workbook();
	workbook.creator = user.Name;
	workbook.created = new Date();
	workbook.lastModifiedBy = user.Name;
	workbook.modified = new Date();

	const sheet = workbook.addWorksheet();
	sheet.addRow(["Date", "Voters", "Note"]);
	for (const event of events) {
		sheet.addRow([event.date, event.count, event.note]);
	}

	return workbook.xlsx.write(res);
}
