'use strict';

const db = require('../util/database')
const rp = require('request-promise-native')

import {parseEpollCommentsCsv} from './ePollCSV'
import {parseMyProjectComments, myProjectAddResolutions} from './myProjectSpreadsheets'

/*
CREATE VIEW commentResolutions AS SELECT 
		b.BallotID, 
        r.id,
		IF((SELECT COUNT(*) FROM resolutions AS r WHERE c.id = r.comment_id) > 1, 
			CONCAT(CONVERT(c.CommentID, CHAR), ".", CONVERT(r.ResolutionID, CHAR)),  
			CONVERT(c.CommentID, CHAR)) AS CID,
		c.id AS comment_id,
		c.CommentID,
		c.CommenterSAPIN, c.CommenterEmail, c.CommenterName, results.Vote,
        c.MustSatisfy, c.Category, c.Clause, c.Page, c.Comment, c.ProposedChange,
        c.C_Page, c.C_Line, c.C_Clause, c.C_Index, c.AdHoc, c.CommentGroup,
        c.LastModifiedBy AS CommentLastModifiedBy, c.LastModifiedTime AS CommentLastModifiedTime,
		(SELECT COUNT(*) FROM resolutions AS r WHERE c.id = r.comment_id) AS ResolutionCount, 
		r.id as resolution_id, r.ResolutionID, r.AssigneeSAPIN, r.ResnStatus, r.Resolution, r.Submission, r.ReadyForMotion, r.ApprovedByMotion, 
		r.EditStatus, r.EditInDraft, r.EditNotes, r.Notes, 
		CASE WHEN users.Name IS NULL THEN r.AssigneeName ELSE users.Name END AS AssigneeName,
        r.LastModifiedBy, r.LastModifiedTime
	FROM ballots b JOIN comments c ON b.id=c.ballot_id 
		LEFT JOIN results ON b.id = results.ballot_id AND c.CommenterSAPIN = results.SAPIN 
		LEFT JOIN resolutions AS r ON c.id = r.comment_id 
		LEFT JOIN users ON r.AssigneeSAPIN = users.SAPIN;

DROP TRIGGER IF EXISTS comments_update;
DROP TRIGGER IF EXISTS comments_add;
DROP TRIGGER IF EXISTS comments_delete;
DELIMITER ;;
CREATE TRIGGER `comments_update` AFTER UPDATE ON `comments` FOR EACH ROW
BEGIN
SET @action ='update';
SET @changes = JSON_OBJECT(
	"Category", NEW.Category,
    "Clause", NEW.Clause,
    "Page", NEW.Page,
	"AdHoc", NEW.AdHoc,
    "CommentGroup", NEW.CommentGroup
    );
SET @id = (SELECT id FROM resolutionsLog WHERE comment_id=OLD.id AND resolution_id IS NULL AND Action=@action AND UserID=NEW.LastModifiedBy AND Timestamp > DATE_SUB(NEW.LastModifiedTime, INTERVAL 30 MINUTE) ORDER BY Timestamp DESC LIMIT 1);
IF @id IS NULL THEN
  INSERT INTO resolutionsLog (comment_id, Action, Changes, UserID, Timestamp) VALUES (OLD.id, @action, @changes, NEW.LastModifiedBy, NEW.LastModifiedTime);
ELSE
  UPDATE resolutionsLog SET `Changes`=@changes, `Timestamp`=NEW.LastModifiedTime WHERE id=@id;
END IF;
END;;
CREATE TRIGGER `comments_add` AFTER INSERT ON `comments` FOR EACH ROW
BEGIN
SET @action ='add';
SET @changes = JSON_OBJECT(
	"Category", NEW.Category,
    "Clause", NEW.Clause,
    "Page", NEW.Page,
	"AdHoc", NEW.AdHoc,
    "CommentGroup", NEW.CommentGroup
    );
INSERT INTO resolutionsLog (comment_id, Action, Changes, UserID, Timestamp) VALUES (NEW.id, @action, @changes, NEW.LastModifiedBy, NEW.LastModifiedTime);
END;;
CREATE TRIGGER `comments_delete` AFTER DELETE ON `comments` FOR EACH ROW
BEGIN
DELETE FROM resolutionsLog WHERE comment_id=OLD.id;
END;;
DELIMITER ;
*/

const GET_COMMENTS_SUMMARY_SQL =
	'SELECT ' +
		'COUNT(*) AS Count, ' +
		'MIN(CommentID) AS CommentIDMin, ' +
		'MAX(CommentID) AS CommentIDMax ' +
	'FROM ballots b JOIN comments c ON b.id=c.ballot_id WHERE b.BallotID=?';

const DELETE_COMMENTS_SQL = 
	'DELETE c, r ' +
		'FROM ballots b JOIN comments c ON c.ballot_id=b.id ' +
			'LEFT JOIN resolutions r ON r.comment_id=c.id ' +
		'WHERE b.BallotID=?;';

export function getComments(ballotId) {
	return db.query('SELECT * FROM commentResolutions WHERE BallotID=? ORDER BY CommentID, ResolutionID;', [ballotId])
}

async function updateComment(userId, comment) {
	if (!comment.id)
		throw 'Comment is missing id'
	const id = comment.id;
	delete comment.id;
	let SQL =
		db.format("UPDATE comments SET ?, LastModifiedBy=?, LastModifiedTime=NOW() WHERE id=?; ", [comment, userId, id]) +
		db.format("SELECT id, comment_id, ??, CommentLastModifiedBy, CommentLastModifiedTime FROM commentResolutions WHERE comment_id=?;", [Object.keys(comment), id]);
	const [results] = await db.query2(SQL)
	//console.log(rows)
	return results[1][0]
}

export async function updateComments(modifiedBy, comments) {
	const updatedComments = await Promise.all(comments.map(c => updateComment(modifiedBy, c)))
	//console.log(updatedComments)
	return {comments: updatedComments}
}

export async function setStartCommentId(ballotId, startCommentId) {
	const SQL = db.format(
		'SET @ballot_id = (SELECT id FROM ballots WHERE BallotID=?);' +
		'SET @startCommentId = ?;' +
		'SET @offset = @startCommentId - (SELECT MIN(CommentID) FROM comments WHERE ballot_id=@ballot_id);' +
		'UPDATE c, r ' +
			'SET c.CommentID=c.CommentID+@offset, r.CommentID=c.CommentID+@offset ' +
			'FROM comments c JOIN resolutions r ON c.id=r.comment_id ' +
			'WHERE c.ballot_id=@ballot_id;',
		[ballotId, startCommentId]
	);
	const results = await db.query(SQL);
	return getComments(ballotId);
}

export async function deleteComments(ballotId) {
	await db.query(DELETE_COMMENTS_SQL, [ballotId]);
	return true;
}

async function insertComments(modifiedBy, ballotId, comments) {
	let SQL = db.format(DELETE_COMMENTS_SQL, [ballotId]);
	if (comments.length) {
		const eBallotId = db.escape(ballotId);
		const eModifiedBy = db.escape(modifiedBy);
		SQL += 
			db.format('SET @ballot_id = (SELECT id FROM ballots WHERE BallotID=?); ', [ballotId]) +
			db.format('INSERT INTO comments (ballot_id, BallotID, ??, LastModifiedBy, LastModifiedTime) VALUES', [Object.keys(comments[0])]) +
			comments.map(c => `(@ballot_id, ${eBallotId}, ${db.escape(Object.values(c))}, ${eModifiedBy}, NOW())`).join(', ') +
			';'
	}
	SQL += db.format('SELECT * FROM commentResolutions WHERE b.BallotID=? ORDER BY CommentID, ResolutionID;', [ballotId])
	SQL += db.format(GET_COMMENTS_SUMMARY_SQL, [ballotId])

	//console.log(SQL);

	const results = await db.query(SQL)
	//console.log(results)
	return {
		BallotID: ballotId,
		comments: results[results.length-2],
		summary: results[results.length-1][0]
	}
}

export async function importEpollComments(sess, ballotId, epollNum, startCommentId) {
	const options = {
		url: `https://mentor.ieee.org/802.11/poll-comments.csv?p=${epollNum}`,
		jar: sess.ieeeCookieJar,
		resolveWithFullResponse: true,
		simple: false
	}
	const ieeeRes = await rp.get(options)
	//console.log(ieeeRes.headers)
	if (ieeeRes.headers['content-type'] !== 'text/csv') {
		throw 'Not logged in'
	}

	const comments = parseEpollCommentsCsv(ieeeRes.body, startCommentId);
	//console.log(comments[0])

	return insertComments(sess.user.SAPIN, ballotId, comments)
}

export async function uploadComments(sess, ballotId, type, startCommentId, file) {
	let comments
	if (type < 3) {
		comments = parseEpollCommentsCsv(file.buffer, startCommentId)
	}
	else {
		const isExcel = file.originalname.search(/\.xlsx$/i) !== -1
		comments = await parseMyProjectComments(startCommentId, file.buffer, isExcel)
	}
	return insertComments(sess.user.SAPIN, ballotId, comments)
}
