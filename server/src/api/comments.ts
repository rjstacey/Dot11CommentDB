/*
 * Comments API
 */
import { Request, Response, NextFunction, Router } from "express";
import { BadRequestError, ForbiddenError } from "../utils/index.js";
import { AccessLevel } from "../auth/access.js";
import {
	getComments,
	updateComments,
	setStartCommentId,
	deleteComments,
	importEpollComments,
	uploadComments,
	uploadUserComments,
	uploadPublicReviewComments,
} from "../services/comments.js";
import { exportResolutionsForMyProject } from "../services/myProjectSpreadsheets.js";
import { exportCommentsSpreadsheet } from "../services/commentsSpreadsheet.js";
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
} from "@schemas/comments.js";

function patchStartCommentId(req: Request, res: Response, next: NextFunction) {
	const access = req.permissions?.comments || AccessLevel.none;
	// Need admin privileges to change CIDs
	if (access < AccessLevel.admin) {
		next(
			new ForbiddenError(
				"Need admin privileges at the ballot level to change CIDs"
			)
		);
		return;
	}

	const ballot_id = req.ballot!.id;
	let uploadParams: CommentsUploadParams;
	try {
		uploadParams = commentsUploadParamsSchema.parse(req.body);
	} catch (error) {
		next(error);
		return;
	}
	const startCommentId = uploadParams.startCommentId || 1;

	setStartCommentId(req.user, ballot_id, startCommentId)
		.then((data) => res.json(data))
		.catch(next);
}

function postImport(req: Request, res: Response, next: NextFunction) {
	const access = req.permissions?.comments || AccessLevel.none;
	// Need admin privileges for import
	if (access < AccessLevel.admin) {
		next(
			new ForbiddenError(
				"Need admin privileges at the ballot level to import comments"
			)
		);
		return;
	}

	let params: CommentsUploadParams;
	try {
		params = commentsUploadParamsSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	const startCommentId = params.startCommentId || 1;

	importEpollComments(req.user, req.ballot!, startCommentId)
		.then((data) => res.json(data))
		.catch(next);
}

function postUpload(req: Request, res: Response, next: NextFunction) {
	const access = req.permissions?.comments || AccessLevel.none;
	// Need admin privileges for upload
	if (access < AccessLevel.admin) {
		next(
			new ForbiddenError(
				"Need admin privileges at the ballot level to upload comments"
			)
		);
		return;
	}

	let params: CommentsUploadParams;
	try {
		params = commentsUploadParamsSchema.parse(req.query);
	} catch (error) {
		next(error);
		return;
	}
	const startCommentId = params.startCommentId || 1;

	if (!req.body) {
		next(new TypeError("Missing file"));
		return;
	}
	let filename = "";
	const d = req.headers["content-disposition"];
	if (d) {
		const m = d.match(/filename="(.*)"/i);
		if (m) filename = m[1];
	}

	uploadComments(req.user, req.ballot!, startCommentId, filename, req.body)
		.then((data) => res.json(data))
		.catch(next);
}

function postUserUpload(req: Request, res: Response, next: NextFunction) {
	const access = req.permissions?.comments || AccessLevel.none;
	// Need admin privileges for upload
	if (access < AccessLevel.admin) {
		next(
			new ForbiddenError(
				"Need admin privileges at the ballot level to upload comments"
			)
		);
		return;
	}

	let params: CommentsUploadUserParams;
	try {
		params = commentsUploadUserParamsSchema.parse(req.query);
	} catch (error) {
		next(error);
		return;
	}

	if (!req.body) {
		next(new BadRequestError("Missing file"));
		return;
	}
	let filename = "";
	const d = req.headers["content-disposition"];
	if (d) {
		const m = d.match(/filename="(.*)"/i);
		if (m) filename = m[1];
	}

	uploadUserComments(req.user, req.ballot!, params.SAPIN, filename, req.body)
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
	if (access < AccessLevel.admin) {
		next(
			new ForbiddenError(
				"Need admin privileges at the ballot level to upload comments"
			)
		);
		return;
	}

	if (!req.body) {
		next(new BadRequestError("Missing file"));
		return;
	}
	let filename = "";
	const d = req.headers["content-disposition"];
	if (d) {
		const m = d.match(/filename="(.*)"/i);
		if (m) filename = m[1];
	}

	uploadPublicReviewComments(req.user, req.ballot!, filename, req.body)
		.then((data) => res.json(data))
		.catch(next);
}

function patchExport(req: Request, res: Response, next: NextFunction) {
	const access = req.permissions?.comments || AccessLevel.none;
	if (access < AccessLevel.ro) {
		next(
			new ForbiddenError(
				"Need at least read-only privileges at the ballot level to export comments"
			)
		);
		return;
	}

	let params: CommentsExportParams;
	try {
		params = commentsExportParamsSchema.parse(req.query);
	} catch (error) {
		next(error);
		return;
	}

	if (params.format === "myproject") {
		if (!req.body) {
			next(new BadRequestError("Missing file"));
			return;
		}
		exportResolutionsForMyProject(req.ballot!.id, req.body, res)
			.then(() => res.end())
			.catch(next);
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
			req.body,
			res
		)
			.then(() => res.end())
			.catch(next);
	}
}

function getAll(req: Request, res: Response, next: NextFunction) {
	const access = req.permissions?.comments || AccessLevel.none;
	if (access < AccessLevel.ro) {
		next(
			new ForbiddenError(
				"Need at least read-only privileges at the ballot level to get comments"
			)
		);
		return;
	}

	let query: CommentResolutionQuery;
	try {
		query = commentResolutionQuerySchema.parse(req.query);
	} catch (error) {
		next(error);
		return;
	}
	getComments(req.ballot!.id, query.modifiedSince)
		.then((data) => res.json(data))
		.catch(next);
}

function updateMany(req: Request, res: Response, next: NextFunction) {
	const access = req.permissions?.comments || AccessLevel.none;
	// Need at least read-only privileges to update comments; check for comment level privileges later
	if (access < AccessLevel.ro) {
		next(
			new ForbiddenError(
				"Need at least read-only privileges at the ballot level to update comments"
			)
		);
		return;
	}

	let query: CommentResolutionQuery;
	try {
		query = commentResolutionQuerySchema.parse(req.query);
	} catch (error) {
		next(error);
		return;
	}

	let updates: CommentUpdate[];
	try {
		updates = commentUpdatesSchema.parse(req.body);
	} catch (error) {
		next(error);
		return;
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
	if (access < AccessLevel.admin) {
		next(
			new ForbiddenError(
				"Need admin privileges at the ballot level to delete comments"
			)
		);
		return;
	}

	deleteComments(req.user, req.ballot!.id)
		.then((data) => res.json(data))
		.catch(next);
}

const router = Router();
router
	.patch("/startCommentId", patchStartCommentId)
	.post("/import", postImport)
	.post("/userUpload", postUserUpload)
	.post("/publicReviewUpload", postPublicReviewUpload)
	.post("/upload", postUpload)
	.patch("/export", patchExport);

router.route("/").get(getAll).patch(updateMany).delete(removeAll);

export default router;
