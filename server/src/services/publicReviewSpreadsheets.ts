/*
 * Handle public review comment spreadsheet
 */
import { parseSpreadsheet } from "../utils";
import type { Comment } from "@schemas/comments";

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

function parsePublicReviewComment(c: string[]) {
	let C_Page = c[5] || "";
	let C_Clause = c[6] || "";
	let C_Line = c[7] || "";
	let Page = Number(C_Page) + Number(C_Line) / 100;
	if (isNaN(Page)) Page = 0;

	const cat = c[4] ? c[4].charAt(0) : ""; // Category: first letter only (G, T or E)
	let Category: Comment["Category"];
	if (cat === "T" || cat == "E" || cat === "G") Category = cat;
	else Category = "T";

	const comment: Partial<Comment> = {
		C_Index: Number(c[0]), // Comment #
		CommenterSAPIN: null,
		CommenterName: c[1], // Name
		CommenterEmail: c[2], // Email
		Category,
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
	file: Express.Multer.File
) {
	const rows = await parseSpreadsheet(file, publicReviewCommentsHeader, 3);

	// Parse each row and assign CommentID
	return rows.map((c, i) => {
		const comment: Partial<Comment> = {
			CommentID: startCommentId + i,
			...parsePublicReviewComment(c),
		};
		return comment;
	});
}
