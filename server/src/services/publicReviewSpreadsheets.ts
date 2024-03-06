/*
 * Handle public review comment spreadsheet
 */
import ExcelJS from "exceljs";
import { csvParse, validateSpreadsheetHeader } from "../utils";
import { Comment } from "./comments";

const publicReviewCommentsHeader = [
	"Comment #",
	"Reviewer Name",
	"Review Email",
	"Reviewer Affiliations",
	"Category",
	"Page#",
	"Sub-clause",
	"Line #",
	"Comment",
	"Suggested Change",
	"Change Made?",
	"Response",
	"Show to Ballot Group?",
	"Update?",
] as const;

function parsePublicReviewComment(c: any[]) {
	let C_Page = c[5] || "";
	let C_Clause = c[6] || "";
	let C_Line = c[7] || "";
	let Page = Number(C_Page) + Number(C_Line) / 100;
	if (isNaN(Page)) Page = 0;

	const comment: Partial<Comment> = {
		C_Index: c[0], // Comment #
		CommenterSAPIN: null,
		CommenterName: c[1], // Name
		CommenterEmail: c[2], // Email
		Category: c[4] ? c[4].charAt(0) : "", // Category: first letter only (G, T or E)
		C_Page, // Page
		C_Clause, // Subclause
		C_Line, // Line
		Comment: c[8] || "", // Comment
		ProposedChange: c[9] || "", // Proposed Change
		MustSatisfy: false, // Must be Satisfied
		Clause: C_Clause,
		Page,
	};

	return comment;
}

export async function parsePublicReviewComments(
	startCommentId: number,
	buffer: Buffer,
	isExcel: boolean
) {
	let p: any[][] = []; // an array of arrays
	if (isExcel) {
		const workbook = new ExcelJS.Workbook();
		try {
			await workbook.xlsx.load(buffer);
		} catch (error) {
			throw new TypeError("Invalid workbook: " + error);
		}

		workbook.getWorksheet(1)?.eachRow((row) => {
			if (row.number > 3 && Array.isArray(row.values)) {
				p.push(row.values.slice(1, publicReviewCommentsHeader.length+1));
			}
		});
	} else {
		p = await csvParse(buffer, { columns: false });
	}
	//console.log(p)

	if (p.length === 0) throw new TypeError("Got an empty file");

	// Check the column names to make sure we have the right file
	validateSpreadsheetHeader(p.shift()!, publicReviewCommentsHeader);

	// Parse each row and assign CommentID
	return p.map((c, i) => {
		const comment: Partial<Comment> = {
			CommentID: startCommentId + i,
			...parsePublicReviewComment(c),
		};
		return comment;
	});
}
