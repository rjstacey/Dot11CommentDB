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
import { Request, Response, NextFunction, Router } from "express";
import Multer from "multer";
import { ForbiddenError, isPlainObject } from "../utils";
import { AccessLevel } from "../auth/access";
import {
	getComments,
	updateComments,
	setStartCommentId,
	deleteComments,
	importEpollComments,
	uploadComments,
	uploadUserComments,
	uploadPublicReviewComments,
} from "../services/comments";
import { exportResolutionsForMyProject } from "../services/myProjectSpreadsheets";
import { exportCommentsSpreadsheet } from "../services/commentsSpreadsheet";
import {
	CommentsUploadParams,
	CommentsUploadUserParams,
	commentUpdatesSchema,
	commentsUploadParamsSchema,
	commentsUploadUserParamsSchema,
	CommentUpdate,
	commentResolutionQuerySchema,
	CommentResolutionQuery,
	commentsExportParamsSchema,
	CommentsExportParams,
} from "../schemas/comments";

function patchStartCommentId(req: Request, res: Response, next: NextFunction) {
	const access = req.permissions?.comments || AccessLevel.none;
	// Need admin privileges to change CIDs
	if (access < AccessLevel.admin)
		return next(
			new ForbiddenError(
				"Need admin privileges at the ballot level to change CIDs"
			)
		);

	const ballot_id = req.ballot!.id;
	let uploadParams: CommentsUploadParams;
	try {
		uploadParams = commentsUploadParamsSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	const startCommentId = uploadParams.startCommentId || 1;

	setStartCommentId(req.user, ballot_id, startCommentId)
		.then((data) => res.json(data))
		.catch(next);
}

function postImport(req: Request, res: Response, next: NextFunction) {
	const access = req.permissions?.comments || AccessLevel.none;
	// Need admin privileges for import
	if (access < AccessLevel.admin)
		return next(
			new ForbiddenError(
				"Need admin privileges at the ballot level to import comments"
			)
		);

	const ballot = req.ballot!;
	let uploadParams: CommentsUploadParams;
	try {
		uploadParams = commentsUploadParamsSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	const startCommentId = uploadParams.startCommentId || 1;

	importEpollComments(req.user, ballot, startCommentId)
		.then((data) => res.json(data))
		.catch(next);
}

function postUpload(req: Request, res: Response, next: NextFunction) {
	const access = req.permissions?.comments || AccessLevel.none;
	// Need admin privileges for upload
	if (access < AccessLevel.admin)
		return next(
			new ForbiddenError(
				"Need admin privileges at the ballot level to upload comments"
			)
		);

	let uploadParams: CommentsUploadParams;
	try {
		if (typeof req.body.params !== "string")
			throw new TypeError(
				"Bad multipart body; expected part params to contain JSON string"
			);
		uploadParams = commentsUploadParamsSchema.parse(
			JSON.parse(req.body.params)
		);
	} catch (error) {
		return next(error);
	}
	const startCommentId = uploadParams.startCommentId || 1;

	if (!req.file)
		return next(new TypeError("Bad multipart body; missing file"));

	uploadComments(req.user, req.ballot!, startCommentId, req.file)
		.then((data) => res.json(data))
		.catch(next);
}

function postUserUpload(req: Request, res: Response, next: NextFunction) {
	const access = req.permissions?.comments || AccessLevel.none;
	// Need admin privileges for upload
	if (access < AccessLevel.admin)
		return next(
			new ForbiddenError(
				"Need admin privileges at the ballot level to upload comments"
			)
		);

	let params: CommentsUploadUserParams;
	try {
		if (typeof req.body.params !== "string")
			throw new TypeError(
				"Bad multipart body; expected part params to contain JSON string"
			);
		params = commentsUploadUserParamsSchema.parse(
			JSON.parse(req.body.params)
		);
	} catch (error) {
		return next(error);
	}

	if (!req.file)
		return next(new TypeError("Bad multipart body; missing file"));

	uploadUserComments(req.user, req.ballot!, params.SAPIN, req.file)
		.then((data) => res.json(data))
		.catch(next);
}

function postPublicReviewUpload(
	req: Request,
	res: Response,
	next: NextFunction
) {
	const access = req.permissions?.comments || AccessLevel.none;
	// Need admin privileges for upload
	if (access < AccessLevel.admin)
		return next(
			new ForbiddenError(
				"Need admin privileges at the ballot level to upload comments"
			)
		);

	if (!req.file)
		return next(new TypeError("Bad multipart body; missing file"));

	uploadPublicReviewComments(req.user, req.ballot!, req.file)
		.then((data) => res.json(data))
		.catch(next);
}

function postExport(req: Request, res: Response, next: NextFunction) {
	const access = req.permissions?.comments || AccessLevel.none;
	if (access < AccessLevel.ro)
		return next(
			new ForbiddenError(
				"Need at least read-only privileges at the ballot level to export comments"
			)
		);

	let params: CommentsExportParams;
	try {
		params = commentsExportParamsSchema.parse(req.query);
	} catch (error) {
		return next(error);
	}

	if (params.format === "myproject") {
		if (!req.file) return next(new TypeError("Missing file"));
		exportResolutionsForMyProject(req.ballot!.id, req.file, res)
			.then(() => res.end())
			.catch((err) => next(err));
	} else {
		const isLegacy = params.format === "legacy";
		const style = params.style || "AllComments";
		const appendSheets = params.appendSheets === "true";
		exportCommentsSpreadsheet(
			req.user,
			req.ballot!,
			isLegacy,
			style,
			appendSheets,
			req.file,
			res
		)
			.then(() => res.end())
			.catch((err) => next(err));
	}
}

function getAll(req: Request, res: Response, next: NextFunction) {
	const access = req.permissions?.comments || AccessLevel.none;
	if (access < AccessLevel.ro)
		return next(
			new ForbiddenError(
				"Need at least read-only privileges at the ballot level to get comments"
			)
		);

	let query: CommentResolutionQuery;
	try {
		query = commentResolutionQuerySchema.parse(req.query);
	} catch (error) {
		return next(error);
	}
	getComments(req.ballot!.id, query.modifiedSince)
		.then((data) => res.json(data))
		.catch(next);
}

function updateMany(req: Request, res: Response, next: NextFunction) {
	const access = req.permissions?.comments || AccessLevel.none;
	// Need at least read-only privileges to update comments; check for comment level privileges later
	if (access < AccessLevel.ro)
		return next(
			new ForbiddenError(
				"Need at least read-only privileges at the ballot level to update comments"
			)
		);

	let query: CommentResolutionQuery;
	try {
		query = commentResolutionQuerySchema.parse(req.query);
	} catch (error) {
		return next(error);
	}

	let updates: CommentUpdate[];
	try {
		updates = commentUpdatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}

	updateComments(
		req.user,
		req.ballot!.id,
		access,
		updates,
		query.modifiedSince
	)
		.then((data) => res.json(data))
		.catch(next);
}

function removeAll(req: Request, res: Response, next: NextFunction) {
	const access = req.permissions?.comments || AccessLevel.none;
	// Need admin privileges to delete comments
	if (access < AccessLevel.admin)
		return next(
			new ForbiddenError(
				"Need admin privileges at the ballot level to delete comments"
			)
		);

	deleteComments(req.user, req.ballot!.id)
		.then((data) => res.json(data))
		.catch(next);
}

const upload = Multer();
const router = Router();
router
	.patch("/startCommentId", patchStartCommentId)
	.post("/import", postImport)
	.post("/userUpload", upload.single("CommentsFile"), postUserUpload)
	.post(
		"/publicReviewUpload",
		upload.single("CommentsFile"),
		postPublicReviewUpload
	)
	.post("/upload", upload.single("CommentsFile"), postUpload)
	.post("/export", upload.single("file"), postExport);

router.route("/").get(getAll).patch(updateMany).delete(removeAll);

export default router;
