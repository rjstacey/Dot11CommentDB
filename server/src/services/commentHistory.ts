import db from "../utils/database.js";
import {
	commentChangeSchema,
	Comment,
	CommentResolutionChange,
} from "@schemas/comments.js";
import { defaultResolution } from "./resolutions.js";
import { resolutionChangeSchema } from "@schemas/resolutions.js";
import type { Resolution } from "@schemas/resolutions.js";
import type { CommentHistoryEntry } from "@schemas/commentHistory.js";
import { RowDataPacket } from "mysql2";
import { NotFoundError } from "src/utils/error.js";

type CommentResolutionChangeDB = Omit<
	CommentResolutionChange,
	"AdHoc" | "CommentGroup" | "Submission" | "ReadyForMotion" | "AssigneeName"
> & {
	AdHoc?: string | null;
	CommentGroup?: string | null;
	Submission?: string | null;
	ReadyForMotion?: 0 | 1 | null;
	AssigneeName?: string | null;
};

type CommentHistoryEntryDB = Omit<
	CommentHistoryEntry,
	"Changes" | "comment" | "resolution_id" | "resolution"
> & {
	Changes: CommentResolutionChangeDB;
};

const commentChangeFields = Object.keys(commentChangeSchema.shape);
const resolutionChangeFields = Object.keys(resolutionChangeSchema.shape);

//const jsonField = (field: string) => `JSON_UNQUOTE(JSON_EXTRACT(Changes, "$.${field}")) AS ${field}`;

/* We coalesce changes into a single entry if a change is made within a certain interval of the last change as defined below */
const updateIntervalSQL = "INTERVAL 15 MINUTE";

const convertNewField = (f: string) =>
	f === "AdHocGroupId" ? `BIN_TO_UUID(NEW.${f})` : `NEW.${f}`;

const createTriggerCommentsUpdateSQL = `
	DROP TRIGGER IF EXISTS comments_update;
	CREATE TRIGGER comments_update AFTER UPDATE ON comments FOR EACH ROW
	BEGIN
		SET @action ="update";
		SET @changes = JSON_OBJECT();
		${commentChangeFields
			.map(
				(f) =>
					`IF NOT(NEW.${f}<=>OLD.${f}) THEN SET @changes = JSON_INSERT(@changes, '$.${f}', ${convertNewField(
						f
					)}); END IF;`
			)
			.join("\n\t\t")}
		SET @id = (SELECT id FROM resolutionsLog WHERE comment_id=NEW.id AND resolution_id IS NULL AND Action=@action AND UserID=NEW.LastModifiedBy AND Timestamp > DATE_SUB(NEW.LastModifiedTime, ${updateIntervalSQL}) ORDER BY Timestamp DESC LIMIT 1);
		IF @id IS NULL THEN
  			INSERT INTO resolutionsLog (comment_id, Action, Changes, UserID, Timestamp) VALUES (OLD.id, @action, @changes, NEW.LastModifiedBy, NEW.LastModifiedTime);
		ELSE
  			UPDATE resolutionsLog SET Changes=JSON_MERGE_PATCH(Changes, @changes), Timestamp=NEW.LastModifiedTime WHERE id=@id;
		END IF;
	END;
`;

const createTriggerCommentsAddSQL = `
	DROP TRIGGER IF EXISTS comments_add;
	CREATE TRIGGER comments_add AFTER INSERT ON comments FOR EACH ROW
	BEGIN
		SET @action ="add";
		SET @changes = JSON_OBJECT(
			${commentChangeFields
				.map((f) => `"${f}", ${convertNewField(f)}`)
				.join(",\n\t\t\t")}
		);
		INSERT INTO resolutionsLog (comment_id, Action, Changes, UserID, Timestamp) VALUES (NEW.id, @action, @changes, NEW.LastModifiedBy, NEW.LastModifiedTime);
	END;
`;

const createTriggerCommentsDeleteSQL = `
	DROP TRIGGER IF EXISTS comments_delete;
	CREATE TRIGGER comments_delete AFTER DELETE ON comments FOR EACH ROW
	BEGIN
		DELETE FROM resolutionsLog WHERE comment_id=OLD.id;
	END;
`;

const createTriggerResolutionsAddSQL = `
	DROP TRIGGER IF EXISTS resolutions_add;
	CREATE TRIGGER resolutions_add AFTER INSERT ON resolutions FOR EACH ROW
	BEGIN
		SET @action ="add";
		SET @changes = JSON_OBJECT(
			${resolutionChangeFields.map((f) => `"${f}", NEW.${f}`).join(",\n\t\t\t")}
		);
		INSERT INTO resolutionsLog (comment_id, resolution_id, Action, Changes, UserID, Timestamp) VALUES (NEW.comment_id, NEW.id, @action, @changes, NEW.LastModifiedBy, NEW.LastModifiedTime);
	END;
`;

const createTriggerResolutionsUpdateSQL = `
	DROP TRIGGER IF EXISTS resolutions_update;
	CREATE TRIGGER resolutions_update AFTER UPDATE ON resolutions FOR EACH ROW
	BEGIN
		SET @action ="update";
		SET @changes = JSON_OBJECT();
		${resolutionChangeFields
			.map(
				(f) =>
					`IF NOT(NEW.${f}<=>OLD.${f}) THEN SET @changes = JSON_INSERT(@changes, '$.${f}', NEW.${f}); END IF;`
			)
			.join("\n\t\t")}
		SET @id = (SELECT id FROM resolutionsLog WHERE resolution_id=OLD.id AND Action=@action AND UserID=NEW.LastModifiedBy AND Timestamp > DATE_SUB(NEW.LastModifiedTime, ${updateIntervalSQL}) ORDER BY Timestamp DESC LIMIT 1);
		IF @id IS NULL THEN
			INSERT INTO resolutionsLog (comment_id, resolution_id, Action, Changes, UserID, Timestamp) VALUES (OLD.comment_id, OLD.id, @action, @changes, NEW.LastModifiedBy, NEW.LastModifiedTime);
		ELSE
			UPDATE resolutionsLog SET Changes=JSON_MERGE_PATCH(Changes, @changes), Timestamp=NEW.LastModifiedTime WHERE id=@id;
		END IF;
	END;
`;

const createTriggerResolutionsDeleteSQL = `
	DROP TRIGGER IF EXISTS resolutions_delete;
	CREATE TRIGGER resolutions_delete AFTER DELETE ON resolutions FOR EACH ROW
	BEGIN
		SET @action ="delete";
		SET @changes = JSON_OBJECT(
			${resolutionChangeFields.map((f) => `"${f}", OLD.${f}`).join(",\n\t\t\t")}
		);
		INSERT INTO resolutionsLog (comment_id, resolution_id, Action, Changes, UserID, Timestamp) VALUES (OLD.comment_id, OLD.id, @action, @changes, OLD.LastModifiedBy, UTC_TIMESTAMP());
	END;
`;

export function init() {
	const sql =
		createTriggerCommentsAddSQL +
		createTriggerCommentsUpdateSQL +
		createTriggerCommentsDeleteSQL +
		createTriggerResolutionsAddSQL +
		createTriggerResolutionsUpdateSQL +
		createTriggerResolutionsDeleteSQL;

	//console.log(sql);
	return db.query(sql);
}

const getCommentsHistorySql = `
	SELECT
		l.id,
		l.comment_id,
		BIN_TO_UUID(l.resolution_id) as resolution_id,
		l.UserID,
		l.Action,
		l.Changes,
		DATE_FORMAT(l.Timestamp, "%Y-%m-%dT%TZ") AS Timestamp,
		m.Name AS UserName
	FROM resolutionsLog l
		LEFT JOIN members m ON l.UserID=m.SAPIN 
	WHERE l.comment_id=?
	ORDER BY Timestamp;
`;

// prettier-ignore
const getCommentsSQL =
	"SELECT " +
		"id, " +
		"ballot_id, " +
		"CommentID, " +
		"CommenterName, " +
		"CommenterSAPIN, " +
		"CommenterEmail, " +
		"Category, " +
		"C_Clause, " +
		"C_Page, " +
		"C_Line, " +
		"C_Index, " +
		"MustSatisfy, " +
		"Clause, " +
		"Page, " +
		"Comment, " +
		"ProposedChange, " +
		"BIN_TO_UUID(AdHocGroupId) AS AdHocGroupId, " +
		"COALESCE(AdHoc, '') AS AdHoc, " +
		"AdHocStatus, " +
		"Notes, " +
		'COALESCE(CommentGroup, "") AS CommentGroup, ' +
		'DATE_FORMAT(LastModifiedTime, "%Y-%m-%dT%TZ") AS LastModifiedTime, ' +
		"LastModifiedBy " +
	"FROM comments WHERE id=?;";

function parseChanges(
	changesDb: CommentResolutionChangeDB
): CommentResolutionChange {
	const changes = { ...changesDb } as CommentResolutionChange;
	if ("AdHoc" in changesDb) changes.AdHoc = changesDb.AdHoc || "";
	if ("CommentGroup" in changesDb)
		changes.CommentGroup = changesDb.CommentGroup || "";
	if ("Submission" in changesDb)
		changes.Submission = changesDb.Submission || "";
	if ("ReadyForMotion" in changesDb)
		changes.ReadyForMotion = changesDb.ReadyForMotion === 1 ? true : false;
	if ("AssigneeName" in changesDb)
		changes.AssigneeName = changesDb.AssigneeName || "";
	return changes;
}

export async function getCommentHistory(comment_id: number) {
	const [commentsHistory, comments] = await Promise.all([
		db.query<(RowDataPacket & CommentHistoryEntryDB)[]>(
			getCommentsHistorySql,
			[comment_id]
		),
		db.query<(RowDataPacket & Comment)[]>(getCommentsSQL, [comment_id]),
	]);
	if (comments.length === 0)
		throw new NotFoundError(`Comment id=${comment_id} not found`);

	let comment = comments[0];
	const resolutionEntities: Record<string, Resolution> = {};
	const history: CommentHistoryEntry[] = [];

	for (const event of commentsHistory) {
		const changesDb = event.Changes;
		const changes = parseChanges(changesDb);
		let entry: CommentHistoryEntry;
		const resolution_id = event.resolution_id;
		if (!resolution_id) {
			if (event.Action === "add") {
				comment = { ...comment, ...changes };
			}
			entry = {
				id: event.id,
				Action: event.Action,
				UserID: event.UserID,
				UserName: event.UserName,
				Timestamp: event.Timestamp,
				comment_id: event.comment_id,
				Changes: changes,
				comment,
			};
			comment = { ...comment, ...changes };
		} else {
			let resolution: Resolution;
			if (event.Action === "add") {
				resolution = {
					id: resolution_id,
					comment_id: comment.id,
					LastModifiedBy: event.UserID!,
					LastModifiedTime: event.Timestamp,
					...defaultResolution,
					...changes,
				};
			} else {
				resolution =
					resolutionEntities[resolution_id] || defaultResolution;
			}
			entry = {
				id: event.id,
				Action: event.Action,
				UserID: event.UserID,
				UserName: event.UserName,
				Timestamp: event.Timestamp,
				comment_id: event.comment_id,
				Changes: changes,
				comment,
				resolution_id,
				resolution,
			};
			resolution = { ...resolution, ...changes };
			resolutionEntities[event.resolution_id] = resolution;
		}
		history.push(entry);
	}

	return { history };
}
