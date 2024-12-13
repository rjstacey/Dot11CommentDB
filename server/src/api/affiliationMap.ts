import { Request, Response, NextFunction, Router } from "express";
import {
	affiliationMapCreatesSchema,
	affiliationMapUpdatesSchema,
	affiliationMapIdsSchema,
} from "@schemas/affiliationMap";
import {
	getAffiliationMaps,
	updateAffiliationMaps,
	addAffiliationMaps,
	removeAffiliationMaps,
} from "../services/affiliationMap";

async function getAll(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	try {
		const data = await getAffiliationMaps(group);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function addMany(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	try {
		const affiliationMaps = affiliationMapCreatesSchema.parse(req.body);
		const data = await addAffiliationMaps(group, affiliationMaps);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function updateMany(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	try {
		const updates = affiliationMapUpdatesSchema.parse(req.body);
		const data = await updateAffiliationMaps(group, updates);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function removeMany(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	try {
		const ids = affiliationMapIdsSchema.parse(req.body);
		const data = await removeAffiliationMaps(group, ids);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

const router = Router();
router
	.route("/")
	.get(getAll)
	.post(addMany)
	.patch(updateMany)
	.delete(removeMany);

export default router;
