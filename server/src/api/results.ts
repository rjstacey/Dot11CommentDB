/*
 * Ballot results API
 *
 * For the comments routes, req includes the following
 *   ballot: Ballot	- The ballot associated with the results
 *   group?: Group - The group associated with the ballot (if configured)
 *   workingGroup?: Group - The working group associated with the ballot (if configure)
 *
 * GET /
 * 		Get results for a given ballot
 *		Returns an array of result objects that is the results for the speficied ballot
 *
 * DELETE /
 *		Delete results for a given ballot
 *		Returns the number of result objects deleted
 *
 * GET /export?forSeries={true|false}
 *		Get results for a given ballot as a spreadsheet
 *      Query parameters:
 *          forSeries: "true" | "false" -- If true, returns result for the ballot series (one sheet per ballot)
 *		Returns a spreadsheet file
 *
 * POST /import
 *		Import ballot results for a given ballot from ePoll
 *		Returns an array of result objects that is the results as imported
 *
 * POST /upload
 *		Upload ballot results for a given ballot from ePoll CSV file or MyProject ballot members spreadsheet
 *		Returns an array of result objects that is the results as uploaded
 */
import { Request, Response, NextFunction, Router } from "express";
import Multer from "multer";
import { ForbiddenError, NotFoundError } from "../utils/index.js";
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

	next(new ForbiddenError("Insufficient karma"));
}

function getAll(req: Request, res: Response, next: NextFunction) {
	getResults(req.ballot!)
		.then((data) => res.json(data))
		.catch(next);
}

function updateMany(req: Request, res: Response, next: NextFunction) {
	const workingGroup = selectWorkingGroup(req.groups!);
	if (!workingGroup)
		return next(
			new NotFoundError(
				`Can't find working group for ${req.groups![0].id}`
			)
		);

	let updates: ResultUpdate[];
	try {
		updates = resultUpdatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
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
	if (!req.file) return next(new TypeError("Missing file"));
	uploadResults(req.ballot!, req.file)
		.then((data) => res.json(data))
		.catch(next);
}

function postImport(req: Request, res: Response, next: NextFunction) {
	const workingGroup = selectWorkingGroup(req.groups!);
	if (!workingGroup)
		return next(
			new NotFoundError(
				`Can't find working group for ${req.groups![0].id}`
			)
		);

	importEpollResults(req.user, workingGroup, req.ballot!)
		.then((data) => res.json(data))
		.catch(next);
}

function getExport(req: Request, res: Response, next: NextFunction) {
	const { forSeries } = req.query;
	if (forSeries && forSeries !== "true" && forSeries !== "false")
		return next(
			new TypeError("Invalid forSeries parameter: expected true or false")
		);

	exportResults(req.user, req.ballot!, forSeries === "true", res)
		.then(() => res.end())
		.catch(next);
}

const upload = Multer();
const router = Router();

router.all(/(.*)/, validatePermissions);
router
	.get("/export", getExport)
	.post("/import", postImport)
	.post("/upload", upload.single("ResultsFile"), postUpload);
router.route("/").get(getAll).patch(updateMany).delete(removeAll);

export default router;
