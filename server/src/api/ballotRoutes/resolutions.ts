/*
 * Resolutions API
 */
import { Request, Response, NextFunction, Router } from "express";
import { BadRequestError, ForbiddenError } from "@/utils/index.js";
import { AccessLevel } from "@schemas/access.js";
import { commentResolutionQuerySchema } from "@schemas/comments.js";
import { resolutionsUploadParamsSchema } from "@schemas/uploadResolutions.js";
import {
	resolutionCreatesSchema,
	resolutionIdsSchema,
	resolutionUpdatesSchema,
} from "@schemas/resolutions.js";
import {
	addResolutions,
	updateResolutions,
	deleteResolutions,
} from "@/services/resolutions.js";
import { uploadResolutions } from "@/services/uploadResolutions.js";

async function addMany(req: Request, res: Response, next: NextFunction) {
	try {
		const access = req.permissions?.comments || AccessLevel.none;
		// Need at least read-only privileges at the ballot level to add a resolution. Check for comment level privileges later.
		if (access < AccessLevel.ro) {
			throw new ForbiddenError(
				"Need at least read-only privileges at the ballot level to add a resolution"
			);
		}
		const ballot_id = req.ballot!.id;
		const query = commentResolutionQuerySchema.parse(req.query);
		const { modifiedSince } = query;
		const resolutions = resolutionCreatesSchema.parse(req.body);
		const data = await addResolutions(
			req.user,
			ballot_id,
			access,
			resolutions,
			modifiedSince
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function updateMany(req: Request, res: Response, next: NextFunction) {
	try {
		const access = req.permissions?.comments || AccessLevel.none;
		// Need at least read-only privileges at the ballot level to add a resolution. Check for comment level or resolution level
		// privileges later.
		if (access < AccessLevel.ro) {
			throw new ForbiddenError(
				"Need at least read-only privileges at the ballot level to update a resolution"
			);
		}
		const ballot_id = req.ballot!.id;
		const query = commentResolutionQuerySchema.parse(req.query);
		const { modifiedSince } = query;
		const updates = resolutionUpdatesSchema.parse(req.body);
		const data = await updateResolutions(
			req.user,
			ballot_id,
			access,
			updates,
			modifiedSince
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function removeMany(req: Request, res: Response, next: NextFunction) {
	try {
		const access = req.permissions?.comments || AccessLevel.none;
		// Need at least read-only privileges at the ballot level to delete a resolution. Check for comment level privileges later.
		if (access < AccessLevel.ro)
			throw new ForbiddenError(
				"Need at least read-only privileges at the ballot level to delete a resolution"
			);
		const ballot_id = req.ballot!.id;
		const query = commentResolutionQuerySchema.parse(req.query);
		const { modifiedSince } = query;
		const ids = resolutionIdsSchema.parse(req.body);
		const data = await deleteResolutions(
			req.user,
			ballot_id,
			access,
			ids,
			modifiedSince
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function uploadMany(req: Request, res: Response, next: NextFunction) {
	try {
		const access = req.permissions?.comments || AccessLevel.none;
		if (access < AccessLevel.rw) {
			throw new ForbiddenError(
				"Need at least read-write privileges at the ballot level to upload resolutions"
			);
		}
		const ballot_id = req.ballot!.id;

		const params = resolutionsUploadParamsSchema.parse(req.query);
		if (!Array.isArray(params.toUpdate))
			params.toUpdate = [params.toUpdate];

		if (!req.body) throw new BadRequestError("Missing file");
		let filename = "";
		const d = req.headers["content-disposition"];
		if (d) {
			const m = d.match(/filename="(.*)"/i);
			if (m) filename = m[1];
		}

		const data = await uploadResolutions(
			req.user,
			ballot_id,
			params.toUpdate,
			params.matchAlgorithm,
			params.matchUpdate,
			params.sheetName,
			filename,
			req.body
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

const router = Router();
router
	.post("/upload", uploadMany)
	.route("/")
	.post(addMany)
	.patch(updateMany)
	.delete(removeMany);

export default router;
