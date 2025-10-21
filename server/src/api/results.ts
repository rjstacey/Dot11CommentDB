/*
 * Ballot results API
 */
import { Request, Response, NextFunction, Router } from "express";
import {
	ForbiddenError,
	NotFoundError,
	BadRequestError,
} from "../utils/index.js";
import { AccessLevel } from "../auth/access.js";
import { selectWorkingGroup } from "../services/groups.js";
import { resultUpdatesSchema, ResultUpdate } from "@schemas/results.js";
import {
	getResults,
	updateResults,
	deleteResults,
	importEpollResults,
	uploadResults,
	exportResults,
} from "../services/results.js";

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	const access = req.permissions?.results || AccessLevel.none;
	if (req.method === "GET" && access >= AccessLevel.ro) return next();
	if (
		(req.method === "DELETE" ||
			req.method === "POST" ||
			req.method === "PATCH") &&
		access >= AccessLevel.admin
	)
		return next();

	next(new ForbiddenError());
}

function getAll(req: Request, res: Response, next: NextFunction) {
	getResults(req.ballot!)
		.then((data) => res.json(data))
		.catch(next);
}

function updateMany(req: Request, res: Response, next: NextFunction) {
	const workingGroup = selectWorkingGroup(req.groups!);
	if (!workingGroup) {
		next(
			new NotFoundError(
				`Can't find working group for ${req.groups![0].id}`
			)
		);
		return;
	}

	let updates: ResultUpdate[];
	try {
		updates = resultUpdatesSchema.parse(req.body);
	} catch (error) {
		next(error);
		return;
	}

	updateResults(workingGroup.id, req.ballot!, updates)
		.then((data) => res.json(data))
		.catch(next);
}

function removeAll(req: Request, res: Response, next: NextFunction) {
	deleteResults(req.ballot!.id)
		.then((data) => res.json(data))
		.catch(next);
}

function postUpload(req: Request, res: Response, next: NextFunction) {
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
	uploadResults(req.ballot!, filename, req.body)
		.then((data) => res.json(data))
		.catch(next);
}

function postImport(req: Request, res: Response, next: NextFunction) {
	const workingGroup = selectWorkingGroup(req.groups!);
	if (!workingGroup) {
		next(
			new NotFoundError(
				`Can't find working group for ${req.groups![0].id}`
			)
		);
		return;
	}

	importEpollResults(req.user, workingGroup, req.ballot!)
		.then((data) => res.json(data))
		.catch(next);
}

function getExport(req: Request, res: Response, next: NextFunction) {
	const { forSeries } = req.query;
	if (forSeries && forSeries !== "true" && forSeries !== "false") {
		next(
			new BadRequestError(
				"Invalid forSeries parameter: expected true or false"
			)
		);
		return;
	}
	exportResults(req.user, req.ballot!, forSeries === "true", res)
		.then(() => res.end())
		.catch(next);
}

const router = Router();

router.all(/(.*)/, validatePermissions);
router
	.get("/export", getExport)
	.post("/import", postImport)
	.post("/upload", postUpload);
router.route("/").get(getAll).patch(updateMany).delete(removeAll);

export default router;
