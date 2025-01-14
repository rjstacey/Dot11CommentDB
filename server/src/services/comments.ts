import { DateTime } from "luxon";

import db from "../utils/database.js";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { AuthError, ForbiddenError, NotFoundError } from "../utils/index.js";
import { parseEpollComments, parseEpollUserComments } from "./epoll.js";
import { parseMyProjectComments } from "./myProjectSpreadsheets.js";
import { parsePublicReviewComments } from "./publicReviewSpreadsheets.js";
import { BallotType, getBallotWithNewResultsSummary } from "./ballots.js";
import { selectUser, type User } from "./users.js";
import { AccessLevel } from "../auth/access.js";
import { getGroups } from "./groups.js";
import type {
	Comment,
	CommentResolution,
	CommentChange,
	CommentUpdate,
	CommentCreate,
	UploadCommentsResponse,
} from "@schemas/comments.js";
import { Ballot, CommentsSummary } from "@schemas/ballots.js";

// prettier-ignore
const createViewCommentResolutionsSQL =
	"DROP VIEW IF EXISTS commentResolutions; " +
	"CREATE VIEW commentResolutions AS SELECT " +
		"b.id AS ballot_id, " +
		"c.id AS comment_id, " +
		"BIN_TO_UUID(r.id) AS resolution_id, " +
		"IF(r.id IS NOT NULL, BIN_TO_UUID(r.id), cast(c.id as CHAR)) AS id, " +
		'CONCAT(' +
			'IF(b.Type=2, IF(b.stage=0, "I-", CONCAT("R", b.stage, "-")), ""), ' +
			'IF((SELECT count(*) from resolutions r WHERE (c.id = r.comment_id)) > 1, concat(c.CommentID, ".", r.ResolutionID), c.CommentID)' +
		') AS CID, ' +
		"b.BallotID AS BallotID, " +
		"c.CommentID AS CommentID, " +
		"r.ResolutionID AS ResolutionID, " +
		"(SELECT count(0) from resolutions r WHERE (c.id = r.comment_id)) AS ResolutionCount, " +
		"c.CommenterSAPIN AS CommenterSAPIN, " +
		"c.CommenterEmail AS CommenterEmail, " +
		"c.CommenterName AS CommenterName, " +
		"results.Vote AS Vote, " +
		"c.MustSatisfy AS MustSatisfy, " +
		"c.Category AS Category, " +
		"c.Clause AS Clause, " +
		"c.Page AS Page, " +
		"c.Comment AS Comment, " +
		"c.ProposedChange AS ProposedChange, " +
		"c.C_Page AS C_Page, " +
		"c.C_Line AS C_Line, " +
		"c.C_Clause AS C_Clause, " +
		"c.C_Index AS C_Index, " +
		"BIN_TO_UUID(c.AdHocGroupId) AS AdHocGroupId, " +
		'COALESCE(c.AdHoc, "") AS AdHoc, ' +
		'COALESCE(c.CommentGroup, "") AS CommentGroup, ' +
		"c.Notes AS Notes, " +
		"r.AssigneeSAPIN AS AssigneeSAPIN, " +
		'COALESCE(m.Name, r.AssigneeName, "") AS AssigneeName, ' +
		"r.ResnStatus AS ResnStatus, " +
		"r.Resolution AS Resolution, " +
		'COALESCE(r.Submission, "") AS Submission, ' +
		"IF(COALESCE(r.ReadyForMotion, 0) = 1, CAST(TRUE as json), CAST(FALSE as json)) AS ReadyForMotion, " +
		"r.ApprovedByMotion AS ApprovedByMotion, " +
		"r.EditStatus AS EditStatus, " +
		"r.EditInDraft AS EditInDraft, " +
		"r.EditNotes AS EditNotes, " +
		'DATE_FORMAT(IF(c.LastModifiedTime > r.LastModifiedTime, c.LastModifiedTime, r.LastModifiedTime), "%Y-%m-%dT%TZ") AS LastModifiedTime, ' +
		"IF(c.LastModifiedTime > r.LastModifiedTime, c.LastModifiedBy, r.LastModifiedBy) AS LastModifiedBy, " +
		"IF(c.LastModifiedTime > r.LastModifiedTime, mc.Name, mr.Name) AS LastModifiedName " +
	"FROM ballotsStage b JOIN comments c ON (b.id = c.ballot_id) " +
		"LEFT JOIN resolutions r ON (c.id = r.comment_id) " +
		"LEFT JOIN members m ON (r.AssigneeSAPIN = m.SAPIN) " +
		"LEFT JOIN members mc ON (c.LastModifiedBy = mc.SAPIN) " +
		"LEFT JOIN members mr ON (r.LastModifiedBy = mr.SAPIN) " +
		"LEFT JOIN results ON (b.id = results.ballot_id AND ((c.CommenterSAPIN <> NULL AND c.CommenterSAPIN = results.SAPIN) OR (c.CommenterSAPIN = NULL AND c.CommenterEmail = results.Email)));";

export function init() {
	return db.query(createViewCommentResolutionsSQL);
}

type Arrayed<T> = { [K in keyof T]: T[K] | Array<T[K]> };

type QueryConstraints = {
	modifiedSince?: string;
} & Partial<Arrayed<CommentResolution>>;

function getConditions(constraints: QueryConstraints) {
	const conditions: string[] = [];
	Object.entries(constraints).forEach(([key, value]) => {
		if (key === "modifiedSince") {
			const dateTime = DateTime.fromISO(value as string);
			if (dateTime.isValid)
				conditions.push(
					db.format("LastModifiedTime > CAST(? as DATETIME)", [
						dateTime.toUTC().toFormat("yyyy-MM-dd HH:mm:ss"),
					])
				);
		} else {
			conditions.push(
				db.format(Array.isArray(value) ? "?? IN (?)" : "??=?", [
					key,
					value,
				])
			);
		}
	});
	return conditions;
}

/**
 * Select comments that meet one of two conditions
 * @param constraints1 - An optional first set of contraints
 * @param constraints2 - An optional second set of constraints
 * @return An array of comment resolutions that meet the first OR second set of constraints
 */
export function selectComments(
	constraints1?: QueryConstraints,
	constraints2?: QueryConstraints
): Promise<CommentResolution[]> {
	const conditions1 = constraints1 ? getConditions(constraints1) : [];
	const conditions2 = constraints2 ? getConditions(constraints2) : [];

	let sql = "SELECT * FROM commentResolutions";
	if (conditions1.length > 0 || conditions2.length > 0) {
		sql += " WHERE ";
		if (conditions1.length > 0 && conditions2.length > 0)
			sql +=
				"(" +
				conditions1.join(" AND ") +
				") OR (" +
				conditions2.join(" AND ") +
				")";
		else if (conditions1.length > 0) sql += conditions1.join(" AND ");
		else sql += conditions2.join(" AND ");
	}
	sql += " ORDER BY CommentID, ResolutionID";

	return db.query<(RowDataPacket & CommentResolution)[]>(sql);
}

/**
 * Get comment resolutions for the specified ballot
 *
 * @param ballot_id - The ballot identifier
 * @param modifedSince - Option ISO datetime string. Comment resolutions with changes since the specified date will be returned.
 * @returns An array of comment resolutions
 */
export function getComments(
	ballot_id: number,
	modifiedSince?: string
): Promise<CommentResolution[]> {
	const constraints: QueryConstraints = {};
	if (ballot_id) constraints.ballot_id = ballot_id;
	if (modifiedSince) constraints.modifiedSince = modifiedSince;
	return selectComments(constraints);
}

export async function getCommentsSummary(
	ballot_id: number
): Promise<CommentsSummary | undefined> {
	// prettier-ignore
	const sql =
		"SELECT " +
			"COUNT(*) AS Count, " +
			"MIN(CommentID) AS CommentIDMin, " +
			"MAX(CommentID) AS CommentIDMax " +
		"FROM comments c WHERE ballot_id=" +
		db.escape(ballot_id);
	const [summary] = await db.query<(RowDataPacket & CommentsSummary)[]>(sql);
	return summary;
}

function commentsSetSql(changes: CommentChange) {
	const sets: string[] = [];
	for (const [key, value] of Object.entries(changes)) {
		const sql = db.format(
			"??=" + (key === "AdHocGroupId" ? "UUID_TO_BIN(?)" : "?"),
			[key, value]
		);
		sets.push(sql);
	}
	return sets.join(", ");
}

/**
 * Update comment
 *
 * @param user The user executing the update
 * @param ballot_id The associated ballot identifier. Validated to ensure that the change is authorized.
 * @param id The comment identifier
 * @param changes An object with fields to be changed
 */
async function updateComment(
	user: User,
	ballot_id: number,
	id: number,
	changes: CommentChange
) {
	if (Object.keys(changes).length === 0) return;
	const sql =
		"UPDATE comments SET " +
		commentsSetSql(changes) +
		db.format(
			", LastModifiedBy=?, LastModifiedTime=UTC_TIMESTAMP() WHERE ballot_id=? AND id=?",
			[user.SAPIN, ballot_id, id]
		);
	return db.query<ResultSetHeader>(sql);
}

export async function updateComments(
	user: User,
	ballot_id: number,
	access: number,
	updates: CommentUpdate[],
	modifiedSince?: string
) {
	const ids = updates.map((u) => u.id);

	if (access <= AccessLevel.ro && updates.length > 0) {
		const comments = await selectComments({
			ballot_id,
			comment_id: ids,
		});
		if (!updates.every((u) => comments.find((c) => c.comment_id === u.id)))
			throw new NotFoundError(
				"At least one of the comment identifiers is invalid"
			);
		// To determine comment level access, all the comments must be assigned to an ad-hoc group
		if (comments.every((c) => c.AdHocGroupId)) {
			const groupIds = [...new Set(comments.map((c) => c.AdHocGroupId!))];
			const groups = await getGroups(user, { id: groupIds });
			// The user must have read-write privileges in all the groups
			if (
				groups.every(
					(group) =>
						(group.permissions.comments || AccessLevel.none) >=
						AccessLevel.rw
				)
			)
				access = AccessLevel.rw;
		}
		if (access < AccessLevel.rw)
			throw new ForbiddenError(
				"User does not have ballot level or comment level read-write prvileges"
			);
	}

	await Promise.all(
		updates.map((u) => updateComment(user, ballot_id, u.id, u.changes))
	);

	const comments = await selectComments(
		{ comment_id: ids },
		{ ballot_id, modifiedSince }
	);

	return { comments };
}

/**
 * Set the starting CID for a comment set
 *
 * @param user - The user executing the change
 * @param ballot_id - The ballot identifier for the comment set
 * @param startCommentId - The starting CID. The CID for each comment will be offset by the difference between the current min CID
 * and the startCommentID.
 * @returns Updated comments and changes to the ballot comments summary.
 */
export async function setStartCommentId(
	user: User,
	ballot_id: number,
	startCommentId: number
) {
	const sql =
		`SET @offset = ${db.escape(
			startCommentId
		)} - (SELECT MIN(CommentID) FROM comments WHERE ballot_id=${db.escape(
			ballot_id
		)}); ` +
		"UPDATE comments " +
		`SET LastModifiedBy=${db.escape(
			user.SAPIN
		)}, CommentID=CommentID+@offset ` +
		`WHERE ballot_id=${db.escape(ballot_id)};`;
	await db.query(sql);
	const comments = await getComments(ballot_id);
	const summary = await getCommentsSummary(ballot_id);
	return {
		comments,
		ballot: { id: ballot_id, Comments: summary },
	};
}

/**
 * Delete all comments for the specified ballot
 */
export async function deleteComments(user: User, ballot_id: number) {
	// The order of the deletes is import; from resolutions table first and then from comments table.
	// This is because a delete from resolutions tables adds a history log and a delete from comments then removes it.
	// prettier-ignore
	const sql = 
		"DELETE r, c " +
		"FROM comments c " + 
			"LEFT JOIN resolutions r ON r.comment_id=c.id " +
		`WHERE c.ballot_id=${db.escape(ballot_id)};`;
	const result = await db.query<ResultSetHeader>(sql);
	return result.affectedRows;
}

/**
 * Replace all comments for the specified ballot
 */
async function insertComments(
	user: User,
	ballot_id: number,
	commentsIn: CommentCreate[]
) {
	if (commentsIn.length) {
		// Insert the comments
		const sql1 =
			db.format(
				"INSERT INTO comments (ballot_id, LastModifiedBy, LastModifiedTime, ??) VALUES ",
				[Object.keys(commentsIn[0])]
			) +
			commentsIn
				.map((c) =>
					db.format("(?, ?, UTC_TIMESTAMP(), ?)", [
						ballot_id,
						user.SAPIN,
						Object.values(c),
					])
				)
				.join(", ");
		await db.query(sql1);

		// Insert a null resolution for each comment (only if one does not exist)
		const sql2 = db.format(
			"INSERT INTO resolutions (comment_id, ResolutionID, LastModifiedBy, LastModifiedTime) " +
				"SELECT id, 0, ?, UTC_TIMESTAMP() " +
				"FROM comments " +
				"WHERE ballot_id=? AND id NOT IN (SELECT comment_id FROM resolutions);",
			[user.SAPIN, ballot_id]
		);
		await db.query(sql2);
	}

	const comments = await getComments(ballot_id);

	const ballot = await getBallotWithNewResultsSummary(user, null, ballot_id);

	return {
		comments,
		ballot,
	} satisfies UploadCommentsResponse;
}

/**
 * Replace all comments for the specified ballot
 */
async function replaceComments(
	user: User,
	ballot_id: number,
	comments: CommentCreate[]
) {
	// Delete existing comments (and resolutions) for this ballot
	await deleteComments(user, ballot_id);

	return insertComments(user, ballot_id, comments);
}

/**
 * Import comments directly from ePoll
 */
export async function importEpollComments(
	user: User,
	ballot: Ballot,
	startCommentId: number
) {
	if (!ballot.EpollNum)
		throw new TypeError("Ballot does not have an ePoll number");

	if (!user.ieeeClient) throw new AuthError("Not logged in");

	const response = await user.ieeeClient.get(
		`https://mentor.ieee.org/802.11/poll-comments.csv?p=${ballot.EpollNum}`,
		{ responseType: "arraybuffer" }
	);

	if (response.headers["content-type"] !== "text/csv")
		throw new AuthError("Not logged in");

	const file = { originalname: "poll-comments.csv", buffer: response.data };
	const comments = await parseEpollComments(startCommentId, file);
	//console.log(comments[0])

	return replaceComments(user, ballot.id, comments);
}

/**
 * Upload comments from spreadsheet.
 * The expected spreadsheet format depends on the ballot type.
 * For SA ballot, the MyProject spreadsheet format is expected.
 * For WG ballot, the ePoll .csv format is expected.
 */
export async function uploadComments(
	user: User,
	ballot: Ballot,
	startCommentId: number,
	file: Express.Multer.File
) {
	let comments: Partial<Comment>[];
	if (ballot.Type === BallotType.SA) {
		comments = await parseMyProjectComments(startCommentId, file);
	} else {
		comments = await parseEpollComments(startCommentId, file);
	}
	return replaceComments(user, ballot.id, comments);
}

type MaxIndexes = {
	MaxCommentId: number;
	MaxIndex: number;
};

async function getHighestIndexes(ballot_id: number): Promise<MaxIndexes> {
	const sql =
		"SELECT MAX(CommentID) as MaxCommentId, MAX(C_Index) as MaxIndex from comments WHERE ballot_id=" +
		db.escape(ballot_id);
	const rows = await db.query<(RowDataPacket & MaxIndexes)[]>(sql);
	if (rows.length !== 1)
		throw new TypeError(`Ballot id=${ballot_id} does not exist`);
	return rows[0];
}

/**
 * Upload comments from spreadsheet.
 * The expected spreadsheet format depends on the ballot type.
 * For SA ballot, the MyProject spreadsheet format is expected.
 * For WG ballot, the ePoll .csv format is expected.
 */
export async function uploadUserComments(
	user: User,
	ballot: Ballot,
	sapin: number,
	file: Express.Multer.File
) {
	const commenter = await selectUser({ SAPIN: sapin });
	if (!commenter) throw new NotFoundError(`User SAPIN=${sapin} not found`);

	const { MaxCommentId, MaxIndex } = await getHighestIndexes(ballot.id);
	const startCommentId = MaxCommentId ? MaxCommentId + 1 : 1;
	const startIndex = MaxIndex ? MaxIndex + 1 : 1;

	const comments: CommentCreate[] = await parseEpollUserComments(
		commenter,
		startCommentId,
		startIndex,
		file
	);

	return insertComments(user, ballot.id, comments);
}

/**
 * Upload public review comments from spreadsheet.
 */
export async function uploadPublicReviewComments(
	user: User,
	ballot: Ballot,
	file: Express.Multer.File
) {
	const { MaxCommentId } = await getHighestIndexes(ballot.id);
	const startCommentId = MaxCommentId ? MaxCommentId + 1 : 1;

	const comments: CommentCreate[] = await parsePublicReviewComments(
		startCommentId,
		file
	);
	return insertComments(user, ballot.id, comments);
}
