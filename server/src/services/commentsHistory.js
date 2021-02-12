const db = require('../util/database')

const jsonField = (field) => `JSON_UNQUOTE(JSON_EXTRACT(Changes, "$.${field}")) AS ${field}`;
const commentFields = [
	'Page',
	'Clause',
	'Category',
	'CommentGroup',
	'AdHoc'
];
const resolutionFields = [
	'AssigneeSAPIN',
	'AssigneeName',
	'ResnStatus',
	'Resolution',
	'Submission',
	'ReadyForMotion',
	'ApprovedByMotion',
	'EditStatus',
	'EditNotes',
	'EditInDraft'
];
const GET_COMMENTS_HISTORY_SQL = 
	'SELECT ' +
		'l.id, l.comment_id, l.resolution_id, l.UserID, l.Action, l.Changes, l.Timestamp, ' +
		'u.Name AS UserName ' +
	'FROM resolutionsLog l ' + 
		'JOIN users u ON l.UserID=u.SAPIN ' + 
	'WHERE l.comment_id=? ' + 
	'ORDER BY Timestamp;';

export async function getCommentsHistory(comment_id) {
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
