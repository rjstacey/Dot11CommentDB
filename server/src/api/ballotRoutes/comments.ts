/*
 * Comments API
 */
import { Request, Response, NextFunction, Router } from "express";
import { BadRequestError, ForbiddenError } from "@/utils/index.js";
import { AccessLevel } from "@schemas/access.js";
import {
	commentUpdatesSchema,
	commentsUploadParamsSchema,
	commentsUploadUserParamsSchema,
	commentResolutionQuerySchema,
	commentsExportParamsSchema,
} from "@schemas/comments.js";
import {
	getComments,
	updateComments,
	setStartCommentId,
	deleteComments,
	importEpollComments,
	uploadComments,
	uploadUserComments,
	uploadPublicReviewComments,
} from "@/services/comments.js";
import { exportResolutionsForMyProject } from "@/services/myProjectSpreadsheets.js";
import { exportCommentsSpreadsheet } from "@/services/commentsSpreadsheet.js";

function fileBufferOrThrow(req: Request): { filename: string; buffer: Buffer } {
	if (!req.body) throw new BadRequestError("Missing file");
	let filename: string;
	const d = req.headers["content-disposition"];
	if (d) {
		const m = d.match(/filename="(.*)"/i);
		if (m) {
			filename = m[1];
			return { filename, buffer: req.body };
		}
	}
	throw new BadRequestError("Missing filename");
}

async function patchStartCommentId(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const access = req.permissions?.comments || AccessLevel.none;
		if (access < AccessLevel.admin) {
			throw new ForbiddenError(
				"Need admin privileges at the ballot level to change CIDs"
			);
		}

		const ballot_id = req.ballot!.id;

		const params = commentsUploadParamsSchema.parse(req.body);
		const startCommentId = params.startCommentId || 1;
		const data = await setStartCommentId(
			req.user,
			ballot_id,
			startCommentId
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function postImport(req: Request, res: Response, next: NextFunction) {
	try {
		const access = req.permissions?.comments || AccessLevel.none;
		if (access < AccessLevel.admin) {
			throw new ForbiddenError(
				"Need admin privileges at the ballot level to import comments"
			);
		}

		const params = commentsUploadParamsSchema.parse(req.body);
		const startCommentId = params.startCommentId || 1;
		const data = await importEpollComments(
			req.user,
			req.ballot!,
			startCommentId
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function postUpload(req: Request, res: Response, next: NextFunction) {
	try {
		const access = req.permissions?.comments || AccessLevel.none;
		if (access < AccessLevel.admin) {
			throw new ForbiddenError(
				"Need admin privileges at the ballot level to upload comments"
			);
		}

		const params = commentsUploadParamsSchema.parse(req.query);
		const startCommentId = params.startCommentId || 1;
		const { filename, buffer } = fileBufferOrThrow(req);
		const data = await uploadComments(
			req.user,
			req.ballot!,
			startCommentId,
			filename,
			buffer
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function postUserUpload(req: Request, res: Response, next: NextFunction) {
	try {
		const access = req.permissions?.comments || AccessLevel.none;
		if (access < AccessLevel.admin) {
			throw new ForbiddenError(
				"Need admin privileges at the ballot level to upload comments"
			);
		}

		const params = commentsUploadUserParamsSchema.parse(req.query);
		const { filename, buffer } = fileBufferOrThrow(req);
		const data = await uploadUserComments(
			req.user,
			req.ballot!,
			params.SAPIN,
			filename,
			buffer
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function postPublicReviewUpload(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const access = req.permissions?.comments || AccessLevel.none;
		// Need admin privileges for upload
		if (access < AccessLevel.admin) {
			throw new ForbiddenError(
				"Need admin privileges at the ballot level to upload comments"
			);
		}

		const { filename, buffer } = fileBufferOrThrow(req);
		const data = await uploadPublicReviewComments(
			req.user,
			req.ballot!,
			filename,
			buffer
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function patchExport(req: Request, res: Response, next: NextFunction) {
	try {
		const access = req.permissions?.comments || AccessLevel.none;
		if (access < AccessLevel.ro) {
			throw new ForbiddenError(
				"Need at least read-only privileges at the ballot level to export comments"
			);
		}

		const params = commentsExportParamsSchema.parse(req.query);
		if (params.format === "myproject") {
			const { buffer } = fileBufferOrThrow(req);
			await exportResolutionsForMyProject(req.ballot!.id, buffer, res);
		} else {
			const isLegacy = params.format === "legacy";
			const style = params.style || "AllComments";
			const appendSheets = params.appendSheets === "true";
			const buffer = req.body;
			await exportCommentsSpreadsheet(
				req.user,
				req.ballot!,
				isLegacy,
				style,
				appendSheets,
				buffer,
				res
			);
		}
	} catch (error) {
		next(error);
	}
}

async function getAll(req: Request, res: Response, next: NextFunction) {
	try {
		const access = req.permissions?.comments || AccessLevel.none;
		if (access < AccessLevel.ro) {
			throw new ForbiddenError(
				"Need at least read-only privileges at the ballot level to get comments"
			);
		}

		const query = commentResolutionQuerySchema.parse(req.query);
		const data = await getComments(req.ballot!.id, query.modifiedSince);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function updateMany(req: Request, res: Response, next: NextFunction) {
	try {
		const access = req.permissions?.comments || AccessLevel.none;
		// Need at least read-only privileges to update comments; check for comment level privileges later
		if (access < AccessLevel.ro) {
			throw new ForbiddenError(
				"Need at least read-only privileges at the ballot level to update comments"
			);
		}
		const query = commentResolutionQuerySchema.parse(req.query);
		const { modifiedSince } = query;
		const updates = commentUpdatesSchema.parse(req.body);

		const data = await updateComments(
			req.user,
			req.ballot!.id,
			access,
			updates,
			modifiedSince
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function removeAll(req: Request, res: Response, next: NextFunction) {
	try {
		const access = req.permissions?.comments || AccessLevel.none;
		if (access < AccessLevel.admin) {
			throw new ForbiddenError(
				"Need admin privileges at the ballot level to delete comments"
			);
		}

		const data = await deleteComments(req.user, req.ballot!.id);
		res.json(data);
	} catch (error) {
		next(error);
	}
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
