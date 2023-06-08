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
import { isPlainObject } from '../utils';
import { AccessLevel } from '../auth/access';
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

router
	.all('*', (req, res, next) => {
		const access = req.group?
			req.group.permissions.comments:
			req.workingGroup?.permissions.comments || AccessLevel.none;
		if (req.method === "GET" && access >= AccessLevel.ro)
			return next();
		if (req.method === "PATCH" && access >= AccessLevel.rw)
			return next();
		if ((req.method === "DELETE" || req.method === "POST") && access >= AccessLevel.admin)
			return next();
		res.status(403).send('Insufficient karma');
	})
	.route('/')
		.get((req, res, next) => {
			const ballot_id = req.ballot!.id;
			const modifiedSince = typeof req.query.modifiedSince === 'string'? req.query.modifiedSince: undefined;
			getComments(ballot_id, modifiedSince)
				.then(data => res.json(data))
				.catch(next)
		})
		.patch((req, res, next) => {
			const ballot_id = req.ballot!.id;
			const modifiedSince = typeof req.query.modifiedSince === 'string'? req.query.modifiedSince: undefined;
			updateComments(req.user, ballot_id, req.body, modifiedSince)
				.then(data => res.json(data))
				.catch(next);
		})
		.delete((req, res, next) => {
			const ballot_id = req.ballot!.id;
			deleteComments(req.user, ballot_id)
				.then(data => res.json(data))
				.catch(next);
		})

router.patch('/startCommentId', async (req, res, next) => {
	const ballot_id = req.ballot!.id;
	if (!isPlainObject(req.body) || typeof req.body.StartCommentID !== 'number')
		return next(new TypeError("Expected body with shape {StartCommentID: number}"));
	const {StartCommentID} = req.body;
	setStartCommentId(req.user, ballot_id, StartCommentID)
		.then(data => res.json(data))
		.catch(next);
});

router.post('/importFromEpoll/:epollNum(\\d+)', async (req, res, next) => {
	const ballot_id = req.ballot!.id;
	const epollNum = Number(req.params.epollNum);
	if (!isPlainObject(req.body) || ('StartCID' in req.body && typeof req.body.StartCID !== 'number'))
		return next(new TypeError("Expected body with shape {StartCID?: number}"));
	const startCommentId = req.body.StartCID || 1;
	importEpollComments(req.user, ballot_id, epollNum, startCommentId)
		.then(data => res.json(data))
		.catch(next);
});

router.post('/upload', upload.single('CommentsFile'), async (req, res, next) => {
	const ballot_id = req.ballot!.id;
	if (!req.file)
		return next(new TypeError('Missing file'));
	if (!isPlainObject(req.body) || ('StartCID' in req.body && typeof req.body.StartCID !== 'number'))
		return next(new TypeError("Expected body with shape {StartCID?: number}"));
	const startCommentId = req.body.StartCID || 1;
	uploadComments(req.user, ballot_id, startCommentId, req.file)
		.then(data => res.json(data))
		.catch(next);
});

const commentSpreadsheetFormats = ["myproject", "legacy", "modern"] as const;
type CommentSpreadsheetFormat = typeof commentSpreadsheetFormats[number];
const validCommentSpreadsheetFormat = (f: any): f is CommentSpreadsheetFormat => commentSpreadsheetFormats.includes(f);

router.post('/export/:format', upload.single('file'), (req, res, next) => {
	const ballot_id = req.ballot!.id;
	const format = req.params.format.toLowerCase();
	if (!validCommentSpreadsheetFormat(format))
		return next(new TypeError(`Unexpected format: ${format}. Expect one of ${commentSpreadsheetFormats.join(', ')}.`));
	const {Filename, Style} = JSON.parse(req.body.params);
	if (format === "myproject") {
		if (!req.file)
			return next(new TypeError('Missing file'));
		exportResolutionsForMyProject(ballot_id, Filename, req.file, res)
			.catch(err => next(err));
	}
	else {
		let isLegacy = format === 'legacy';
		if (!Style)
			return next(new TypeError('Missing parameter Style'));
		exportSpreadsheet(req.user, ballot_id, Filename, isLegacy, Style, req.file, res)
			.catch(err => next(err));
	}
});

export default router;
