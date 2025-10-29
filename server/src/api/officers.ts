/*
 * Officers API
 *
 */
import { Request, Response, NextFunction, Router } from "express";
import { ForbiddenError } from "../utils/index.js";
import { AccessLevel } from "@schemas/access.js";
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

		if (grant) {
			next();
			return;
		}
		throw new ForbiddenError();
	} catch (error) {
		next(error);
	}
}

async function get(req: Request, res: Response, next: NextFunction) {
	try {
		const parentGroupId = req.group!.id;
		const data = await getOfficers({ parentGroupId });
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function addMany(req: Request, res: Response, next: NextFunction) {
	try {
		const group = req.group!;
		const officers = officerCreatesSchema.parse(req.body);
		const data = await addOfficers(req.user, group, officers);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function updateMany(req: Request, res: Response, next: NextFunction) {
	try {
		const group = req.group!;
		const updates = officerUpdatesSchema.parse(req.body);
		const data = await updateOfficers(req.user, group, updates);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function removeMany(req: Request, res: Response, next: NextFunction) {
	try {
		const group = req.group!;
		const ids = officerIdsSchema.parse(req.body);
		const data = await removeOfficers(req.user, group, ids);
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
