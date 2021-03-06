'use strict';

const db = require('../util/database')
const rp = require('request-promise-native')

import {parseEpollCommentsCsv} from './epoll'
import {parseMyProjectComments, myProjectAddResolutions} from './myProjectSpreadsheets'

/*
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

const createTriggerCommentsUpdateSQL =
	'CREATE TRIGGER comments_update AFTER UPDATE ON comments FOR EACH ROW ' +
	'BEGIN ' +
		'SET @action =\'update\'; ' +
		'SET @changes = JSON_OBJECT( ' +
        '"CommentID", NEW.CommentID, ' +
        '"Category", NEW.Category, ' +
    		'"Clause", NEW.Clause, ' +
    		'"Page", NEW.Page, ' +
        '"AdHoc", NEW.AdHoc, ' +
    		'"CommentGroup", NEW.CommentGroup, ' +
    		'"Notes", NEW.Notes ' +
    '); ' +
		'SET @id = (SELECT id FROM resolutionsLog WHERE comment_id=NEW.id AND resolution_id=NULL AND Action=@action AND UserID=NEW.LastModifiedBy AND Timestamp > DATE_SUB(NEW.LastModifiedTime, INTERVAL 30 MINUTE) ORDER BY Timestamp DESC LIMIT 1); ' +
		'IF @id IS NULL THEN ' +
  		'INSERT INTO resolutionsLog (comment_id, Action, Changes, UserID, Timestamp) VALUES (OLD.id, @action, @changes, NEW.LastModifiedBy, NEW.LastModifiedTime); ' +
		'ELSE ' +
  		'UPDATE resolutionsLog SET `Changes`=@changes, `Timestamp`=NEW.LastModifiedTime WHERE id=@id; ' +
		'END IF; ' +
	'END;';

const createTriggerCommentsAddSQL =
	'CREATE TRIGGER comments_add AFTER INSERT ON comments FOR EACH ROW ' + 
	'BEGIN ' +
		'SET @action =\'add\'; ' +
		'SET @changes = JSON_OBJECT( ' +
      '"CommentID", NEW.CommentID, ' +
      '"Category", NEW.Category, ' +
    	'"Clause", NEW.Clause, ' +
    	'"Page", NEW.Page, ' +
      '"AdHoc", NEW.AdHoc, ' +
    	'"CommentGroup", NEW.CommentGroup, ' +
    	'"Notes", NEW.Notes ' +
    '); ' +
		'INSERT INTO resolutionsLog (comment_id, Action, Changes, UserID, Timestamp) VALUES (NEW.id, @action, @changes, NEW.LastModifiedBy, NEW.LastModifiedTime); ' +
	'END; ';

const createTriggerCommentsDeleteSQL =
	'CREATE TRIGGER comments_delete AFTER DELETE ON comments FOR EACH ROW ' +
	'BEGIN ' +
		'DELETE FROM resolutionsLog WHERE comment_id=OLD.id; ' +
	'END; ';

const createViewCommentResolutionsSQL = 
	'CREATE VIEW commentResolutions AS SELECT ' +
		'b.id AS ballot_id, ' +
		'c.id AS comment_id, ' +
		'r.id AS resolution_id, ' +
		'IF((SELECT count(0) from resolutions r WHERE (c.id = r.comment_id)) > 1, concat(cast(c.id as CHAR), "-", cast(r.id as CHAR)), cast(c.id as CHAR)) AS id, ' +
		'IF((SELECT count(0) from resolutions r WHERE (c.id = r.comment_id)) > 1, concat(c.CommentID, ".", r.ResolutionID), c.CommentID) AS CID, ' +
		'b.BallotID AS BallotID, ' +
		'c.CommentID AS CommentID, ' +
		'r.ResolutionID AS ResolutionID, ' +
		'(SELECT count(0) from resolutions r WHERE (c.id = r.comment_id)) AS ResolutionCount, ' +
		'c.CommenterSAPIN AS CommenterSAPIN, ' +
		'c.CommenterEmail AS CommenterEmail, ' +
		'c.CommenterName AS CommenterName, ' +
		'results.Vote AS Vote, ' +
		'c.MustSatisfy AS MustSatisfy, ' +
		'c.Category AS Category, ' +
		'c.Clause AS Clause, ' +
		'c.Page AS Page, ' +
		'c.Comment AS Comment, ' +
		'c.ProposedChange AS ProposedChange, ' +
		'c.C_Page AS C_Page, ' +
		'c.C_Line AS C_Line, ' +
		'c.C_Clause AS C_Clause, ' +
		'c.C_Index AS C_Index, ' +
		'c.AdHoc AS AdHoc, ' +
		'c.CommentGroup AS CommentGroup, ' +
		'c.Notes AS Notes, ' +
		'r.AssigneeSAPIN AS AssigneeSAPIN, ' +
		'r.ResnStatus AS ResnStatus, ' +
		'r.Resolution AS Resolution, ' +
		'r.Submission AS Submission, ' +
		'r.ReadyForMotion AS ReadyForMotion, ' +
		'r.ApprovedByMotion AS ApprovedByMotion, ' +
		'r.EditStatus AS EditStatus, ' +
		'r.EditInDraft AS EditInDraft, ' +
		'r.EditNotes AS EditNotes, ' +
		'COALESCE(m.Name, r.AssigneeName) AS AssigneeName, ' +
		'IF(c.LastModifiedTime > r.LastModifiedTime, c.LastModifiedBy, r.LastModifiedBy) AS LastModifiedBy, ' +
		'IF(c.LastModifiedTime > r.LastModifiedTime, c.LastModifiedTime, r.LastModifiedTime) AS LastModifiedTime ' +
	'FROM ballots b JOIN comments c ON (b.id = c.ballot_id) ' + 
		'LEFT JOIN resolutions r ON (c.id = r.comment_id) ' + 
		'LEFT JOIN members m ON (r.AssigneeSAPIN = m.SAPIN) ' + 
		'LEFT JOIN results ON (b.id = results.ballot_id AND c.CommenterSAPIN = results.SAPIN); ';

export async function initCommentsTables() {
	const SQL =
		'DROP VIEW IF EXISTS commentResolutions; ' +
		createViewCommentResolutionsSQL +
		'DROP TRIGGER IF EXISTS comments_add; ' +
		createTriggerCommentsAddSQL +
		'DROP TRIGGER IF EXISTS comments_update; ' +
		createTriggerCommentsUpdateSQL +
		'DROP TRIGGER IF EXISTS comments_delete; ' +
		createTriggerCommentsDeleteSQL;
		console.log(SQL)
	await db.query(SQL);
}

export const GET_COMMENTS_SQL = 
	'SELECT * FROM commentResolutions WHERE BallotID=? ORDER BY CommentID, ResolutionID';

export const GET_COMMENTS_SUMMARY_SQL =
	'SELECT ' +
		'b.id AS id, ' +
		'COUNT(*) AS Count, ' +
		'MIN(CommentID) AS CommentIDMin, ' +
		'MAX(CommentID) AS CommentIDMax ' +
	'FROM ballots b JOIN comments c ON b.id=c.ballot_id WHERE b.BallotID=?';

const DELETE_COMMENTS_SQL = 
	'SET @userId=?; ' +
	'SET @ballot_id = (SELECT id FROM ballots WHERE BallotID=?); ' +
	'UPDATE comments ' +
		'SET LastModifiedBy=@userId, LastModifiedTime=NOW() ' +
		'WHERE ballot_id=@ballot_id;' +
	'DELETE c, r ' +
		'FROM comments c LEFT JOIN resolutions r ON r.comment_id=c.id ' +
		'WHERE c.ballot_id=@ballot_id;';

export const getComments = (ballotId) => db.query(GET_COMMENTS_SQL, [ballotId]);

async function updateComment(userId, comment) {
	if (!comment.id)
		throw 'Comment is missing id'
	const id = comment.id;
	delete comment.id;
	let SQL =
		db.format("UPDATE comments SET ?, LastModifiedBy=?, LastModifiedTime=NOW() WHERE id=?; ", [comment, userId, id]) +
		db.format("SELECT id, comment_id, CID, ??, LastModifiedBy, LastModifiedTime FROM commentResolutions WHERE comment_id=?;", [Object.keys(comment), id]);
	const [noop, comments] = await db.query(SQL);
	//console.log(rows)
	return comments;
}

export async function updateComments(userId, comments) {
	const arrayOfArrays = await Promise.all(comments.map(c => updateComment(userId, c)));
	let updatedComments = [];
	for (const comments of arrayOfArrays)
		updatedComments = updatedComments.concat(comments)
	//console.log(updatedComments)
	return {comments: updatedComments}
}

export async function setStartCommentId(userId, ballotId, startCommentId) {
	const SQL = db.format(
		'SET @userId=?;' +
		'SET @ballot_id = (SELECT id FROM ballots WHERE BallotID=?);' +
		'SET @startCommentId = ?;' +
		'SET @offset = @startCommentId - (SELECT MIN(CommentID) FROM comments WHERE ballot_id=@ballot_id);' +
		'UPDATE comments c ' +
			'SET c.LastModifiedBy=@userId, c.CommentID=c.CommentID+@offset ' +
			'WHERE c.ballot_id=@ballot_id;',
		[userId, ballotId, startCommentId]
	);
	const results = await db.query(SQL);
	return getComments(ballotId);
}

export async function deleteComments(userId, ballotId) {
	await db.query(DELETE_COMMENTS_SQL, [userId, ballotId]);
	return true;
}

async function insertComments(userId, ballotId, comments) {
	let SQL = db.format(DELETE_COMMENTS_SQL, [userId, ballotId]);
	if (comments.length) {
		const eModifiedBy = db.escape(userId);
		const eBallotId = db.escape(ballotId);
		SQL += 
			db.format('SET @ballot_id = (SELECT id FROM ballots WHERE BallotID=?); ', [ballotId]) +
			db.format('INSERT INTO comments (ballot_id, ??, LastModifiedBy, LastModifiedTime) VALUES', [Object.keys(comments[0])]) +
			comments.map(c => `(@ballot_id, ${db.escape(Object.values(c))}, ${eModifiedBy}, NOW())`).join(', ') +
			';';
	}
	SQL += db.format('SELECT * FROM commentResolutions WHERE BallotID=? ORDER BY CommentID, ResolutionID;', [ballotId]);
	SQL += db.format(GET_COMMENTS_SUMMARY_SQL, [ballotId]);

	//console.log(SQL);

	const results = await db.query(SQL)
	//console.log(results)
	const summary = results[results.length-1][0];
	const ballot_id = summary.id;
	delete summary.id;
	const ballot = {
		BallotID: ballotId,
		id: ballot_id,
		Comments: summary
	};
	return {
		comments: results[results.length-2],
		ballot,
	}
}

export async function importEpollComments(ieeeCookieJar, userId, ballotId, epollNum, startCommentId) {
	const options = {
		url: `https://mentor.ieee.org/802.11/poll-comments.csv?p=${epollNum}`,
		jar: ieeeCookieJar,
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

	return insertComments(userId, ballotId, comments)
}

export async function uploadComments(userId, ballotId, type, startCommentId, file) {
	let comments
	if (type < 3) {
		comments = parseEpollCommentsCsv(file.buffer, startCommentId)
	}
	else {
		const isExcel = file.originalname.search(/\.xlsx$/i) !== -1
		comments = await parseMyProjectComments(startCommentId, file.buffer, isExcel)
	}
	return insertComments(userId, ballotId, comments)
}
