import { v4 as uuid } from "uuid";

import db from "../utils/database";
import type { User } from "./users";
import { parseCommentsSpreadsheet } from "./commentsSpreadsheet";
import { getComments, getCommentsSummary, CommentResolution } from "./comments";
import type { Comment } from "../schemas/comments";
import type { Resolution } from "../schemas/resolutions";

const matchClause = (dbValue: string, sValue: string) => {
	if (dbValue === sValue) return true;
	if (dbValue.replace(/[0]+$/g, "") === sValue)
		// Legacy strips trailing 0
		return true;
	if (sValue.length >= 50 && dbValue.substring(0, sValue.length) === sValue)
		// Legacy has 50 character limit for this field
		return true;
	return false;
};

const matchPageLine = (dbValue: string, sValue: string) => {
	if (dbValue === sValue) return true;
	if (Math.round(parseFloat(dbValue)) === parseInt(sValue))
		// Legacy converts page to int
		return true;
	if (isNaN(Number(dbValue)))
		// Legacy ignores things that aren't numbers
		return true;
	return false;
};

//const pattern = /[^\x20-\x7f]/gm;
//const matchText = (dbValue, sValue) => dbValue === sValue || dbValue.replace(pattern, '') === sValue.replace(pattern, '');

/* For the Comment and Proposed Change columns, compare only basic text.
 *   Line endings might differ: database has \n line endings while spreadsheet has \r\n line endings.
 *   Only compare ASCII characters that are not control characters.
 *   A ' at the begining of the comment is interpreted as a text identified in Excel
 *
 * The Access database mangles the comment text when it has unicode characters:
 *   μ becomes ++ or Î¼
 *   § becomes -║
 *   × becomes +∙
 *   Φ becomes +¬
 *   α becomes ªª
 *   。 becomes ╥╟Θ
 */
const matchText = (dbValue: string, sValue: string) => {
	if (dbValue === sValue) return true;
	const garbledDbValue = Buffer.from(dbValue, "utf8").toString("latin1");
	//const pattern = /^'|[^(\x20-\x7f)]|\+|-/gm;	// ASCII, no control characters
	const pattern = /^'|[^(\x20-\x7f)]|\+|-| /gm; // ASCII, no control characters, no space (myProject converts newline to space)
	if (garbledDbValue.replace(pattern, "") === sValue.replace(pattern, ""))
		return true;
	return false;
};

type CommentComp = Pick<
	Comment,
	"Category" | "C_Clause" | "C_Page" | "C_Line" | "Comment" | "ProposedChange"
>;
type CompFunc = (dbC: CommentComp, sC: CommentComp) => boolean;

const comparisons: CompFunc[] = [
	(dbC, sC) => dbC.Category === sC.Category,
	(dbC, sC) => matchClause(dbC.C_Clause, sC.C_Clause),
	(dbC, sC) => matchPageLine(dbC.C_Page, sC.C_Page),
	(dbC, sC) => matchPageLine(dbC.C_Line, sC.C_Line),
	(dbC, sC) => matchText(dbC.Comment, sC.Comment),
	(dbC, sC) => matchText(dbC.ProposedChange, sC.ProposedChange),
	//(dbC, sC) => dbC.CommenterName === sC.CommenterName,
];

function findMatchByEliminationUsingTheseComparisons(
	dbC: CommentComp,
	sheetComments: CommentResolution[],
	comparisons: CompFunc[]
) {
	let scr = sheetComments;
	for (let comp of comparisons) {
		scr = scr.filter((sC) => comp(dbC, sC));
		if (scr.length === 0) return null;
		if (scr.length === 1) return scr[0];
	}
	return scr[0]; // duplicate comments, choose one
}

/*
 * Find match by elimination, running through a set of comparisons. If a match is not found the
 * order of the comparisons is changed. We change the order because sometimes entries in the
 * spreadsheet have been changed and differ from the orginal comment.
 */
function findMatchByElimination(
	dbC: Comment,
	sheetComments: CommentResolution[]
) {
	const comps = comparisons.slice();
	for (let i = 0; i < comparisons.length; i++) {
		let sC = findMatchByEliminationUsingTheseComparisons(
			dbC,
			sheetComments,
			comps
		);
		if (sC) return sC;
		comps.push(comps.shift()!);
	}
	return null;
}

/*
 * Successivly match columns, elimating rows that don't match as we go
 * Once we are down to one row, that is the match.
 * The idea is to first match columns that aren't likely to have issues and then use additional columns as needed.
 */
const matchByElimination: MatchFunc = function (
	sheetComments: CommentResolution[],
	dbComments: CommentResolution[]
) {
	if (sheetComments.length < dbComments.length) {
		throw `Spreadsheet has ${sheetComments.length} comments; less than number comments, ${dbComments.length}, in the database.`;
	}

	const comps = comparisons.slice();
	for (let i = 0; i < comparisons.length; i++) {
		console.log("trial", i);
		let matched: CommentMatch[] = []; // paired dbComments and sheetComments
		let dbCommentsRemaining: CommentResolution[] = []; // dbComments with no match
		let sheetCommentsRemaining = sheetComments.slice();
		dbComments.sort((a, b) => a.C_Index - b.C_Index);
		dbComments.forEach((dbC) => {
			let sC = findMatchByEliminationUsingTheseComparisons(
				dbC,
				sheetCommentsRemaining,
				comps
			);
			if (sC) {
				matched.push({ dbComment: dbC, sheetComment: sC });
				const i = sheetCommentsRemaining.findIndex((c) => c === sC);
				sheetCommentsRemaining.splice(i, 1);
			} else {
				dbCommentsRemaining.push(dbC);
			}
		});
		if (dbCommentsRemaining.length === 0)
			return [matched, dbCommentsRemaining, sheetCommentsRemaining];
		comps.push(comps.shift()!);
	}

	return [[] as CommentMatch[], dbComments, sheetComments] as const;
};

/*
 * Try to find a match for each comment in turn
 */
const matchComment: MatchFunc = function (
	sheetComments: CommentResolution[],
	dbComments: CommentResolution[]
) {
	let matched: CommentMatch[] = []; // paired dbComments and sheetComments
	let dbCommentsRemaining: CommentResolution[] = []; // dbComments with no match
	let sheetCommentsRemaining = sheetComments.slice();
	dbComments.forEach((dbC) => {
		// The reducer function runs through each of the comparisons and as long as it passes (returns true)
		// it continues. If a comparisong fails the result fails.
		const i = sheetCommentsRemaining.findIndex((sC) =>
			comparisons.reduce((acc, comp) => acc && comp(dbC, sC), true)
		);
		if (i >= 0) {
			matched.push({
				dbComment: dbC,
				sheetComment: sheetCommentsRemaining[i],
			});
			sheetCommentsRemaining.splice(i, 1);
		} else {
			dbCommentsRemaining.push(dbC);
		}
	});

	return [matched, dbCommentsRemaining, sheetCommentsRemaining] as const;
};

type CommentMatch = {
	dbComment: CommentResolution;
	sheetComment: CommentResolution;
};

/*
 * Match by comment ID
 */
const matchCID: MatchFunc = function (sheetComments, dbComments) {
	let matched: CommentMatch[] = []; // paired dbComments and sheetComments
	let dbCommentsRemaining: CommentResolution[] = []; // dbComments with no match
	let sheetCommentsRemaining = sheetComments.slice();
	dbComments.forEach((dbC) => {
		const i = sheetCommentsRemaining.findIndex(
			(sC) => parseInt(sC.CID) === dbC.CommentID
		);
		if (i >= 0) {
			matched.push({
				dbComment: dbC,
				sheetComment: sheetCommentsRemaining[i],
			});
			sheetCommentsRemaining.splice(i, 1);
		} else {
			dbCommentsRemaining.push(dbC);
		}
	});

	return [matched, dbCommentsRemaining, sheetCommentsRemaining];
};

export const toUpdateOptions = [
	"cid",
	"clausepage",
	"adhoc",
	"assignee",
	"resolution",
	"editing",
] as const;
export type FieldToUpdate = (typeof toUpdateOptions)[number];

export const matchAlgoOptions = ["cid", "comment", "elimination"] as const;
export type MatchAlgo = (typeof matchAlgoOptions)[number];

export const matchUpdateOptions = ["all", "any", "add"] as const;
export type MatchUpdate = (typeof matchUpdateOptions)[number];

type MatchFunc = (
	sheetComments: CommentResolution[],
	dbComments: CommentResolution[]
) => readonly [CommentMatch[], CommentResolution[], CommentResolution[]];
const MatchAlgoFunctions: Record<MatchAlgo, MatchFunc> = {
	cid: matchCID,
	comment: matchComment,
	elimination: matchByElimination,
} as const;

type CommentUpdate = {
	CommentID: Comment["CommentID"];

	Clause: Comment["Clause"];
	Page: Comment["Page"];

	AdHoc: Comment["AdHoc"];
	CommentGroup: Comment["CommentGroup"];
	Notes: Comment["Notes"];
};

function commentUpdate(
	toUpdate: FieldToUpdate[],
	c: Partial<CommentUpdate>,
	cs: CommentUpdate & { CID: CommentResolution["CID"] }
) {
	const u: Partial<CommentUpdate> = {};

	if (toUpdate.includes("cid")) {
		u.CommentID = Number(cs.CID);
	}

	if (toUpdate.includes("clausepage")) {
		if ((c.Clause || cs.Clause) && c.Clause !== cs.Clause)
			u.Clause = cs.Clause;
		if ((c.Clause || cs.Clause) && c.Page !== cs.Page) u.Page = c.Page;
	}

	if (toUpdate.includes("adhoc")) {
		if ((c.AdHoc || cs.AdHoc) && c.AdHoc !== cs.AdHoc)
			u.AdHoc = cs.AdHoc || "";
		if (
			(c.CommentGroup || cs.CommentGroup) &&
			c.CommentGroup !== cs.CommentGroup
		)
			u.CommentGroup = cs.CommentGroup || "";
		if ((c.Notes || cs.Notes) && c.Notes !== cs.Notes)
			u.Notes = cs.Notes || "";
	}

	return Object.keys(u).length ? u : null;
}

type ResolutionUpdate = {
	AssigneeName: Resolution["AssigneeName"];
	AssigneeSAPIN: Resolution["AssigneeSAPIN"];

	Submission: Resolution["Submission"];
	ResnStatus: Resolution["ResnStatus"];
	Resolution: Resolution["Resolution"];
	ReadyForMotion: Resolution["ReadyForMotion"];
	ApprovedByMotion: Resolution["ApprovedByMotion"];

	EditStatus: Resolution["EditStatus"];
	EditNotes: Resolution["EditNotes"];
	EditInDraft: Resolution["EditInDraft"];
};

function resolutionUpdate(
	toUpdate: FieldToUpdate[],
	c: Partial<ResolutionUpdate>,
	cs: ResolutionUpdate
) {
	const n: Partial<ResolutionUpdate> = {};

	if (toUpdate.includes("assignee")) {
		if (
			(c.AssigneeName || cs.AssigneeName) &&
			c.AssigneeName !== cs.AssigneeName
		) {
			n.AssigneeName = cs.AssigneeName || "";
			n.AssigneeSAPIN = 0;
		}
	}

	if (toUpdate.includes("resolution")) {
		if ((c.Submission || cs.Submission) && c.Submission !== cs.Submission)
			n.Submission = cs.Submission;
		if ((c.Resolution || cs.Resolution) && c.Resolution !== cs.Resolution)
			n.Resolution = cs.Resolution;
		if ((c.ResnStatus || cs.ResnStatus) && c.ResnStatus !== cs.ResnStatus)
			n.ResnStatus = cs.ResnStatus;
		// In the legacy spreadsheet there is no "Ready For Motion" column (value is undefiend)
		// For the legacy spreadsheet we leave this unchanged
		if (
			cs.ReadyForMotion !== undefined &&
			(c.ReadyForMotion || cs.ReadyForMotion) &&
			c.ReadyForMotion !== cs.ReadyForMotion
		)
			n.ReadyForMotion = cs.ReadyForMotion || false;
		if (
			(c.ApprovedByMotion || cs.ApprovedByMotion) &&
			c.ApprovedByMotion !== cs.ApprovedByMotion
		)
			n.ApprovedByMotion = cs.ApprovedByMotion || "";
	}

	if (toUpdate.includes("editing")) {
		if ((c.EditStatus || cs.EditStatus) && c.EditStatus !== cs.EditStatus)
			n.EditStatus = cs.EditStatus;
		if ((c.EditNotes || cs.EditNotes) && c.EditNotes !== cs.EditNotes)
			n.EditNotes = cs.EditNotes;
		if (
			(c.EditInDraft || cs.EditInDraft) &&
			c.EditInDraft !== cs.EditInDraft
		)
			n.EditInDraft = cs.EditInDraft;
	}

	return Object.keys(n).length ? n : null;
}

async function updateComments(
	userId: number,
	ballot_id: number,
	matched: CommentMatch[],
	toUpdate: FieldToUpdate[]
) {
	// See if any of the comment fields need updating
	let updateComments: Partial<Comment>[] = [],
		updateResolutions: Partial<Resolution>[] = [],
		newResolutions: Partial<Resolution>[] = [];

	let count = 0;
	matched.forEach((m) => {
		const c = m.dbComment;
		const cs = m.sheetComment;
		const u = commentUpdate(toUpdate, c, cs);
		if (u) {
			updateComments.push({ ...u, id: c.comment_id });
		}
		const r = resolutionUpdate(toUpdate, c, cs);
		if (r) {
			if (c.resolution_id) {
				updateResolutions.push({ ...r, id: c.resolution_id });
			} else {
				newResolutions.push({ ...r, comment_id: c.comment_id });
			}
		}
		if (u || r) count++;
	});

	//console.log('comments updated: ', updateComments.length, 'resolutions updated: ', updateResolutions.length, 'new resolutions: ', newResolutions.length);

	let sql = "";
	sql += updateComments
		.map((c) => {
			const id = c.id;
			delete c.id;
			c.LastModifiedBy = userId;
			return db.format(
				"UPDATE comments SET ?, LastModifiedTime=UTC_TIMESTAMP() WHERE id=?",
				[c, id]
			);
		})
		.concat(
			updateResolutions.map((r) => {
				const id = r.id;
				delete r.id;
				r.LastModifiedBy = userId;
				return db.format(
					"UPDATE resolutions SET ?, LastModifiedTime=UTC_TIMESTAMP() WHERE id=UUID_TO_BIN(?)",
					[r, id]
				);
			})
		)
		.join(";");

	if (sql) sql += ";";

	/* A single insert statement is much faster than individual insert statements. */
	let kvPairs: Record<string, any[]> = {};
	newResolutions.forEach((r) => {
		r.LastModifiedBy = userId;
		const keys = Object.keys(r).join(",");
		if (!kvPairs[keys]) kvPairs[keys] = [];
		kvPairs[keys].push(db.escape(Object.values(r)));
	});
	for (const [keys, values] of Object.entries(kvPairs)) {
		sql +=
			`INSERT INTO resolutions (id,${keys},LastModifiedTime) VALUES ` +
			values
				.map((v) => `(UUID_TO_BIN(${uuid()}), ${v}, UTC_TIMESTAMP())`)
				.join(",") +
			";";
	}

	if (sql) await db.query(sql);

	return count;
}

type NewComment = Partial<
	Omit<Comment, "id" | "ballot_id" | "LastModifiedBy" | "LastModifiedTime">
>;

async function addComments(
	userId: number,
	ballot_id: number,
	sheetComments: CommentResolution[],
	toUpdate: FieldToUpdate[]
) {
	const update = toUpdate.filter((f) => f !== "cid").concat("clausepage");
	const newComments: NewComment[] = [];
	const newResolutions: Partial<Resolution & { CommentID?: number }>[] = [];

	sheetComments.forEach((cs) => {
		let c: NewComment = {
			CommentID: Number(cs.CID),
			CommenterName: cs.CommenterName,
			Category: cs.Category,
			C_Clause: cs.C_Clause,
			C_Page: cs.C_Page,
			C_Line: cs.C_Line,
			Comment: cs.Comment,
			ProposedChange: cs.ProposedChange,
			...commentUpdate(update, {}, cs),
		};
		newComments.push(c);

		const r = resolutionUpdate(update, {}, cs);
		if (r) {
			newResolutions.push({ ...r, CommentID: c.CommentID });
		}
	});

	const SQL = newComments
		.map((c) => {
			return db.format(
				"INSERT INTO comments (ballot_id, ??, LastModifiedBy, LastModifiedTime) VALUE (?, ?, ?, UTC_TIMESTAMP())",
				[Object.keys(c), ballot_id, Object.values(c), userId]
			);
		})
		.concat(
			newResolutions.map((r) => {
				const commentId = r.CommentID;
				delete r.CommentID;
				r.LastModifiedBy = userId;
				return db.format(
					"INSERT INTO resolutions " +
						"(comment_id, ??, LastModifiedTime) " +
						"VALUE ((SELECT id FROM comments WHERE ballot_id=? AND CommentID=?), ?, UTC_TIMESTAMP())",
					[Object.keys(r), ballot_id, commentId, Object.values(r)]
				);
			})
		)
		.join(";");

	await db.query(SQL);
}

/**
 * Upload resolutions
 * @param user The user executing the upload
 * @param ballot_id The ballot identifier associated with the resolutions
 * @param toUpdate The fields to be updated
 * @param matchAlgo The match algorithm used to match againts the comments
 * @param matchUpdate Method for handeling unmatch comments
 * @param sheetName The worksheet name to use
 * @param file The spreadsheet file
 */
export async function uploadResolutions(
	user: User,
	ballot_id: number,
	toUpdate: FieldToUpdate[],
	matchAlgo: MatchAlgo,
	matchUpdate: MatchUpdate,
	sheetName: string,
	file: Express.Multer.File
) {
	if (file.originalname.search(/\.xlsx$/i) === -1) {
		throw TypeError(
			"Must be an Excel Workbook (*.xlsx). Older formats are not supported."
		);
	}

	if (matchAlgo === "elimination" && matchUpdate === "any") {
		throw new TypeError(
			`For successive elimination, matchUpdate cannot be 'any'.`
		);
	}

	const t1 = Date.now();
	const sheetComments = await parseCommentsSpreadsheet(
		file.buffer,
		sheetName
	);
	const t2 = Date.now();
	const dbComments = await getComments(ballot_id);
	const t3 = Date.now();

	let [matchedComments, dbCommentsRemaining, sheetCommentsRemaining] =
		MatchAlgoFunctions[matchAlgo](sheetComments, dbComments);
	console.log(
		matchedComments.length,
		dbCommentsRemaining.length,
		sheetCommentsRemaining.length
	);

	const t4 = Date.now();
	let updated = 0;
	let matched: number[] = [],
		unmatched: number[] = [],
		added: string[] = [],
		remaining: string[] = [];
	if (matchUpdate === "all") {
		if (dbCommentsRemaining.length > 0) {
			throw new TypeError(
				`No update\n` +
					`${matched.length} entries match\n` +
					`${dbCommentsRemaining.length} unmatched database entries:\n` +
					dbCommentsRemaining.map((c) => c.CommentID).join(", ") +
					"\n" +
					`${sheetCommentsRemaining.length} unmatched spreadsheet entries:\n` +
					sheetCommentsRemaining.map((c) => c.CID).join(", ")
			);
		}

		updated = await updateComments(
			user.SAPIN,
			ballot_id,
			matchedComments,
			toUpdate
		);
		matched = matchedComments.map((m) => m.dbComment.CommentID);
		remaining = sheetCommentsRemaining.map((c) => c.CID);
	} else if (matchUpdate === "any") {
		updated = await updateComments(
			user.SAPIN,
			ballot_id,
			matchedComments,
			toUpdate
		);
		matched = matchedComments.map((m) => m.dbComment.CommentID);
		unmatched = dbCommentsRemaining.map((c) => c.CommentID);
		remaining = sheetCommentsRemaining.map((c) => c.CID);
	} else if (matchUpdate === "add") {
		await addComments(
			user.SAPIN,
			ballot_id,
			sheetCommentsRemaining,
			toUpdate
		);
		matched = [];
		added = sheetCommentsRemaining.map((c) => c.CID);
	}

	const t5 = Date.now();

	const comments = await getComments(ballot_id);
	const summary = await getCommentsSummary(ballot_id);
	//delete summary.id;

	const t6 = Date.now();

	const stats = {
		"parse spreadsheet": t2 - t1,
		"get comments": t3 - t2,
		"match algo": t4 - t3,
		"update database": t5 - t4,
		"get updated comments": t6 - t5,
		total: t6 - t1,
	};
	//console.log(stats);

	const ballot = {
		id: ballot_id,
		Comments: summary,
	};

	return {
		comments,
		ballot,
		matched,
		unmatched,
		remaining,
		added,
		updated,
		stats,
	};
}
