/*
 * Handle MyProject spreadsheet files
 */
import ExcelJS from "exceljs";
import { validateSpreadsheetHeader, parseSpreadsheet } from "../utils";
import { fromHtml } from "./commentsSpreadsheet";
import type { Response } from "express";
import { getComments } from "./comments";
import type { Comment, CommentResolution } from "../schemas/comments";
import type { Member } from "../schemas/members";
import type { Result } from "../schemas/results";
import type { User } from "./users";

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

function parseMyProjectComment(c: any[]) {
	// MyProject uses <last name>, <first name> for comments but <first name> <last name> for results
	let [lastName, firstName] = c[3].split(", ");
	let name = (firstName ? firstName + " " : "") + lastName;

	let C_Clause = c[13] || "";
	let C_Line = c[14] || "";
	let C_Page = c[12] || "";
	let Page = parseFloat(C_Page) + parseFloat(C_Line) / 100;
	if (isNaN(Page)) Page = 0;

	const comment: Partial<Comment> = {
		C_Index: c[0], // Comment ID
		CommenterSAPIN: null,
		CommenterName: name, // Name
		CommenterEmail: c[4], // Email
		Category: c[11] ? c[11].charAt(0) : "", // Category: first letter only (G, T or E)
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
	return rows.map((c, i) => {
		const comment: Partial<Comment> = {
			CommentID: startCommentId + i,
			...parseMyProjectComment(c),
		};
		return comment;
	});
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
	let workbook = new ExcelJS.Workbook();
	try {
		await workbook.xlsx.load(buffer);
	} catch (err) {
		throw new TypeError("Invalid workbook: " + err);
	}

	let worksheet = workbook.getWorksheet(1);
	if (!worksheet)
		throw new TypeError("Unexpected file format; worksheet not found");

	// Check the column names to make sure we have the right file
	let row = worksheet.getRow(1);
	if (!row)
		throw new TypeError("Unexpected file format; header row not found");

	const header = Array.isArray(row.values) ? row.values.slice(1, 26) : [];
	validateSpreadsheetHeader(header, myProjectCommentsHeader);

	worksheet.eachRow((row, i) => {
		if (i === 1)
			// skip header
			return;
		if (Array.isArray(row.values)) {
			let comment = parseMyProjectComment(row.values.slice(1, 26));

			/* Find comment with matching identifier. */
			let dbC = dbComments.find((c) => c.C_Index === comment.C_Index);
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
		let result: Partial<Result> = {
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
 */
const myProjectRosterHeader = [
	"SA PIN",
	"Last Name",
	"First Name",
	"Middle Name",
	"Email Address",
	"Street Address/PO Box",
	"City",
	"State/Province",
	"Postal Code",
	"Country",
	"Phone",
	"Employer",
	"Affiliation",
	"Officer Role",
	"Involvement Level",
] as const;

const involvementLevelToStatus = {
	"Aspirant Member": "Aspirant",
	"Potential Member": "Potential Voter",
	"Voting Member": "Voter",
	Observer: "Non-Voter",
	"Non-Voting Member": "Non-Voter",
	"Corresponding Member": "Other",
	Member: "Other",
	"Nearly Member": "Other",
};

const mapStatus = (involvementLevel: string) =>
	involvementLevelToStatus[involvementLevel] || "Other";

const statusToInvolvementLevel = {
	Aspirant: "Aspirant Member",
	"Potential Voter": "Potential Member",
	Voter: "Voting Member",
	ExOfficio: "Voting Member",
	"Non-Voter": "Observer",
};

type Col = {
	width: number;
	set?: (m: any) => any;
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
	"Middle Name": {
		width: 18,
		set: (m) => m.MI,
	},
	"Email Address": {
		width: 41,
		set: (m) => m.Email,
	},
	"Street Address/PO Box": { width: 41 },
	City: { width: 41 },
	"State/Province": { width: 41 },
	"Postal Code": { width: 41 },
	Country: { width: 41 },
	Phone: { width: 31 },
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

const mapStatusToInvolvementLevel = (status: string) =>
	statusToInvolvementLevel[status] || "Observer";

function parseRosterEntry(u: any[]) {
	let LastName = u[1] || "";
	let FirstName = u[2] || "";
	let MI = u[3] || "";
	let Name = FirstName + (MI ? " " + MI : "") + " " + LastName;
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
		Status: mapStatus(u[14]),
	};
}

export async function parseMyProjectRosterSpreadsheet(buffer: Buffer) {
	let p: any[][] = []; // an array of arrays
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer);

	workbook.getWorksheet(1)?.eachRow((row) => {
		if (Array.isArray(row.values))
			p.push(row.values.slice(1, myProjectRosterHeader.length + 1));
	});

	if (p.length === 0) throw new Error("Got empty roster file");

	// Check the column names to make sure we have the right file
	validateSpreadsheetHeader(p.shift()!, myProjectRosterHeader);

	// Parse each row and assign CommentID
	return p.map(parseRosterEntry);
}

/*
 * generate MyProject roster spreadsheet
 */
export async function genMyProjectRosterSpreadsheet(
	user: User,
	members: Member[],
	res: Response
) {
	let workbook = new ExcelJS.Workbook();
	workbook.creator = user.Name;
	workbook.created = new Date();
	workbook.lastModifiedBy = user.Name;
	workbook.modified = new Date();

	let worksheet = workbook.addWorksheet("Roster Upload Template");
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
