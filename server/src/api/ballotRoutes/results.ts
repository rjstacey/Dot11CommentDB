/*
 * Ballot results API
 */
import { Request, Response, NextFunction, Router } from "express";
import {
	ForbiddenError,
	NotFoundError,
	BadRequestError,
} from "@/utils/index.js";
import { AccessLevel } from "@schemas/access.js";
import { selectWorkingGroup } from "@/services/groups.js";
import { resultUpdatesSchema } from "@schemas/results.js";
import {
	getResults,
	updateResults,
	deleteResults,
	importEpollResults,
	uploadResults,
	exportResults,
} from "@/services/results.js";

function workingGroupOrThrow(req: Request) {
	const workingGroup = selectWorkingGroup(req.groups!);
	if (!workingGroup) {
		throw new NotFoundError(
			`Can't find working group for ${req.groups![0].id}`
		);
	}
	return workingGroup;
}

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

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	const access = req.permissions?.results || AccessLevel.none;
	if (req.method === "GET" && access >= AccessLevel.ro) return next();
	const grant =
		(req.method === "DELETE" ||
			req.method === "POST" ||
			req.method === "PATCH") &&
		access >= AccessLevel.admin;
	if (grant) {
		next();
		return;
	}

	next(new ForbiddenError());
}

async function getAll(req: Request, res: Response, next: NextFunction) {
	try {
		const data = await getResults(req.ballot!);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function updateMany(req: Request, res: Response, next: NextFunction) {
	try {
		const workingGroup = workingGroupOrThrow(req);
		const updates = resultUpdatesSchema.parse(req.body);
		const data = await updateResults(workingGroup.id, req.ballot!, updates);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function removeAll(req: Request, res: Response, next: NextFunction) {
	try {
		const data = await deleteResults(req.ballot!.id);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function postUpload(req: Request, res: Response, next: NextFunction) {
	try {
		const { filename, buffer } = fileBufferOrThrow(req);
		const data = await uploadResults(req.ballot!, filename, buffer);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function postImport(req: Request, res: Response, next: NextFunction) {
	try {
		const workingGroup = workingGroupOrThrow(req);
		const data = await importEpollResults(
			req.user,
			workingGroup,
			req.ballot!
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function getExport(req: Request, res: Response, next: NextFunction) {
	try {
		const { forSeries } = req.query;
		if (forSeries && forSeries !== "true" && forSeries !== "false") {
			next(
				new BadRequestError(
					"Invalid forSeries parameter: expected true or false"
				)
			);
			return;
		}
		await exportResults(req.user, req.ballot!, forSeries === "true", res);
		res.end();
	} catch (error) {
		next(error);
	}
}

const router = Router();

router.all(/(.*)/, validatePermissions);
router
	.get("/export", getExport)
	.post("/import", postImport)
	.post("/upload", postUpload);
router.route("/").get(getAll).patch(updateMany).delete(removeAll);

export default router;
