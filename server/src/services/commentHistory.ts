import db from "../utils/database";
import { commentEditableFields, CommentEditable } from "./comments";
import type { Comment } from "../schemas/comments";
import {
	resolutionEditableFields,
	defaultResolution,
	ResolutionEditable,
} from "./resolutions";
import type { Resolution } from "../schemas/resolutions";

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
		${commentEditableFields
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
			${commentEditableFields
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
			${resolutionEditableFields.map((f) => `"${f}", NEW.${f}`).join(",\n\t\t\t")}
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
		${resolutionEditableFields
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
			${resolutionEditableFields.map((f) => `"${f}", OLD.${f}`).join(",\n\t\t\t")}
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

export type CommentHistoryEvent = {
	id: number;
	comment_id: number;
	resolution_id?: string;
	Action: "add" | "update" | "delete";
	Changes: CommentEditable | ResolutionEditable;
	UserID: number | null;
	UserName: string;
	Timestamp: string;
};

export type CommentHistoryEntry = Omit<CommentHistoryEvent, "resolution_id"> & {
	comment: Comment;
} & (
		| {
				resolution_id: string;
				resolution: Resolution;
		  }
		| {
				resolution_id: undefined;
				resolution: undefined;
		  }
	);

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

export async function getCommentHistory(comment_id: number) {
	const sql =
		db.format(getCommentsHistorySql, [comment_id]) +
		db.format("SELECT * FROM comments WHERE id=?;", [comment_id]) +
		db.format("SELECT * FROM resolutions WHERE comment_id=?;", [
			comment_id,
		]);
	const results = (await db.query({ sql, dateStrings: true })) as [
		CommentHistoryEvent[],
		Comment[],
		Resolution[]
	];

	const [commentsHistory, comments, resolutions] = results;

	let comment = comments[0];
	const resolutionEntities: Record<string, Resolution> = {};
	const history: CommentHistoryEntry[] = [];

	commentsHistory.forEach((event) => {
		let resolution: Resolution | undefined;
		if (!event.resolution_id) {
			if (event.Action === "add") {
				comment = { ...comment, ...event.Changes };
			}
			history.push({
				...event,
				comment,
				resolution_id: undefined,
				resolution: undefined,
			});
			comment = { ...comment, ...event.Changes };
		} else {
			if (event.Action === "add") {
				resolution = {
					id: event.resolution_id,
					comment_id: comment.id,
					LastModifiedBy: event.UserID!,
					LastModifiedTime: event.Timestamp,
					...defaultResolution,
					...event.Changes,
				};
			} else {
				resolution =
					resolutionEntities[event.resolution_id] ||
					defaultResolution;
			}
			resolutionEntities[event.resolution_id] = {
				...resolution,
				...event.Changes,
			};
			history.push({
				...event,
				comment,
				resolution_id: resolution.id,
				resolution,
			});
		}
	});

	return { history };
}
