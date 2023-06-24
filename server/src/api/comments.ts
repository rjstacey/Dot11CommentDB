/*
 * Comments API
 *
 * For the comments routes, req includes the following
 *   ballot: Ballot	- The ballot associated with the comments
 *   group?: Group - The group associated with the ballot (if configured)
 *   workingGroup?: Group - The working group associated with the ballot (if configure)
 * 
 * GET /?modifiedSince
 *		Get list of comments for given ballot
 *		Query paramters:
 *			modifiedSince?: string - Optional ISO datetime.
 *		Return an array with all comments for a given ballot. If the modifiedSince parameter is provided, then returns comments for the given ballot
 *		that were modified after the modifiedSince timestamp.
 *
 * PATCH /?modifiedSince
 *		Update comments for a given ballot
 *		Query paramters:
 *			modifiedSince?: string - Optional ISO datetime
 *		Body is object with parameters:
 *			updates:array 			Array of objects with shape {id:any, changes:object}
 *			ballot_id				The ballot identifier
 *			modifiedSince:string 	Optional. Datetime in ISO format.
 *		Returns an array of comment resolution objects that were updated. If the modifiedSince parameter is provided, then additionally returns
 *		comment for the given ballot that were modified after the modifiedSince timestamp.
 *
 * DELETE /
 *		Delete all comments (and resolutions) for a given ballot
 *
 * PATCH /startCommentId
 *		Renumber comments
 *		Body is object with parameters:
 *			startCommentID: number 	The number to begin comment numbering from
 *		Returns an array of comment resolution objects that is the complete list of comment resolutions for the given ballot.
 *
 * POST /import
 * 		Replace existing comments (if any) with comments imported from an ePoll ballot. The associated ballot must have an ePoll number configured.
 *		Returns an array of comment resolution objects that is the complete list of comment resolutions for the identified ballot.
 *
 * POST /upload
 *		Replace existing comments (if any) with comments from a file
 *		Multipart body parameters:
 *			The spreadsheet file
 *			params - a JSON object {startCommentId?: number}
 *		The format of the spreadsheet file is determined by the ballot type.
 *		For an SA ballot, the file is MyProject format.
 *		For WG ballot, the file is ePoll comments .csv file.
 *		Returns an array of comment resolution objects that is the complete list of comment resolutions for the identified ballot.
 *
 * POST /export?format
 *		Export comments for the given ballot in specified format.
 *		Query parameters:
 *			format: 'myproject' | 'legacy' | 'modern' -- format for the exported spreadsheet
 *		Multipart body parameters:
 *			spreadsheet file - optional for @format == 'legacy' and @format == 'modern', mandatory for @format == 'myproject'
 *			params - JSON object with shape style: string}
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
	validUpdates
} from '../services/comments';
import { exportResolutionsForMyProject } from '../services/myProjectSpreadsheets';
import { exportCommentsSpreadsheet, commentSpreadsheetStyles, CommentSpreadsheetStyle } from '../services/commentsSpreadsheet';

const upload = Multer();
const router = Router();

function validUploadParams(params: any): params is {startCommentId?: number} {
	return isPlainObject(params) &&
		typeof params.startCommentId === 'undefined' || typeof params.startCommentId === 'number';
}

function validateExportParams(params: any): asserts params is {style: CommentSpreadsheetStyle} {
	if (!isPlainObject(params) || !commentSpreadsheetStyles.includes(params.style))
		throw new TypeError(`Bad body; extected params to be object with shape {style: ${commentSpreadsheetStyles.map(s => '"' + s + '"').join(" | ")}}`);
}

const commentsSpreadsheetFormats = ["legacy", "modern", "myproject"] as const;
type CommentsSpreadsheetForamt = typeof commentsSpreadsheetFormats[number];
const validCommentSpreadsheetFormat = (format: any): format is CommentsSpreadsheetForamt => commentsSpreadsheetFormats.includes(format);

router
	.all('*', (req, res, next) => {
		const access = req.permissions?.comments || AccessLevel.none;
		if (req.method === "GET" && access >= AccessLevel.ro)
			return next();
		// Need read-only privileges to export comments
		if (req.method === "POST" && req.path.search(/^\/export/i) >= 0 && access >= AccessLevel.ro)
			return next();
		// Need read-write privileges to update comments
		if (req.method === "PATCH" && access >= AccessLevel.rw)
			return next();
		// Need admin privileges to delete or add comments
		if ((req.method === "DELETE" || req.method === "POST") && access >= AccessLevel.admin)
			return next();
		res.status(403).send('Insufficient karma');
	})
	.patch('/startCommentId', (req, res, next) => {
		const ballot_id = req.ballot!.id;
		if (!validUploadParams(req.body))
			return next(new TypeError("Bad body; expected object with shape {startCommentId?: number}"));
		const startCommentId = req.body.startCommentId || 1;
		setStartCommentId(req.user, ballot_id, startCommentId)
			.then(data => res.json(data))
			.catch(next);
	})
	.post('/import', (req, res, next) => {
		const ballot = req.ballot!;
		if (!validUploadParams(req.body))
			return next(new TypeError("Bad body; expected object with shape {startCommentId?: number}"));
		const startCommentId = req.body.startCommentId || 1;
		importEpollComments(req.user, ballot, startCommentId)
			.then(data => res.json(data))
			.catch(next);
	})
	.post('/upload', upload.single('CommentsFile'), (req, res, next) => {
		let params: any;
		try {
			if (typeof req.body.params !== 'string')
				throw new TypeError("Bad multipart body; expected part params to contain JSON string");
			params = JSON.parse(req.body.params);
			if (!validUploadParams(params))
				throw new TypeError("Bad multipart body; expected params part to be JSON object with shape {startCommentId?: number}");
		}
		catch (error) {
			return next(error);
		}

		if (!req.file)
			return next(new TypeError("Bad multipart body; missing file"));

		const startCommentId = params.startCommentId || 1;
		uploadComments(req.user, req.ballot!, startCommentId, req.file)
			.then(data => res.json(data))
			.catch(next);
	})
	.post('/export', upload.single('file'), (req, res, next) => {
		let format: CommentsSpreadsheetForamt = "legacy";
		if (typeof req.query.format === 'string') {
			let formatIn = req.query.format.toLowerCase();
			if (!validCommentSpreadsheetFormat(formatIn))
				return next(new TypeError("Invalid format; expected one of " + commentsSpreadsheetFormats.join(", ")));
			format = formatIn;
		}

		if (format === "myproject") {
			if (!req.file)
				return next(new TypeError('Missing file'));
			exportResolutionsForMyProject(req.ballot!.id, req.file, res)
				.then(() => res.end())
				.catch(err => next(err));
		}
		else {
			let params: any;
			try {
				if (typeof req.body.params !== 'string')
					throw new TypeError("Bad multipart body; expected part params to contain JSON string");
				params = JSON.parse(req.body.params);
				validateExportParams(params);
			}
			catch (error) {
				return next(error);
			}
			const isLegacy = format === "legacy";
			exportCommentsSpreadsheet(req.user, req.ballot!, isLegacy, params.style, req.file, res)
				.then(() => res.end())
				.catch(err => next(err));
		}
	})
	.route('/')
		.get((req, res, next) => {
			const modifiedSince = typeof req.query.modifiedSince === 'string'? req.query.modifiedSince: undefined;
			getComments(req.ballot!.id, modifiedSince)
				.then(data => res.json(data))
				.catch(next)
		})
		.patch((req, res, next) => {
			const modifiedSince = typeof req.query.modifiedSince === 'string'? req.query.modifiedSince: undefined;
			const updates = req.body;
			if (!validUpdates(updates))
				return next(new TypeError('Bad or missing updates; expected an array of objects with shape {id, changes}'));
			updateComments(req.user, req.ballot!.id, updates, modifiedSince)
				.then(data => res.json(data))
				.catch(next);
		})
		.delete((req, res, next) => {
			deleteComments(req.user, req.ballot!.id)
				.then(data => res.json(data))
				.catch(next);
		})


export default router;
