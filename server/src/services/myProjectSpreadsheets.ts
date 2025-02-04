/*
 * Handle MyProject spreadsheet files
 */
import ExcelJS from "exceljs";
import { validateSpreadsheetHeader, parseSpreadsheet } from "../utils/index.js";
import { fromHtml } from "./commentsSpreadsheet.js";
import type { Response } from "express";
import { getComments } from "./comments.js";
import type {
	CategoryType,
	Comment,
	CommentResolution,
} from "@schemas/comments.js";
import type { Member, UpdateRosterOptions } from "@schemas/members.js";
import type { Result } from "@schemas/results.js";
import type { User } from "./users.js";

const myProjectCommentsHeader = [
	"Comment ID",
	"Date",
	"Comment #",
	"Name",
	"Email",
	"Phone",
	"Style",
	"Index #",
	"Classification",
	"Vote",
	"Affiliation",
	"Category",
	"Page",
	"Subclause",
	"Line",
	"Comment",
	"File",
	"Must be Satisfied",
	"Proposed Change",
	"Disposition Status",
	"Disposition Detail",
	"Other1",
	"Other2",
	"Other3",
] as const;

const reCommentID = /(I|R\d+)-(\d+)/;

function parseMyProjectComment(c: string[]) {
	// MyProject uses <last name>, <first name> for comments but <first name> <last name> for results
	const [lastName, firstName] = c[3].split(", ");
	const name = (firstName ? firstName + " " : "") + lastName;

	const C_Clause = c[13] || "";
	const C_Line = c[14] || "";
	const C_Page = c[12] || "";
	let Page = parseFloat(C_Page) + parseFloat(C_Line) / 100;
	if (isNaN(Page)) Page = 0;

	const m = reCommentID.exec(c[2]);
	if (!m) throw new TypeError("Invalid Comment # = " + c[2]);
	const CommentID = Number(m[2]);

	const cat = c[11] ? c[11].charAt(0) : ""; // Category: first letter only (G, T or E)
	let Category: CategoryType;
	if (cat === "T" || cat == "E" || cat === "G") Category = cat;
	else Category = "T";

	const comment: Partial<Comment> = {
		C_Index: Number(c[0]), // Comment ID
		CommentID, // Comment #
		CommenterSAPIN: null,
		CommenterName: name, // Name
		CommenterEmail: c[4], // Email
		Category, // Category (G, T or E)
		C_Page: c[12] || "", // Page
		C_Clause, // Subclause
		C_Line, // Line
		Comment: c[15] || "", // Comment
		ProposedChange: c[18] || "", // Proposed Change
		MustSatisfy: c[17].toLowerCase() === "yes", // Must be Satisfied
		Clause: C_Clause,
		Page,
	};

	return comment;
}

export async function parseMyProjectComments(
	startCommentId: number,
	file: Express.Multer.File
) {
	const rows = await parseSpreadsheet(file, myProjectCommentsHeader, 0, 26);

	// Parse each row and assign CommentID
	return rows.map(parseMyProjectComment);
}

const mapResnStatus = {
	A: "ACCEPTED",
	V: "REVISED",
	J: "REJECTED",
};

/*
 * Add approved resolutions to an existing MyProject comment spreadsheet
 */
async function myProjectAddResolutions(
	buffer: Buffer,
	dbComments: CommentResolution[],
	res: Response
) {
	const workbook = new ExcelJS.Workbook();
	try {
		await workbook.xlsx.load(buffer);
	} catch (err) {
		throw new TypeError("Invalid workbook: " + err);
	}

	const worksheet = workbook.getWorksheet(1);
	if (!worksheet)
		throw new TypeError("Unexpected file format; worksheet not found");

	// Check the column names to make sure we have the right file
	const row = worksheet.getRow(1);
	if (!row)
		throw new TypeError("Unexpected file format; header row not found");

	const headerV = Array.isArray(row.values) ? row.values.slice(1, 26) : [];
	const headerS = headerV.map((v) => v?.toString() || "");
	validateSpreadsheetHeader(headerS, myProjectCommentsHeader);

	worksheet.eachRow((row, i) => {
		if (i === 1) return; // skip header
		if (Array.isArray(row.values)) {
			const values = row.values
				.slice(1, 26)
				.map((v) => v?.toString() || "");
			const comment = parseMyProjectComment(values);

			/* Find comment with matching identifier. */
			const dbC = dbComments.find((c) => c.C_Index === comment.C_Index);
			if (dbC && dbC.ApprovedByMotion) {
				//console.log(`found ${comment.C_Index}`)
				row.getCell(20).value =
					(dbC.ResnStatus && mapResnStatus[dbC.ResnStatus]) || "";
				row.getCell(21).value = fromHtml(dbC.Resolution || "");
			}
		}
	});

	return workbook.xlsx.write(res);
}

export async function exportResolutionsForMyProject(
	ballot_id: number,
	file: { buffer: Buffer },
	res: Response
) {
	const comments = (await getComments(ballot_id)).filter(
		(c) => c.ResnStatus && c.ApprovedByMotion
	);

	res.attachment("comments_resolved.xlsx");
	return myProjectAddResolutions(file.buffer, comments, res);
}

/**
 * The myProject .xlsx file has "Affiliations(s)" while the .csv has "Affiliation(s)"
 */
const myProjectResultsHeader = [
	"Name",
	"EMAIL",
	/Affiliation[s]{0,1}(s)/,
	"Voter Classification",
	"Current Vote",
	"Comments",
] as const;

export async function parseMyProjectResults(file: Express.Multer.File) {
	const rows = await parseSpreadsheet(file, myProjectResultsHeader, 1);

	const results = rows.map((c) => {
		const result: Partial<Result> = {
			Name: c[0],
			Email: c[1],
			Affiliation: c[2],
			vote: c[4],
		};
		return result;
	});

	return results;
}

/*
 * MyProject Roster
 * Changed around 1/30/2025. Removed middle name and address.
 */
const myProjectRosterHeader = [
	"SA PIN",
	"Last Name",
	"First Name",
	//	"Middle Name",
	"Email Address",
	//	"Street Address/PO Box",
	//	"City",
	//	"State/Province",
	//	"Postal Code",
	//	"Country",
	//	"Phone",
	"Employer",
	"Affiliation",
	"Officer Role",
	"Involvement Level",
] as const;

const involvementLevelToStatus = {
	"Aspirant Member": "Aspirant",
	"Potential Member": "Potential Voter",
	"Voting Member": "Voter",
	"Non-Voting Member": "Non-Voter",
	Observer: "Non-Voter",
	"Corresponding Member": "Other",
	Member: "Other",
	"Nearly Member": "Other",
} as const;

const mapInvolvementLevelToStatus = (involvementLevel: string) =>
	involvementLevelToStatus[involvementLevel] || "Other";

const activeInvolvementLevel = [
	"Aspirant Member",
	"Potential Member",
	"Voting Member",
];

const statusToInvolvementLevel = {
	Aspirant: "Aspirant Member",
	"Potential Voter": "Potential Member",
	Voter: "Voting Member",
	ExOfficio: "Voting Member",
	"Non-Voter": "Non-Voting Member",
} as const;

const mapStatusToInvolvementLevel = (status: string) =>
	statusToInvolvementLevel[status] || "Observer";

const activeStatus = ["Aspirant", "Potential Voter", "Voter"];

type Col = {
	width: number;
	set?: (m: Member) => string | number;
};

const myProjectRosterColumns: Record<string, Col> = {
	"SA PIN": {
		width: 19,
		set: (m) => m.SAPIN,
	},
	"Last Name": {
		width: 24,
		set: (m) => m.LastName,
	},
	"First Name": {
		width: 20,
		set: (m) => m.FirstName,
	},
	/*"Middle Name": {
		width: 18,
		set: (m) => m.MI,
	},*/
	"Email Address": {
		width: 41,
		set: (m) => m.Email,
	},
	/*"Street Address/PO Box": { width: 41 },
	City: { width: 41 },
	"State/Province": { width: 41 },
	"Postal Code": { width: 41 },
	Country: { width: 41 },
	Phone: { width: 31 },*/
	Employer: {
		width: 25,
		set: (m) => m.Employer,
	},
	Affiliation: {
		width: 30,
		set: (m) => m.Affiliation,
	},
	"Officer Role": { width: 20 },
	"Involvement Level": {
		width: 26,
		set: (m) => mapStatusToInvolvementLevel(m.Status),
	},
};

function parseRosterEntry(u: string[]) {
	const LastName = u[1] || "";
	const FirstName = u[2] || "";
	const MI = u[3] || "";
	const Name = FirstName + (MI ? " " + MI : "") + " " + LastName;
	return {
		SAPIN: parseInt(u[0], 10),
		Name,
		LastName,
		FirstName,
		MI,
		Email: u[4] || "",
		Employer: u[11] || "",
		Affiliation: u[12] || "",
		OfficerRole: u[13] || "",
		Status: mapInvolvementLevelToStatus(u[14]),
	};
}

export async function parseMyProjectRosterSpreadsheet(buffer: Buffer) {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer);

	const rows: string[][] = [];
	workbook.getWorksheet(1)?.eachRow((row) => {
		if (Array.isArray(row.values)) {
			const values = row.values
				.slice(1, myProjectRosterHeader.length + 1)
				.map((v) => v?.toString() || "");
			rows.push(values);
		}
	});

	if (rows.length === 0) throw new Error("Got empty roster file");

	// Check the column names to make sure we have the right file
	validateSpreadsheetHeader(rows.shift()!, myProjectRosterHeader);

	// Parse each row and assign CommentID
	return rows.map(parseRosterEntry);
}

/*
 * generate MyProject roster spreadsheet
 */
export async function genMyProjectRosterSpreadsheet(
	user: User,
	members: Member[],
	res: Response
) {
	const workbook = new ExcelJS.Workbook();
	workbook.creator = user.Name;
	workbook.created = new Date();
	workbook.lastModifiedBy = user.Name;
	workbook.modified = new Date();

	const worksheet = workbook.addWorksheet("Roster Upload Template");
	worksheet.addRow(Object.keys(myProjectRosterColumns));
	worksheet.getRow(1).font = { bold: true };
	members.forEach((m, i) => {
		const row = worksheet.getRow(i + 2);
		row.values = Object.values(myProjectRosterColumns).map((col) =>
			typeof col.set === "function" ? col.set(m) : col.set || ""
		);
	});
	Object.values(myProjectRosterColumns).forEach((col, i) => {
		const column = worksheet.getColumn(i + 1);
		if (col.width) column.width = col.width;
	});

	res.attachment("RosterUsers.xlsx");
	return workbook.xlsx.write(res);
}

export async function updateMyProjectRoster(
	user: User,
	members: Member[],
	buffer: Buffer,
	options: UpdateRosterOptions,
	res: Response
) {
	let workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer);

	let ws = workbook.worksheets[0];
	if (!ws) throw new Error("Roster file has no worksheets");

	const headerRow = ws.getRow(1);
	if (!Array.isArray(headerRow.values)) throw new Error("Bad header row");
	const headerValues = headerRow.values
		.slice(1, myProjectCommentsHeader.length + 1)
		.map((v) => v?.toString() || "");
	validateSpreadsheetHeader(headerValues, myProjectRosterHeader);

	const sapinColNum = myProjectRosterHeader.indexOf("SA PIN") + 1;
	const emailColNum = myProjectRosterHeader.indexOf("Email Address") + 1;
	const involvementLevelColNum =
		myProjectRosterHeader.indexOf("Involvement Level") + 1;
	if (sapinColNum <= 0 || emailColNum <= 0 || involvementLevelColNum <= 0)
		throw new Error("indexing error");

	const unchangedRows: number[] = []; // row numbers, highest to lowest
	ws.eachRow((row) => {
		if (row.number === 1) return; // skip header
		const sapin = Number(row.getCell(sapinColNum).text);
		const email = row.getCell(emailColNum).text.toLowerCase();
		const involvementLevel = row.getCell(involvementLevelColNum).text;
		const currentlyActive =
			activeInvolvementLevel.includes(involvementLevel);

		let memberIndex = members.findIndex((m) => m.SAPIN === sapin);
		if (memberIndex < 0)
			memberIndex = members.findIndex(
				(m) => m.Email.toLowerCase() === email
			);
		if (memberIndex >= 0) {
			// Member is in our database
			const m = members[memberIndex];
			members.splice(memberIndex, 1); // Handled this member so remove from list
			const newInvolvementLevel = statusToInvolvementLevel[m.Status];
			const newlyActive =
				activeInvolvementLevel.includes(newInvolvementLevel);
			// No change needed if the member is not currently active or has not become active
			if (
				(!currentlyActive && !newlyActive) ||
				involvementLevel === newInvolvementLevel
			) {
				unchangedRows.unshift(row.number);
				return;
			}
			row.getCell(involvementLevelColNum).value = newInvolvementLevel;
		} else {
			// Member is not in our database
			if (!currentlyActive) {
				// No change needed if the member is not currently active
				unchangedRows.unshift(row.number);
				return;
			}
			// We have no record of this member; change to observer
			row.getCell(involvementLevelColNum).value = "Observer";
		}
	});

	if (options.removeUnchanged) {
		/*unchangedRows.forEach((n) => {
			ws.spliceRows(n, 1);
		}); too slow */
		const workbook2 = new ExcelJS.Workbook();
		const ws2 = workbook2.addWorksheet("Roster Changes", {
			properties: ws.properties,
		});
		ws.eachRow((row) => {
			if (!unchangedRows.includes(row.number)) {
				const row2 = ws2.addRow(Array(row.cellCount).fill(""));
				row2.eachCell((cell2, i) => {
					const cell = row.getCell(i);
					cell2.value = cell.value;
					cell2.style = cell.style;
				});
			}
		});
		for (let i = 1; i <= ws.columns.length; i++) {
			ws2.getColumn(i).width = ws.getColumn(i).width;
		}
		workbook = workbook2;
		ws = ws2;
	}

	console.log(options);
	if (options.appendNew) {
		for (const m of members) {
			if (!activeStatus.includes(m.Status)) continue;
			const values = Object.values(myProjectRosterColumns).map((col) =>
				typeof col.set === "function" ? col.set(m) : col.set || ""
			);
			ws.addRow(values);
		}
	}

	workbook.lastModifiedBy = user.Name;
	workbook.modified = new Date();
	res.attachment("RosterUsers-updated.xlsx");
	return workbook.xlsx.write(res);
}
