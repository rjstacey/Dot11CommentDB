/*
 * Handle spreadsheets from Adrian's members database
 */
import ExcelJS from "exceljs";
import { validateSpreadsheetHeader } from "../utils/index.js";
import type {
	Member,
	StatusChangeEntry,
	ContactEmail,
	ContactInfo,
} from "@schemas/members.js";

/*
 * Valid status mappings
 */
const validStatus = {
	obsolete: "Obsolete",
	"non-voter": "Non-Voter",
	voter: "Voter",
	"potential voter": "Potential Voter",
	aspirant: "Aspirant",
	exoffico: "ExOfficio",
};

const correctStatus = (status: string) =>
	validStatus[status.toLowerCase()] || status;

const membersDatabaseHeader = [
	"MemberID",
	"LMSCID",
	"SApin",
	"LastName",
	"FirstName",
	"MI",
	"Affiliation",
	"Email",
	"Employer",
	"StreetLine1",
	"StreetLine2",
	"City",
	"State",
	"Zip",
	"Country",
	"Phone",
	"Fax",
	"Status",
	"NewStatus",
	"Override",
	"OverrideReason",
	"StatusChangeReason",
	"StatusChangeTime",
	"CountPlenaries",
	"CountInterims",
	"CountQualifyingMeetings",
	"CountEligibleBallots",
	"CountBallots",
	"ExVoter",
] as const;

export type MemberSSBasic = Pick<
	Member,
	| "SAPIN"
	| "Name"
	| "FirstName"
	| "MI"
	| "LastName"
	| "Email"
	| "Affiliation"
	| "Employer"
	| "Status"
	| "StatusChangeOverride"
	| "StatusChangeDate"
	| "MemberID"
	| "ContactInfo"
>;

function parseMembersDatabaseEntry(u: ExcelJS.CellValue[]) {
	const contactInfo: ContactInfo = {
		StreetLine1: (u[9] as string | null) || "",
		StreetLine2: (u[10] as string | null) || "",
		City: (u[11] as string | null) || "",
		State: (u[12] as string | null) || "",
		Zip: (u[13] as string | null) || "",
		Country: (u[14] as string | null) || "",
		Phone: (u[15] as string | null) || "",
		Fax: (u[16] as string | null) || "",
	};

	const statusChangeDate = u[22] instanceof Date ? u[22].toISOString() : null;

	const entry: MemberSSBasic = {
		Name: "",
		MemberID: parseInt(u[0] as string),
		SAPIN: parseInt(u[2] as string),
		LastName: (u[3] as string | null) || "",
		FirstName: (u[4] as string | null) || "",
		MI: (u[5] as string | null) || "",
		Affiliation: (u[6] as string | null) || "",
		Email: (u[7] as string | null) || "",
		Employer: (u[8] as string | null) || "",
		Status: correctStatus(u[17] as string),
		StatusChangeOverride: u[19] ? true : false,
		StatusChangeDate: statusChangeDate,
		ContactInfo: contactInfo,
	};

	entry.Name = entry.FirstName;
	if (entry.MI) entry.Name += " " + entry.MI;
	entry.Name += " " + entry.LastName;

	if (isNaN(entry.SAPIN)) entry.SAPIN = 0;

	return entry;
}

export async function parseMembersSpreadsheet(buffer: Buffer) {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer);

	const rows: ExcelJS.CellValue[][] = []; // an array of arrays
	workbook.getWorksheet(1)?.eachRow((row) => {
		if (Array.isArray(row.values))
			rows.push(row.values.slice(1, membersDatabaseHeader.length + 1));
	});

	if (rows.length === 0) throw new TypeError("Got empty members file");

	// Check the column names to make sure we have the right file
	validateSpreadsheetHeader(rows.shift()!, membersDatabaseHeader);

	// Parse each row
	return rows.map(parseMembersDatabaseEntry);
}

const sapinsHeader = ["MemberID", "SApin", "DateAdded"] as const;

function parseSAPINsEntry(u: ExcelJS.CellValue[]) {
	let entry = {
		MemberID: parseInt(u[0] as string),
		SAPIN: parseInt(u[1] as string),
		DateAdded: u[2] ? (u[2] as Date).toISOString() : null,
	};
	return entry;
}

export async function parseSAPINsSpreadsheet(buffer: Buffer) {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer);

	const rows: ExcelJS.CellValue[][] = []; // an array of arrays
	workbook.getWorksheet(1)?.eachRow((row) => {
		if (Array.isArray(row.values))
			rows.push(row.values.slice(1, sapinsHeader.length + 1));
	});

	if (rows.length === 0) throw new TypeError("Got empty sapins file");

	// Check the column names to make sure we have the right file
	validateSpreadsheetHeader(rows.shift()!, sapinsHeader);

	// Parse each row
	return rows.map(parseSAPINsEntry);
}

const emailsHeader = [
	"MemberID",
	"Email",
	"Primary",
	"DateAdded",
	"Broken",
] as const;

function parseEmailsEntry(u: ExcelJS.CellValue[]) {
	let entry: Omit<ContactEmail, "id"> & { MemberID?: number } = {
		MemberID: parseInt(u[0] as string),
		Email: (u[1] as string) || "",
		DateAdded: u[3] ? (u[3] as Date).toISOString() : null,
		Primary: u[2] ? true : false,
		Broken: u[4] ? true : false,
	};
	return entry;
}

export async function parseEmailsSpreadsheet(buffer: Buffer) {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer);

	const rows: ExcelJS.CellValue[][] = []; // an array of arrays
	workbook.getWorksheet(1)?.eachRow((row) => {
		if (Array.isArray(row.values))
			rows.push(row.values.slice(1, emailsHeader.length + 1));
	});

	if (rows.length === 0) throw new TypeError("Got empty emails file");

	// Check the column names to make sure we have the right file
	validateSpreadsheetHeader(rows.shift()!, emailsHeader);

	// Parse each row
	return rows.map(parseEmailsEntry);
}

const historyHeader = [
	"ID",
	"MemberID",
	"VoterID obsolete",
	"Date",
	"MeetingID",
	"MeetingType",
	"BallotID",
	"NewStatus",
	"OldStatus",
	"StatusChangeReason",
	"Reversed",
] as const;

function parseHistoryEntry(u: ExcelJS.CellValue[]) {
	let entry: Omit<StatusChangeEntry, "id"> & { MemberID?: number } = {
		MemberID: parseInt(u[1] as string),
		Date: u[3] ? (u[3] as Date).toISOString() : null,
		NewStatus: correctStatus((u[7] as string) || ""),
		OldStatus: correctStatus((u[8] as string) || ""),
		Reason: (u[9] as string) || "",
	};
	return entry;
}

export async function parseHistorySpreadsheet(buffer: Buffer) {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer);

	const rows: ExcelJS.CellValue[][] = []; // an array of arrays
	workbook.getWorksheet(1)?.eachRow((row) => {
		if (Array.isArray(row.values))
			rows.push(row.values.slice(1, historyHeader.length + 1));
	});

	if (rows.length === 0) throw new TypeError("Got empty status change file");

	// Check the column names to make sure we have the right file
	validateSpreadsheetHeader(rows.shift()!, historyHeader);

	// Parse each row
	return rows.map(parseHistoryEntry);
}
