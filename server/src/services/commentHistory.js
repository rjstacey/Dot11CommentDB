const db = require('../util/database')

const jsonField = (field) => `JSON_UNQUOTE(JSON_EXTRACT(Changes, "$.${field}")) AS ${field}`;

/* We coalesce changes into a single entry if a change is made within a certain interval of the last change as defined below */
const updateIntervalSQL = 'INTERVAL 15 MINUTE';

const commentFields = [
	'CommentID',
	'Category',
	'Clause',
	'Page',
	'AdHoc',
	'CommentGroup',
	'Notes'
];

const createTriggerCommentsUpdateSQL =
	'CREATE TRIGGER comments_update AFTER UPDATE ON comments FOR EACH ROW ' +
	'BEGIN ' +
		'SET @action =\'update\'; ' +
		'SET @changes = JSON_OBJECT( ' +
			commentFields.map(f => `"${f}", NEW.${f}`).join(', ') +
		'); ' +
		'SET @id = (SELECT id FROM resolutionsLog WHERE comment_id=NEW.id AND resolution_id=NULL AND Action=@action AND UserID=NEW.LastModifiedBy AND Timestamp > DATE_SUB(NEW.LastModifiedTime, ' + updateIntervalSQL + ') ORDER BY Timestamp DESC LIMIT 1); ' +
		'IF @id IS NULL THEN ' +
  			'INSERT INTO resolutionsLog (comment_id, Action, Changes, UserID, Timestamp) VALUES (OLD.id, @action, @changes, NEW.LastModifiedBy, NEW.LastModifiedTime); ' +
		'ELSE ' +
  			'UPDATE resolutionsLog SET `Changes`=@changes, `Timestamp`=NEW.LastModifiedTime WHERE id=@id; ' +
		'END IF; ' +
	'END;';

const createTriggerCommentsAddSQL =
	'CREATE TRIGGER comments_add AFTER INSERT ON comments FOR EACH ROW ' + 
	'BEGIN ' +
		'SET @action ="add"; ' +
		'SET @changes = JSON_OBJECT( ' +
			commentFields.map(f => `"${f}", NEW.${f}`).join(', ') +
		'); ' +
		'INSERT INTO resolutionsLog (comment_id, Action, Changes, UserID, Timestamp) VALUES (NEW.id, @action, @changes, NEW.LastModifiedBy, NEW.LastModifiedTime); ' +
	'END; ';

const createTriggerCommentsDeleteSQL =
	'CREATE TRIGGER comments_delete AFTER DELETE ON comments FOR EACH ROW ' +
	'BEGIN ' +
		'DELETE FROM resolutionsLog WHERE comment_id=OLD.id; ' +
	'END; ';

const resolutionFields = [
	'ResolutionID',
	'AssigneeSAPIN',
	'AssigneeName',
	'Submission',
	'ResnStatus',
	'Resolution',
	'ReadyForMotion',
	'ApprovedByMotion',
	'EditStatus',
	'EditNotes',
	'EditInDraft'
];

const createTriggerResolutionsAddSQL =
	'CREATE TRIGGER resolutions_add AFTER INSERT ON resolutions FOR EACH ROW ' + 
	'BEGIN ' +
		'SET @action ="add"; ' +
		'SET @changes = JSON_OBJECT( ' +
			resolutionFields.map(f => `"${f}", NEW.${f}`).join(', ') +
		'); ' +
		'INSERT INTO resolutionsLog (comment_id, resolution_id, Action, Changes, UserID, Timestamp) VALUES (NEW.comment_id, NEW.id, @action, @changes, NEW.LastModifiedBy, NEW.LastModifiedTime); ' +
	'END; ';

const createTriggerResolutionsUpdateSQL =
	'CREATE TRIGGER resolutions_update AFTER UPDATE ON resolutions FOR EACH ROW ' +
	'BEGIN ' +
		'SET @action ="update"; ' +
		'SET @changes = JSON_OBJECT( ' +
			resolutionFields.map(f => `"${f}", NEW.${f}`).join(', ') +
		'); ' +
		'SET @id = (SELECT id FROM resolutionsLog WHERE resolution_id=OLD.id AND Action=@action AND UserID=NEW.LastModifiedBy AND Timestamp > DATE_SUB(NEW.LastModifiedTime, ' + updateIntervalSQL + ') ORDER BY Timestamp DESC LIMIT 1); ' +
		'IF @id IS NULL THEN ' +
			'INSERT INTO resolutionsLog (comment_id, resolution_id, Action, Changes, UserID, Timestamp) VALUES (OLD.comment_id, OLD.id, @action, @changes, NEW.LastModifiedBy, NEW.LastModifiedTime); ' +
		'ELSE ' +
			'UPDATE resolutionsLog SET `Changes`=@changes, `Timestamp`=NEW.LastModifiedTime WHERE id=@id; ' +
		'END IF; ' +
	'END; ';

const createTriggerResolutionsDeleteSQL = 
	'CREATE TRIGGER resolutions_delete AFTER DELETE ON resolutions FOR EACH ROW ' +
	'BEGIN ' +
		'SET @action ="delete"; ' +
		'SET @changes = JSON_OBJECT( ' +
			resolutionFields.map(f => `"${f}", OLD.${f}`).join(', ') +
    	'); ' +
		'INSERT INTO resolutionsLog (comment_id, resolution_id, Action, Changes, UserID, Timestamp) VALUES (OLD.comment_id, OLD.id, @action, @changes, OLD.LastModifiedBy, NOW()); ' +
	'END; ';

export async function initCommentHistory() {
	const SQL =
		'DROP TRIGGER IF EXISTS comments_add;\n' +
		createTriggerCommentsAddSQL + '\n' +
		'DROP TRIGGER IF EXISTS comments_update;\n' +
		createTriggerCommentsUpdateSQL + '\n' +
		'DROP TRIGGER IF EXISTS comments_delete;\n' +
		createTriggerCommentsDeleteSQL + '\n' +
		'DROP TRIGGER IF EXISTS resolutions_add;\n' +
		createTriggerResolutionsAddSQL + '\n' +
		'DROP TRIGGER IF EXISTS resolutions_update;\n' +
		createTriggerResolutionsUpdateSQL + '\n' +
		'DROP TRIGGER IF EXISTS resolutions_delete;\n' +
		createTriggerResolutionsDeleteSQL;

	//console.log(SQL);

	await db.query(SQL);
}

const GET_COMMENTS_HISTORY_SQL = 
	'SELECT ' +
		'l.id, l.comment_id, BIN_TO_UUID(l.resolution_id) as resolution_id, l.UserID, l.Action, l.Changes, l.Timestamp, ' +
		'm.Name AS UserName ' +
	'FROM resolutionsLog l ' + 
		'LEFT JOIN members m ON l.UserID=m.SAPIN ' + 
	'WHERE l.comment_id=? ' + 
	'ORDER BY Timestamp;';

export async function getCommentHistory(comment_id) {
	const SQL =
		db.format(GET_COMMENTS_HISTORY_SQL, [comment_id]) +
		db.format('SELECT * FROM comments WHERE id=?;', [comment_id]) +
		db.format('SELECT * FROM resolutions WHERE comment_id=?;', [comment_id]);
	const results = await db.query(SQL);
	
	const commentsHistory = results[0].map(h => {
		return {...h, Changes: JSON.parse(h.Changes)}
	});
	const comments = results[1];
	const resolutions = results[2];

	return {
		commentsHistory,
		comments,
		resolutions
	}
}
