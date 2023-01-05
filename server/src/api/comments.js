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
import {Router} from 'express';

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

const upload = require('multer')();
const router = Router();

router.get('/:ballot_id(\\d+)', async (req, res, next) => {
	try {
		const {ballot_id} = req.params;
		const {modifiedSince} = req.query;
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
		const {ballot_id} = req.params;
		const {StartCommentID} = req.body;
		const data = await setStartCommentId(user.SAPIN, ballot_id, StartCommentID);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/:ballot_id(\\d+)', async (req, res, next) => {
	try {
		const {user} = req;
		const {ballot_id} = req.params;
		const data = await deleteComments(user.SAPIN, ballot_id);
		res.json(data);
	}
	catch (err) {next(err)}
});

router.post('/:ballot_id(\\d+)/importFromEpoll/:epollNum', async (req, res, next) => {
	try {
		const {user} = req;
		const {ballot_id, epollNum} = req.params;
		const startCommentId = req.body.StartCID || 1;
		const data = await importEpollComments(user, ballot_id, epollNum, startCommentId);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/:ballot_id(\\d+)/upload', upload.single('CommentsFile'), async (req, res, next) => {
	try {
		const {user} = req;
		const ballot_id = parseInt(req.params.ballot_id, 10);
		if (!req.file)
			throw new Error('Missing file');
		const startCommentId = req.body.StartCID || 1;
		const data = await uploadComments(user.SAPIN, ballot_id, startCommentId, req.file);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/:ballot_id(\\d+)/export/:format', upload.single('file'), (req, res, next) => {
	const {user} = req;
	const {ballot_id, format} = req.params;
	const {Filename, Style} = JSON.parse(req.body.params)
	const CommentsSpreadsheetFormat = {
		MyProject: 'MyProject',
		Legacy: 'Legacy',
		Modern: 'Modern'
	};
	if (!CommentsSpreadsheetFormat[format])
		return next(`Unexpected format: ${format}`)
	if (format === CommentsSpreadsheetFormat.MyProject) {
		if (!req.file)
			return next('Missing file')
		return exportResolutionsForMyProject(ballot_id, Filename, req.file, res).catch(err => next(err))
	}
	else {
		let isLegacy;
		if (format === CommentsSpreadsheetFormat.Legacy)
			isLegacy = true;
		else if (format === CommentsSpreadsheetFormat.Modern)
			isLegacy = false;
		else
			return next(`Invalid parameter format ${format}`)
		if (!Style)
			return next('Missing parameter Style')
		return exportSpreadsheet(user, ballot_id, Filename, isLegacy, Style, req.file, res).catch(err => next(err))
	}
});

export default router;
