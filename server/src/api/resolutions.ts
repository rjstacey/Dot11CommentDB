/*
 * Resolutions API
 */
import { Request, Response, NextFunction, Router } from "express";
import { BadRequestError, ForbiddenError } from "../utils/index.js";
import { AccessLevel } from "../auth/access.js";
import {
	commentResolutionQuerySchema,
	CommentResolutionQuery,
} from "@schemas/comments.js";
import {
	resolutionsUploadParamsSchema,
	type ResolutionsUploadParams,
} from "@schemas/uploadResolutions.js";
import {
	ResolutionCreate,
	ResolutionUpdate,
	resolutionCreatesSchema,
	resolutionIdsSchema,
	resolutionUpdatesSchema,
} from "@schemas/resolutions.js";
import {
	addResolutions,
	updateResolutions,
	deleteResolutions,
} from "../services/resolutions.js";
import { uploadResolutions } from "../services/uploadResolutions.js";

function addMany(req: Request, res: Response, next: NextFunction) {
	const access = req.permissions?.comments || AccessLevel.none;
	// Need at least read-only privileges at the ballot level to add a resolution. Check for comment level privileges later.
	if (access < AccessLevel.ro) {
		next(
			new ForbiddenError(
				"Need at least read-only privileges at the ballot level to add a resolution"
			)
		);
		return;
	}
	const ballot_id = req.ballot!.id;
	let query: CommentResolutionQuery;
	try {
		query = commentResolutionQuerySchema.parse(req.query);
	} catch (error) {
		return next(error);
	}
	let resolutions: ResolutionCreate[];
	try {
		resolutions = resolutionCreatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	addResolutions(
		req.user,
		ballot_id,
		access,
		resolutions,
		query.modifiedSince
	)
		.then((data) => res.json(data))
		.catch(next);
}

function updateMany(req: Request, res: Response, next: NextFunction) {
	const access = req.permissions?.comments || AccessLevel.none;
	// Need at least read-only privileges at the ballot level to add a resolution. Check for comment level or resolution level
	// privileges later.
	if (access < AccessLevel.ro)
		return next(
			new ForbiddenError(
				"Need at least read-only privileges at the ballot level to update a resolution"
			)
		);
	const ballot_id = req.ballot!.id;
	let query: CommentResolutionQuery;
	try {
		query = commentResolutionQuerySchema.parse(req.query);
	} catch (error) {
		return next(error);
	}
	let updates: ResolutionUpdate[];
	try {
		updates = resolutionUpdatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	updateResolutions(req.user, ballot_id, access, updates, query.modifiedSince)
		.then((data) => res.json(data))
		.catch(next);
}

function removeMany(req: Request, res: Response, next: NextFunction) {
	const access = req.permissions?.comments || AccessLevel.none;
	// Need at least read-only privileges at the ballot level to delete a resolution. Check for comment level privileges later.
	if (access < AccessLevel.ro)
		return next(
			new ForbiddenError(
				"Need at least read-only privileges at the ballot level to delete a resolution"
			)
		);
	const ballot_id = req.ballot!.id;
	let query: CommentResolutionQuery;
	try {
		query = commentResolutionQuerySchema.parse(req.query);
	} catch (error) {
		return next(error);
	}
	let ids: string[];
	try {
		ids = resolutionIdsSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	deleteResolutions(req.user, ballot_id, access, ids, query.modifiedSince)
		.then((data) => res.json(data))
		.catch(next);
}

function uploadMany(req: Request, res: Response, next: NextFunction) {
	const access = req.permissions?.comments || AccessLevel.none;
	if (access < AccessLevel.rw) {
		next(
			new ForbiddenError(
				"Need at least read-write privileges at the ballot level to upload resolutions"
			)
		);
		return;
	}
	const ballot_id = req.ballot!.id;

	let params: ResolutionsUploadParams;
	try {
		params = resolutionsUploadParamsSchema.parse(req.query);
	} catch (error) {
		return next(error);
	}
	if (!Array.isArray(params.toUpdate)) params.toUpdate = [params.toUpdate];

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

	uploadResolutions(
		req.user,
		ballot_id,
		params.toUpdate,
		params.matchAlgorithm,
		params.matchUpdate,
		params.sheetName,
		filename,
		req.body
	)
		.then((data) => res.json(data))
		.catch(next);
}

const router = Router();
router
	.post("/upload", uploadMany)
	.route("/")
	.post(addMany)
	.patch(updateMany)
	.delete(removeMany);

export default router;
