/*
 * Officers API
 *
 */
import { Request, Response, NextFunction, Router } from "express";
import { ForbiddenError } from "../utils/index.js";
import { AccessLevel } from "../auth/access.js";
import {
	officerCreatesSchema,
	officerIdsSchema,
	officerUpdatesSchema,
} from "@schemas/officers.js";
import {
	getOfficers,
	addOfficers,
	updateOfficers,
	removeOfficers,
} from "../services/officers.js";

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	try {
		const { group } = req;
		if (!group) throw new Error("Group not set");

		const access = group.permissions.members || AccessLevel.none;
		const grant = access >= AccessLevel.admin;

		if (grant) return next();
		throw new ForbiddenError();
	} catch (error) {
		next(error);
	}
}

async function get(req: Request, res: Response, next: NextFunction) {
	const parentGroupId = req.group!.id;
	try {
		const data = await getOfficers({ parentGroupId });
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function addMany(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	try {
		const officers = officerCreatesSchema.parse(req.body);
		const data = await addOfficers(req.user, group, officers);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function updateMany(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	try {
		const updates = officerUpdatesSchema.parse(req.body);
		const data = await updateOfficers(req.user, group, updates);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function removeMany(req: Request, res: Response, next: NextFunction) {
	const { user, body } = req;
	const group = req.group!;
	try {
		const ids = officerIdsSchema.parse(body);
		const data = await removeOfficers(user, group, ids);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

const router = Router();
router
	.all(/(.*)/, validatePermissions)
	.route("/")
	.get(get)
	.post(addMany)
	.patch(updateMany)
	.delete(removeMany);

export default router;
