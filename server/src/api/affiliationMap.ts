import { Request, Response, NextFunction, Router } from "express";
import {
	affiliationMapCreatesSchema,
	affiliationMapUpdatesSchema,
	affiliationMapIdsSchema,
	AffiliationMapCreate,
	AffiliationMapUpdate,
} from "../schemas/affiliationMap";
import {
	getAffiliationMaps,
	updateAffiliationMaps,
	addAffiliationMaps,
	removeAffiliationMaps,
} from "../services/affiliationMap";

function getAll(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	getAffiliationMaps(group)
		.then((data) => res.json(data))
		.catch(next);
}

function addMany(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	let affiliationMaps: AffiliationMapCreate[];
	try {
		affiliationMaps = affiliationMapCreatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	addAffiliationMaps(group, affiliationMaps)
		.then((data) => res.json(data))
		.catch(next);
}

function updateMany(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	let updates: AffiliationMapUpdate[];
	try {
		updates = affiliationMapUpdatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	updateAffiliationMaps(group, updates)
		.then((data) => res.json(data))
		.catch(next);
}

function removeMany(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	let ids: number[];
	try {
		ids = affiliationMapIdsSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	removeAffiliationMaps(group, ids)
		.then((data) => res.json(data))
		.catch(next);
}

const router = Router();
router
	.route("/")
	.get(getAll)
	.post(addMany)
	.patch(updateMany)
	.delete(removeMany);

export default router;
