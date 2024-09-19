/*
 * Handle the legacy (Adrian's comment database) spreadsheet file
 */
import ExcelJS from "exceljs";
import { isCorrectSpreadsheetHeader } from "../utils";
import { ballotChangesSchema, type Ballot } from "../schemas/ballots";
import { getComments } from "./comments";
import type { CommentResolution } from "../schemas/comments";
import type { User } from "./users";
import type { Response } from "express";
import { BallotType } from "./ballots";

type ColSet = (b: Ballot, c: CommentResolution, v: ExcelJS.Cell) => void;
type ColGet = (v: ExcelJS.CellValue, c: Partial<CommentResolution>) => void;

type Col = {
	width?: number;
	outlineLevel?: number;
	numFmt?: string;
	set?: ColSet;
	get?: ColGet;
	value?: any;
};

function parseString(v: ExcelJS.CellValue) {
	return typeof v === "string" ? v : "";
}

function setCID(b: Ballot, c: CommentResolution, cell: ExcelJS.Cell) {
	if (b.Type === BallotType.SA) {
		cell.value = c.CID;
	} else {
		cell.numFmt = c.ResolutionCount > 1 ? "#.0" : "#";
		cell.value = parseFloat(c.CID);
	}
}

function getResolution(v: ExcelJS.CellValue, c: Partial<CommentResolution>) {
	if (typeof v === "string") {
		// Override 'Resn Status' if the resolution itself has something that looks like a resolution status
		if (v.search(/^\s*(ACCEPT|ACCEPTED)/i) >= 0) c.ResnStatus = "A";
		else if (v.search(/^\s*(REVISE|REVISED)/i) >= 0) c.ResnStatus = "V";
		else if (v.search(/^\s*(REJECT|REJECTED)/i) >= 0) c.ResnStatus = "J";

		// Remove the resolution status if it exists. And leading whitespace or dash.
		c.Resolution = v.replace(
			/^\s*(ACCEPTED|ACCEPT|REVISED|REVISE|REJECTED|REJECT)[:-\s\n]*/i,
			""
		);
		c.Resolution = toHtml(c.Resolution);
	}
}

const mapResnStatus = {
	A: "ACCEPTED",
	J: "REJECTED",
	V: "REVISED",
};

function setResolution(b: Ballot, c: CommentResolution, cell: ExcelJS.Cell) {
	let r = "";
	if (c.ResnStatus && mapResnStatus[c.ResnStatus]) {
		r += mapResnStatus[c.ResnStatus];
		if (c.Resolution) r += "\n";
	}
	if (c.Resolution) {
		r += fromHtml(c.Resolution);
	}
	cell.value = r;
}

function getPage(v: ExcelJS.CellValue, c: Partial<CommentResolution>) {
	let page = 0;
	if (typeof v === "string") {
		page = parseFloat(v);
		if (isNaN(page)) page = 0;
	}
	c.Page = page;
}

function setStatus(b: Ballot, c: CommentResolution, cell: ExcelJS.Cell) {
	let Status = "";
	if (c.ApprovedByMotion) Status = "Resolution approved";
	else if (c.ReadyForMotion) Status = "Ready for motion";
	else if (c.ResnStatus) Status = "Resolution drafted";
	else if (c.AssigneeName) Status = "Assigned";
	cell.value = Status;
}

const getResnStatus: ColGet = (v, c) => {
	c.ResnStatus = null;
	if (typeof v === "string") {
		v = v.toUpperCase()[0];
		if (v === "A" || v === "V" || v === "J") c.ResnStatus = v;
	}
};

const getEditStatus: ColGet = (v, c) => {
	c.EditStatus = null;
	if (typeof v === "string") {
		v = v.toUpperCase()[0];
		if (v === "I" || v === "N") c.EditStatus = v;
	}
};

const setSubmission: ColSet = (b, c, cell) => {
	cell.value = "";
	if (c.Submission) {
		let text = c.Submission;
		let gg = "11";
		let m = text.match(/^(\d{1,2})-/);
		if (m) {
			gg = ("0" + m[1]).slice(-2);
			text = text.replace(/^\d{1,2}-/, "");
		}
		m = text.match(/(\d{2})\/(\d{1,4})r(\d+)/);
		if (m) {
			const yy = ("0" + m[1]).slice(-2);
			const nnnn = ("0000" + m[2]).slice(-4);
			const rr = ("0" + m[3]).slice(-2);
			const hyperlink = `https://mentor.ieee.org/802.11/dcn/${yy}/${gg}-${yy}-${nnnn}-${rr}`;
			cell.value = {
				text: c.Submission,
				hyperlink,
				tooltip: hyperlink,
			};
			cell.style.font = { color: { argb: "7f0011e0" }, underline: true };
		}
	}
};

const legacyColumns: Record<string, Col> = {
	CID: {
		width: 8,
		set: setCID,
		get: (v, c) => {
			c.CID = parseString(v);
		},
	},
	Commenter: {
		width: 14,
		outlineLevel: 1,
		set: (b, c, cell) => {
			cell.value = c.CommenterName || "";
		},
		get: (v, c) => {
			c.CommenterName = parseString(v);
		},
	},
	LB: {
		width: 8,
		outlineLevel: 1,
		set: (b, c, cell) => {
			cell.value = b.BallotID;
		},
	},
	Draft: {
		width: 8,
		outlineLevel: 1,
		set: (b, c, cell) => {
			cell.value = b.Document;
		},
	},
	"Clause Number(C)": {
		width: 11,
		outlineLevel: 1,
		set: (b, c, cell) => {
			cell.value = c.C_Clause || "";
		},
		get: (v, c) => {
			c.C_Clause = parseString(v);
		},
	},
	"Page(C)": {
		width: 8,
		outlineLevel: 1,
		set: (b, c, cell) => {
			cell.value = c.C_Page || "";
		},
		get: (v, c) => {
			c.C_Page = parseString(v);
		},
	},
	"Line(C)": {
		width: 8,
		outlineLevel: 1,
		set: (b, c, cell) => {
			cell.value = c.C_Line || "";
		},
		get: (v, c) => {
			c.C_Line = parseString(v);
		},
	},
	"Type of Comment": {
		width: 10,
		outlineLevel: 1,
		set: (b, c, cell) => {
			cell.value = c.Category || "";
		},
		get: (v, c) => {
			c.Category = parseString(v);
		},
	},
	"Part of No Vote": {
		width: 10,
		outlineLevel: 1,
		set: (b, c, cell) => {
			cell.value = c.MustSatisfy ? "Yes" : "No";
		},
		get: (v, c) => {
			c.MustSatisfy = v === "Yes";
		},
	},
	Page: {
		width: 8,
		numFmt: "#0.00",
		set: (b, c, cell) => {
			cell.value = c.Page;
		},
		get: getPage,
	},
	Line: {
		width: 7,
		outlineLevel: 1,
		set: (b, c, cell) => {
			cell.value = c.C_Line || "";
		},
	},
	Clause: {
		width: 11,
		numFmt: "@",
		set: (b, c, cell) => {
			cell.value = c.Clause || "";
		},
		get: (v, c) => {
			c.Clause = parseString(v);
		},
	},
	"Duplicate of CID": {
		width: 10,
		set: (b, c, cell) => {
			cell.value = "";
		},
	},
	"Resn Status": {
		width: 8,
		numFmt: "@",
		set: (b, c, cell) => {
			cell.value = c.ResnStatus || "";
		},
		get: getResnStatus,
	},
	Assignee: {
		width: 11,
		outlineLevel: 1,
		numFmt: "@",
		set: (b, c, cell) => {
			cell.value = c.AssigneeName || "";
		},
		get: (v, c) => {
			c.AssigneeName = parseString(v);
		},
	},
	Submission: {
		width: 12,
		outlineLevel: 1,
		numFmt: "@",
		set: (b, c, cell) => {
			cell.value = c.Submission || "";
		},
		get: (v, c) => {
			c.Submission = parseString(v);
		},
	},
	"Motion Number": {
		width: 9,
		outlineLevel: 1,
		set: (b, c, cell) => {
			cell.value = c.ApprovedByMotion || "";
		},
		get: (v, c) => {
			c.ApprovedByMotion = parseString(v);
		},
	},
	Comment: {
		width: 25,
		numFmt: "@",
		set: (b, c, cell) => {
			cell.value = (c.Comment || "").replace(/[\u{0080}-\u{FFFF}]/gu, "");
		},
		get: (v, c) => {
			c.Comment = parseString(v);
		},
	},
	"Proposed Change": {
		width: 25,
		numFmt: "@",
		set: (b, c, cell) => {
			cell.value = (c.ProposedChange || "").replace(
				/[\u{0080}-\u{FFFF}]/gu,
				""
			);
		},
		get: (v, c) => {
			c.ProposedChange = parseString(v);
		},
	},
	Resolution: {
		width: 25,
		numFmt: "@",
		set: setResolution,
		get: getResolution,
	},
	"Owning Ad-hoc": {
		width: 9,
		numFmt: "@",
		set: (b, c, cell) => {
			cell.value = c.AdHoc || "";
		},
		get: (v, c) => {
			c.AdHoc = parseString(v);
		},
	},
	"Comment Group": {
		width: 10,
		numFmt: "@",
		set: (b, c, cell) => {
			cell.value = c.CommentGroup || "";
		},
		get: (v, c) => {
			c.CommentGroup = parseString(v);
		},
	},
	"Ad-hoc Status": {
		width: 10,
		numFmt: "@",
		set: setStatus,
	},
	"Ad-hoc Notes": {
		width: 25,
		numFmt: "@",
		set: (b, c, cell) => {
			cell.value = fromHtml(c.Notes);
		},
		get: (v, c) => {
			c.Notes = toHtml(parseString(v));
		},
	},
	"Edit Status": {
		width: 8,
		numFmt: "@",
		set: (b, c, cell) => {
			cell.value = c.EditStatus || "";
		},
		get: getEditStatus,
	},
	"Edit Notes": {
		width: 25,
		numFmt: "@",
		set: (b, c, cell) => {
			cell.value = fromHtml(c.EditNotes);
		},
		get: (v, c) => {
			c.EditNotes = toHtml(parseString(v));
		},
	},
	"Edited in Draft": {
		width: 9,
		numFmt: "@",
		set: (b, c, cell) => {
			cell.value = c.EditInDraft || "";
		},
		get: (v, c) => {
			c.EditInDraft = parseString(v);
		},
	},
	"Last Updated": {
		width: 15,
		outlineLevel: 1,
		numFmt: "yyyy-mm-dd hh:mm",
		set: (b, c, cell) => {
			cell.value = c.LastModifiedTime;
		},
	},
	"Last Updated By": {
		numFmt: "@",
		outlineLevel: 1,
		set: (b, c, cell) => {
			cell.value = "";
		},
	},
};

const modernColumns: Record<string, Col> = {
	CID: {
		width: 8,
		set: setCID,
		get: (v, c) => {
			c.CID = parseString(v);
		},
	},
	Commenter: {
		width: 14,
		outlineLevel: 2,
		set: (b, c, cell) => {
			cell.value = c.CommenterName || "";
		},
		get: (v, c) => {
			c.CommenterName = parseString(v);
		},
	},
	"Must Be Satisfied": {
		width: 10,
		outlineLevel: 2,
		set: (b, c, cell) => {
			cell.value = c.MustSatisfy ? "Yes" : "No";
		},
		get: (v, c) => {
			c.MustSatisfy = v === "Yes";
		},
	},
	"Clause Number(C)": {
		width: 11,
		outlineLevel: 2,
		set: (b, c, cell) => {
			cell.value = c.C_Clause || "";
		},
		get: (v, c) => {
			c.C_Clause = parseString(v);
		},
	},
	"Page(C)": {
		width: 8,
		outlineLevel: 2,
		set: (b, c, cell) => {
			cell.value = c.C_Page || "";
		},
		get: (v, c) => {
			c.C_Page = parseString(v);
		},
	},
	"Line(C)": {
		width: 8,
		outlineLevel: 2,
		set: (b, c, cell) => {
			cell.value = c.C_Line || "";
		},
		get: (v, c) => {
			c.C_Line = parseString(v);
		},
	},
	Category: {
		width: 10,
		outlineLevel: 2,
		set: (b, c, cell) => {
			cell.value = c.Category || "";
		},
		get: (v, c) => {
			c.Category = parseString(v);
		},
	},
	Clause: {
		width: 11,
		numFmt: "@",
		set: (b, c, cell) => {
			cell.value = c.Clause || "";
		},
		get: (v, c) => {
			c.Clause = parseString(v);
		},
	},
	Page: {
		width: 8,
		numFmt: "#0.00",
		set: (b, c, cell) => {
			cell.value = c.Page;
		},
		get: getPage,
	},
	Comment: {
		width: 25,
		numFmt: "@",
		set: (b, c, cell) => {
			cell.value = (c.Comment || "").replace(/[\u{0080}-\u{FFFF}]/gu, "");
		},
		get: (v, c) => {
			c.Comment = parseString(v);
		},
	},
	"Proposed Change": {
		width: 25,
		numFmt: "@",
		set: (b, c, cell) => {
			cell.value = (c.ProposedChange || "").replace(
				/[\u{0080}-\u{FFFF}]/gu,
				""
			);
		},
		get: (v, c) => {
			c.ProposedChange = parseString(v);
		},
	},
	"Ad-hoc": {
		width: 9,
		numFmt: "@",
		outlineLevel: 1,
		set: (b, c, cell) => {
			cell.value = c.AdHoc || "";
		},
		get: (v, c) => {
			c.AdHoc = parseString(v);
		},
	},
	"Comment Group": {
		width: 10,
		numFmt: "@",
		outlineLevel: 1,
		set: (b, c, cell) => {
			cell.value = c.CommentGroup || "";
		},
		get: (v, c) => {
			c.CommentGroup = parseString(v);
		},
	},
	"Ad-hoc Notes": {
		width: 25,
		numFmt: "@",
		outlineLevel: 1,
		set: (b, c, cell) => {
			cell.value = fromHtml(c.Notes);
		},
		get: (v, c) => {
			c.Notes = toHtml(parseString(v));
		},
	},
	Status: {
		width: 10,
		numFmt: "@",
		set: setStatus,
	},
	Assignee: {
		width: 11,
		outlineLevel: 1,
		numFmt: "@",
		set: (b, c, cell) => {
			cell.value = c.AssigneeName || "";
		},
		get: (v, c) => {
			c.AssigneeName = parseString(v);
		},
	},
	Submission: {
		width: 12,
		outlineLevel: 1,
		numFmt: "@",
		set: setSubmission,
		get: (v, c) => {
			c.Submission = parseString(v);
		},
	},
	"Resn Status": {
		width: 8,
		numFmt: "@",
		set: (b, c, cell) => {
			cell.value = c.ResnStatus || "";
		},
		get: getResnStatus,
	},
	Resolution: {
		width: 25,
		numFmt: "@",
		set: setResolution,
		get: getResolution,
	},
	"Ready For Motion": {
		width: 9,
		outlineLevel: 1,
		set: (b, c, cell) => {
			cell.value = c.ReadyForMotion ? "Yes" : "";
		},
		get: (v, c) => {
			c.ReadyForMotion = parseString(v).search(/y|1/i) >= 0;
		},
	},
	"Motion Number": {
		width: 9,
		outlineLevel: 1,
		set: (b, c, cell) => {
			cell.value = c.ApprovedByMotion || "";
		},
		get: (v, c) => {
			c.ApprovedByMotion = parseString(v);
		},
	},
	"Edit Status": {
		width: 8,
		numFmt: "@",
		set: (b, c, cell) => {
			cell.value = c.EditStatus || "";
		},
		get: getEditStatus,
	},
	"Edited in Draft": {
		width: 9,
		numFmt: "@",
		set: (b, c, cell) => {
			cell.value = c.EditInDraft || "";
		},
		get: (v, c) => {
			c.EditInDraft = parseString(v);
		},
	},
	"Edit Notes": {
		width: 25,
		numFmt: "@",
		set: (b, c, cell) => {
			cell.value = fromHtml(c.EditNotes);
		},
		get: (v, c) => {
			c.EditNotes = toHtml(parseString(v));
		},
	},
	"Last Updated": {
		width: 15,
		outlineLevel: 1,
		numFmt: "yyyy-mm-dd hh:mm",
		set: (b, c, cell) => {
			cell.value = c.LastModifiedTime ? new Date(c.LastModifiedTime) : "";
		},
	},
	"Last Updated By": {
		numFmt: "@",
		outlineLevel: 1,
		set: (b, c, cell) => {
			cell.value = c.LastModifiedName || "";
		},
	},
};

const commentColumns = [
	"Commenter",
	"LB",
	"Draft",
	"Must Be Satisfied",
	"Clause Number(C)",
	"Page(C)",
	"Line(C)",
	"Category",
	"Type of Comment",
	"Clause",
	"Page",
	"Comment",
	"Proposed Change",
	"Ad-hoc",
	"Comment Group",
	"Ad-hoc Notes",
];

export async function parseCommentsSpreadsheet(
	buffer: Buffer,
	sheetName: string
) {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buffer);

	const worksheet = workbook.getWorksheet(sheetName);
	if (!worksheet) {
		let sheets: string[] = [];
		workbook.eachSheet((worksheet, sheetId) => {
			sheets.push(worksheet.name);
		});
		throw new TypeError(
			`Workbook does not have a "${sheetName}" worksheet. It does have the following worksheets:\n${sheets.join(
				", "
			)}`
		);
	}

	// Row 1 is the header
	const headerRow: string[] = worksheet.getRow(1).values as string[];
	headerRow.shift(); // Adjust to zero based column numbering
	const legacyHeadings = Object.keys(legacyColumns);
	const modernHeadings = Object.keys(modernColumns);
	const isLegacy = isCorrectSpreadsheetHeader(headerRow, legacyHeadings);
	if (!isLegacy && !isCorrectSpreadsheetHeader(headerRow, modernHeadings)) {
		throw new TypeError(
			`Unexpected column headings ${headerRow.join(", ")}. ` +
				`\n\nExpected legacy headings: ${legacyHeadings.join(", ")}.` +
				`\n\nOr modern headings: ${modernHeadings.join(", ")}.`
		);
	}

	var comments: CommentResolution[] = [];
	const columns = isLegacy ? legacyColumns : modernColumns;
	worksheet.eachRow((row) => {
		const entry: Partial<CommentResolution> = {};
		Object.values(columns).forEach(
			(col, i) => col.get && col.get(row.getCell(i + 1).text, entry)
		);
		comments.push(entry as CommentResolution);
	});
	comments.shift(); // remove header
	//console.log(comments.slice(0, 4))

	return comments;
}

export function fromHtml(html: any): string {
	if (typeof html !== "string") return "";

	html = html.replace(
		/<p\w[^>]*>(.*)<\/p[^>]*>/g,
		(match, entity) => `${entity}\n`
	);
	html = html.replace(/<[^>]+>/g, "");

	var translate_re = /&(nbsp|amp|quot|lt|gt);/g;
	var translate = {
		nbsp: " ",
		amp: "&",
		quot: '"',
		lt: "<",
		gt: ">",
	};
	html = html.replace(translate_re, (match, entity) => translate[entity]);

	return html;
}

function toHtml(value: string | null | undefined) {
	if (!value) return "";

	const s = value
		.split("&")
		.join("&amp;")
		.split('"')
		.join("&quot;")
		.split("<")
		.join("&lt;")
		.split(">")
		.join("&gt;")
		.split("\n")
		.map((line) => `<p>${line}</p>`)
		.join("");
	return s;
}

// Convert column number into letter, e.g. 1 => A, 26 => Z, 27 => AA
const getColRef = (n: number) =>
	n
		? getColRef(Math.floor((n - 1) / 26)) +
		  String.fromCharCode(65 + ((n - 1) % 26))
		: "";

function addResolutionFormatting(
	sheet: ExcelJS.Worksheet,
	columns: Record<string, Col>,
	nRows: number
) {
	// Add conditional formating for the "Resolution" column. Color the cell based on Resn Status
	const resolutionColumn = getColRef(
		Object.keys(columns).indexOf("Resolution") + 1
	);
	const resnStatusColumn = getColRef(
		Object.keys(columns).indexOf("Resn Status") + 1
	);
	sheet.addConditionalFormatting({
		ref: `\$${resolutionColumn}\$2:\$${resolutionColumn}\$${nRows - 1}`,
		rules: [
			{
				type: "expression",
				formulae: [`ISNUMBER(SEARCH("A",\$${resnStatusColumn}2))`],
				style: {
					fill: {
						type: "pattern",
						pattern: "solid",
						bgColor: { argb: "FFd3ecd3" },
					},
				},
				priority: 0,
			},
			{
				type: "expression",
				formulae: [`ISNUMBER(SEARCH("V",\$${resnStatusColumn}2))`],
				style: {
					fill: {
						type: "pattern",
						pattern: "solid",
						bgColor: { argb: "FFf9ecb9" },
					},
				},
				priority: 0,
			},
			{
				type: "expression",
				formulae: [`ISNUMBER(SEARCH("J",\$${resnStatusColumn}2))`],
				style: {
					fill: {
						type: "pattern",
						pattern: "solid",
						bgColor: { argb: "FFf3c0c0" },
					},
				},
				priority: 0,
			},
		],
	});
}

/*
function addStatus(
	sheet: ExcelJS.Worksheet,
	columns: Record<string, Col>,
	nRows: number
) {
	const headings = Object.keys(columns);
	const statusIndex = headings.indexOf("Status");
	if (statusIndex < 0) return;

	const motionNumberCol = getColRef(headings.indexOf("Motion Number") + 1);
	const readyForMotionCol = getColRef(
		headings.indexOf("Ready For Motion") + 1
	);
	const resnStatusCol = getColRef(headings.indexOf("Resn Status") + 1);
	const assigneeCol = getColRef(headings.indexOf("Assignee") + 1);

	// Add formula to derive value for the status column
	const statusCol = getColRef(statusIndex + 1);
	sheet.getCell(2, statusIndex + 1).value = {
		formula:
			`=IF(\$${motionNumberCol}2<>"", "Resolution approved", ` +
			`IF(\$${readyForMotionCol}2<>"", "Ready for motion", ` +
			`IF(\$${resnStatusCol}2<>"", "Resolution drafted", ` +
			`IF(\$${assigneeCol}2<>"", "Assigned", ""))))`,
		result: "",
		shareType: "shared",
		ref: `${statusCol}2:${statusCol}${nRows - 1}`,
	} as unknown as ExcelJS.CellFormulaValue;
	for (let rowIndex = 3; rowIndex < nRows; rowIndex += 1) {
		sheet.getCell(rowIndex, statusIndex + 1).value = {
			sharedFormula: `${statusCol}2`,
			result: "",
		} as ExcelJS.CellSharedFormulaValue;
	}
}
*/

function genWorksheet(
	sheet: ExcelJS.Worksheet,
	columns: Record<string, Col>,
	ballot: Ballot,
	comments: CommentResolution[]
) {
	// Adjust column width, outlineLevel and style
	const borderStyle: ExcelJS.Border = {
		style: "thin",
		color: { argb: "33333300" },
	};
	const fontStyle = { name: "Arial", size: 10, family: 2 };

	Object.entries(columns).forEach(([key, entry], i) => {
		const column = sheet.getColumn(i + 1);
		column.header = key;
		if (entry.width) column.width = entry.width;
		if (entry.outlineLevel) column.outlineLevel = entry.outlineLevel;
		if (entry.numFmt) column.numFmt = entry.numFmt;
		column.font = fontStyle;
		column.alignment = { wrapText: true, vertical: "top" };
		column.border = {
			top: borderStyle,
			left: borderStyle,
			bottom: borderStyle,
			right: borderStyle,
		};
	});

	// Override the font style for the table header row
	sheet.getRow(1).font = { ...fontStyle, bold: true };

	// Table header is frozen
	sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];

	// Normalize by comment_id
	const entities: Record<string, CommentResolution[]> = {};
	const ids: string[] = [];
	for (const c of comments) {
		const id = "" + c.comment_id;
		if (entities[id]) entities[id].push(c);
		else {
			entities[id] = [c];
			ids.push(id);
		}
	}

	let n = 2;
	for (const id of ids) {
		const cmts = entities[id];
		cmts.forEach((c) => {
			Object.keys(columns).forEach((key, i) => {
				const cell = sheet.getCell(n, i + 1);
				const column = columns[key];
				if (column.set) column.set(ballot, c, cell);
				else cell.value = "";
			});
			n++;
		});
		if (cmts.length > 1) {
			// Merge comment cells
			Object.keys(columns).forEach((heading, i) => {
				if (commentColumns.includes(heading)) {
					sheet.mergeCells(n - cmts.length, i + 1, n - 1, i + 1);
				}
			});
		}
	}

	addResolutionFormatting(sheet, columns, n);

	/* This replaces the text version of the Status column with a formula. However, some people prefer the text version. */
	//addStatus(sheet, columns, n);

	// Enable auto filter on heading row
	sheet.autoFilter = {
		from: { row: 1, column: 1 },
		to: { row: 1, column: Object.keys(columns).length },
	};
}

export const commentSpreadsheetStyles = [
	"AllComments",
	"TabPerAdHoc",
	"TabPerCommentGroup",
] as const;
export type CommentSpreadsheetStyle = (typeof commentSpreadsheetStyles)[number];
export function validCommentSpreadsheetStyle(
	style: any
): style is CommentSpreadsheetStyle {
	return commentSpreadsheetStyles.includes(style);
}

// Sheet name cannot be longer than 31 characters and cannot include: * ? : \ / [ ]
export const getSheetName = (name: string) =>
	name.slice(0, 30).replace(/[*.\?:\\\/\[\]]/g, "_");

async function genCommentsSpreadsheet(
	user: User,
	isLegacy: boolean,
	style: CommentSpreadsheetStyle,
	ballot: Ballot,
	comments: CommentResolution[],
	file: { buffer: Buffer } | undefined,
	res: Response
) {
	let workbook = new ExcelJS.Workbook();
	if (file) {
		await workbook.xlsx.load(file.buffer).catch((error) => {
			throw new TypeError("Invalid workbook: " + error);
		});

		let sheetIds: number[] = [];
		workbook.eachSheet((sheet) => {
			if (sheet.name !== "Title" && sheet.name !== "Revision History")
				sheetIds.push(sheet.id);
		});
		sheetIds.forEach((id) => workbook.removeWorksheet(id));
	} else {
		workbook.creator = user.Name;
		workbook.created = new Date();
	}
	workbook.lastModifiedBy = user.Name;
	workbook.modified = new Date();

	const columns = isLegacy ? legacyColumns : modernColumns;

	let sheet = workbook.addWorksheet("All Comments");
	genWorksheet(sheet, columns, ballot, comments);
	if (style === "TabPerAdHoc") {
		// List of unique AdHoc values
		const adhocs = [
			...new Set(comments.map((c) => c.AdHoc || "(Blank)")),
		].sort();
		adhocs.forEach((adhoc) => {
			sheet = workbook.addWorksheet(getSheetName(adhoc));
			const selectComments = comments.filter((c) =>
				adhoc === "(Blank)" ? !c.AdHoc : c.AdHoc === adhoc
			);
			genWorksheet(sheet, columns, ballot, selectComments);
		});
	} else if (style === "TabPerCommentGroup") {
		// List of unique CommentGroup values
		const groups = [
			...new Set(comments.map((c) => c.CommentGroup || "(Blank)")),
		].sort();
		groups.forEach((group) => {
			sheet = workbook.addWorksheet(getSheetName(group));
			const selectComments = comments.filter((c) =>
				group === "(Blank)" ? !c.CommentGroup : c.CommentGroup === group
			);
			genWorksheet(sheet, columns, ballot, selectComments);
		});
	}

	return workbook.xlsx.write(res);
}

export async function exportCommentsSpreadsheet(
	user: User,
	ballot: Ballot,
	isLegacy: boolean,
	style: CommentSpreadsheetStyle,
	file: { buffer: Buffer } | undefined,
	res: Response
) {
	const comments = await getComments(ballot.id);

	res.attachment("comments.xlsx");
	return genCommentsSpreadsheet(
		user,
		isLegacy,
		style,
		ballot,
		comments,
		file,
		res
	);
}
