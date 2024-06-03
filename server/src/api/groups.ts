/*
 * Groups API
 *
 */
import { Request, Response, NextFunction, Router } from "express";
import {
	groupCreatesSchema,
	groupUpdatesSchema,
	groupIdsSchema,
	GroupUpdate,
	GroupCreate,
} from "../schemas/groups";
import {
	getGroups,
	addGroups,
	updateGroups,
	removeGroups,
} from "../services/groups";

function get(req: Request, res: Response, next: NextFunction) {
	const { parentName } = req.params;
	getGroups(req.user, { parentName, ...req.query })
		.then((data) => res.json(data))
		.catch(next);
}

function addMany(req: Request, res: Response, next: NextFunction) {
	let groups: GroupCreate[];
	try {
		groups = groupCreatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	addGroups(req.user, groups)
		.then((data) => res.json(data))
		.catch(next);
}

function removeMany(req: Request, res: Response, next: NextFunction) {
	let ids: string[];
	try {
		ids = groupIdsSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	removeGroups(req.user, ids)
		.then((data) => res.json(data))
		.catch(next);
}

function updateMany(req: Request, res: Response, next: NextFunction) {
	let updates: GroupUpdate[];
	try {
		updates = groupUpdatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	updateGroups(req.user, updates)
		.then((data) => res.json(data))
		.catch(next);
}

const router = Router();
router.get("/:parentName?", get);
router.route("/").post(addMany).patch(updateMany).delete(removeMany);

export default router;
