/*
 * Ballots API
 *
 */

import { Request, Response, NextFunction, Router } from "express";
import { ForbiddenError } from "../utils/index.js";
import { AccessLevel } from "../auth/access.js";
import {
	ballotCreatesSchema,
	ballotUpdatesSchema,
	ballotIdsSchema,
} from "@schemas/ballots.js";
import {
	getBallots,
	updateBallots,
	addBallots,
	deleteBallots,
} from "../services/ballots.js";

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	try {
		if (!req.group) throw new Error("Group not set");

		const access = req.group.permissions.ballots || AccessLevel.none;

		const grant =
			(req.method === "GET" && access >= AccessLevel.ro) ||
			(req.method === "PATCH" && access >= AccessLevel.rw) ||
			((req.method === "POST" || req.method === "DELETE") &&
				access >= AccessLevel.admin);

		if (grant) {
			next();
			return;
		}

		throw new ForbiddenError();
	} catch (error) {
		next(error);
	}
}

async function getAll(req: Request, res: Response, next: NextFunction) {
	try {
		const workingGroupId = req.group!.id;
		const data = await getBallots({ workingGroupId });
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function addMany(req: Request, res: Response, next: NextFunction) {
	try {
		const { user, group, body } = req;
		const ballots = ballotCreatesSchema.parse(body);
		const data = await addBallots(user, group!, ballots);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function updateMany(req: Request, res: Response, next: NextFunction) {
	try {
		const { user, group, body } = req;
		const updates = ballotUpdatesSchema.parse(body);
		const data = await updateBallots(user, group!, updates);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function removeMany(req: Request, res: Response, next: NextFunction) {
	try {
		const ids = ballotIdsSchema.parse(req.body);
		const data = await deleteBallots(req.user, req.group!, ids);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

const router = Router();
router.all(/(.*)/, validatePermissions);
router
	.route("/")
	.get(getAll)
	.post(addMany)
	.patch(updateMany)
	.delete(removeMany);

export default router;
