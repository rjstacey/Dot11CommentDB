/*
 * Officers API
 *
 */
import { Request, Response, NextFunction, Router } from "express";
import { ForbiddenError } from "../utils";
import { AccessLevel } from "../auth/access";
import {
	OfficerCreate,
	OfficerUpdate,
	officerCreatesSchema,
	officerIdsSchema,
	officerUpdatesSchema,
} from "@schemas/officers";
import {
	getOfficers,
	addOfficers,
	updateOfficers,
	removeOfficers,
} from "../services/officers";

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	const { group } = req;
	if (!group) return next(new Error("Group not set"));

	const access = group.permissions.members || AccessLevel.none;

	if (access >= AccessLevel.admin) return next();

	next(new ForbiddenError("Insufficient karma"));
}

function get(req: Request, res: Response, next: NextFunction) {
	const parentGroupId = req.group!.id;
	getOfficers({ parentGroupId })
		.then((data) => res.json(data))
		.catch(next);
}

function addMany(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	let officers: OfficerCreate[];
	try {
		officers = officerCreatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	addOfficers(req.user, group, officers)
		.then((data) => res.json(data))
		.catch(next);
}

function updateMany(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	let updates: OfficerUpdate[];
	try {
		updates = officerUpdatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	updateOfficers(req.user, group, updates)
		.then((data) => res.json(data))
		.catch(next);
}

function removeMany(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	let ids: string[];
	try {
		ids = officerIdsSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	removeOfficers(req.user, group, ids)
		.then((data) => res.json(data))
		.catch(next);
}

const router = Router();
router.all("*", validatePermissions);
router.route("/").get(get).post(addMany).patch(updateMany).delete(removeMany);

export default router;
