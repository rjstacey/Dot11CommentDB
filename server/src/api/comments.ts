/*
 * Comments API
 *
 * GET /{ballotId}
 *		Get list of comments for given ballot
 *		Query string paramters:
 *			modifiedSince:string - Optional date as ISO string.
 *		Return an array with all comments for a given ballot. If the modifiedSince parameter is provided, then returns comments for the given ballot
 *		that were modified after the modifiedSince timestamp.
 *
 * PATCH /{ballotId}
 *		Update comments
 *		URL parameters:
 *			ballotId:any 			Identifies the ballot
 *		Body is object with parameters:
 *			updates:array 			Array of objects with shape {id:any, changes:object}
 *			ballot_id				The ballot identifier
 *			modifiedSince:string 	Optional. Datetime in ISO format.
 *		Returns an array of resolution objects that were updated after the modidifiedSince timestamp.
 *
 * PATCH /{ballotId}/startCommentId
 *		Renumber comments
 *		URL parameters:
 *			ballotId:any 	Identifies the ballot
 *		Body is object with parameters:
 *			StartCommentID:number 	The number to begin comment numbering from
 *		Returns an array of resolution objects that is the complete list of resolutions for the identified ballot.
 *
 * DELETE /{ballotId}
 *		Delete all comments (and resolutions) for a given ballot
 *		URL parameters:
 *			ballotId:any 	Identifies the ballot
 *
 * POST /{ballotId}/importFromEpoll/{epollNum}
 * 		Replace existing comments (if any) with comments imported from an ePoll ballot
 *		URL parameters:
 *			ballotId:any 	Identifies the ballot
 *			epollNum:number Identifies teh ePoll
 *		Returns an array of resolution objects that is the complete list of resolutions for the identified ballot.
 *
 * POST /{ballotId}/upload
 *		Import comments from a file
 *		URL parameters:
 *			ballotId:any 	Identifies the ballot
 *		Multipart body parameters:
 *			The spreadsheet file
 *			params - a JSON object {StartCID:number}
 *		The format of the spreadsheet file is determined by the ballot type.
 *		For an SA ballot, the file is MyProject format.
 *		For WG ballot, the file is ePoll comments .csv file.
 *		Returns an array of resolution objects that is the complete list of resolutions for the identified ballot.
 *
 * POST /{ballotId}/export/{format} Multipart: file
 *		Export comments for a given ballot in specified format.
 *		URL parameters:
 *			format:string 	One of 'MyProject', 'Legacy', or 'Modern'
 *		Multipart body parameters:
 *			spreadsheet file - optional for @format == 'Legacy' and @format == 'Modern', mandatory for @format == 'MyProject'
 *			params - JSON object {Filename:string, Style:string}
 *		If the spreadsheet is provided, then the spreadsheet is updated with the resolutions
 *		Returns an array of resolution objects that is the complete list of resolutions for the identified ballot.
 *
 */
import { Router } from 'express';
import Multer from 'multer';

import {
	getComments,
	updateComments,
	setStartCommentId,
	deleteComments,
	importEpollComments,
	uploadComments,
} from '../services/comments';

import {
	exportResolutionsForMyProject,
	exportSpreadsheet
} from '../services/resolutions';

const upload = Multer();
const router = Router();

router.get('/:ballot_id(\\d+)', async (req, res, next) => {
	try {
		const ballot_id = Number(req.params.ballot_id);
		const modifiedSince = typeof req.query.modifiedSince === 'string'? req.query.modifiedSince: undefined;
		const data = await getComments(ballot_id, modifiedSince);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/$', async (req, res, next) => {
	try {
		const {user} = req;
		const {updates, ballot_id, modifiedSince} = req.body;
		if (!Array.isArray(updates))
			throw 'Missing or bad parameter "updates"; expected array';
		const data = await updateComments(user.SAPIN, updates, ballot_id, modifiedSince);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/:ballot_id(\\d+)/startCommentId', async (req, res, next) => {
	try {
		const {user} = req;
		const ballot_id = Number(req.params.ballot_id);
		const {StartCommentID} = req.body;
		const data = await setStartCommentId(user, ballot_id, StartCommentID);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/:ballot_id(\\d+)', async (req, res, next) => {
	try {
		const {user} = req;
		const ballot_id = Number(req.params.ballot_id);
		const data = await deleteComments(user, ballot_id);
		res.json(data);
	}
	catch (err) {next(err)}
});

router.post('/:ballot_id(\\d+)/importFromEpoll/:epollNum(\\d+)', async (req, res, next) => {
	try {
		const {user} = req;
		const ballot_id = Number(req.params.ballot_id);
		const epollNum = Number(req.params.epollNum);
		const startCommentId = req.body.StartCID || 1;
		const data = await importEpollComments(user, ballot_id, epollNum, startCommentId);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/:ballot_id(\\d+)/upload', upload.single('CommentsFile'), async (req, res, next) => {
	try {
		const {user} = req;
		const ballot_id = Number(req.params.ballot_id);
		if (!req.file)
			throw new Error('Missing file');
		const startCommentId = req.body.StartCID || 1;
		const data = await uploadComments(user, ballot_id, startCommentId, req.file);
		res.json(data);
	}
	catch(err) {next(err)}
});

const commentSpreadsheetFormats = ["MyProject", "Legacy", "Modern"] as const;
type CommentSpreadsheetFormat = typeof commentSpreadsheetFormats[number];
const isCommentSpreadsheetFormat = (f: any): f is CommentSpreadsheetFormat => commentSpreadsheetFormats.includes(f);

router.post('/:ballot_id(\\d+)/export/:format', upload.single('file'), (req, res, next) => {
	try {
		const {user} = req;
		const ballot_id = Number(req.params.ballot_id);
		const {format} = req.params;
		const {Filename, Style} = JSON.parse(req.body.params);
		if (!isCommentSpreadsheetFormat(format))
			throw new TypeError(`Unexpected format: ${format}. Expect one of ${commentSpreadsheetFormats.join(', ')}.`);
		if (format === "MyProject") {
			if (!req.file)
				throw new TypeError('Missing file');
			return exportResolutionsForMyProject(ballot_id, Filename, req.file, res).catch(err => next(err))
		}
		else {
			let isLegacy = format === 'Legacy';
			if (!Style)
				throw new TypeError('Missing parameter Style');
			return exportSpreadsheet(user, ballot_id, Filename, isLegacy, Style, req.file, res).catch(err => next(err))
		}
	}
	catch (error) {next(error)}
});

export default router;
