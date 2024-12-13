/*
 * Groups API
 *
 */
import { Request, Response, NextFunction, Router } from "express";
import {
	groupCreatesSchema,
	groupUpdatesSchema,
	groupIdsSchema,
	groupsQuerySchema,
} from "@schemas/groups";
import {
	getGroups,
	addGroups,
	updateGroups,
	removeGroups,
} from "../services/groups";

async function get(req: Request, res: Response, next: NextFunction) {
	const { user } = req;
	const { parentName } = req.params;
	try {
		let query = groupsQuerySchema.parse(req.query);
		query = { ...query, parentName };
		const data = await getGroups(user, query);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function addMany(req: Request, res: Response, next: NextFunction) {
	try {
		const groups = groupCreatesSchema.parse(req.body);
		const data = await addGroups(req.user, groups);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function removeMany(req: Request, res: Response, next: NextFunction) {
	try {
		const ids = groupIdsSchema.parse(req.body);
		const data = await removeGroups(req.user, ids);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function updateMany(req: Request, res: Response, next: NextFunction) {
	try {
		const updates = groupUpdatesSchema.parse(req.body);
		const data = await updateGroups(req.user, updates);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

const router = Router();
router.get("/:parentName?", get);
router.route("/").post(addMany).patch(updateMany).delete(removeMany);

export default router;
