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
	'ORDER BY Timestamp';

export async function getCommentsHistory(comment_id) {
	let [commentsHistory] = await db.query2(GET_COMMENTS_HISTORY_SQL, [comment_id])
	commentsHistory = commentsHistory.map(h => {
		return {...h, Changes: JSON.parse(h.Changes)}
	});
	return {commentsHistory}
}
