/*
 * Ballots API
 *
 */

import { Request, Response, NextFunction, Router } from "express";
import { ForbiddenError } from "../utils";
import { AccessLevel } from "../auth/access";
import {
	ballotCreatesSchema,
	BallotCreate,
	ballotUpdatesSchema,
	BallotUpdate,
	ballotIdsSchema,
} from "../schemas/ballots";
import {
	getBallots,
	updateBallots,
	addBallots,
	deleteBallots,
} from "../services/ballots";

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	if (!req.group) return next(new Error("Group not set"));

	const access = req.group.permissions.ballots || AccessLevel.none;

	if (req.method === "GET" && access >= AccessLevel.ro) return next();
	if (req.method === "PATCH" && access >= AccessLevel.rw) return next();
	if (
		(req.method === "POST" || req.method === "DELETE") &&
		access >= AccessLevel.admin
	)
		return next();

	next(new ForbiddenError("Insufficient karma"));
}

function getAll(req: Request, res: Response, next: NextFunction) {
	const workingGroupId = req.group!.id;
	getBallots({ workingGroupId })
		.then((data) => res.json(data))
		.catch(next);
}

function addMany(req: Request, res: Response, next: NextFunction) {
	let ballots: BallotCreate[];
	try {
		ballots = ballotCreatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	addBallots(req.user, req.group!, ballots)
		.then((data) => res.json(data))
		.catch(next);
}

function updateMany(req: Request, res: Response, next: NextFunction) {
	let updates: BallotUpdate[];
	try {
		updates = ballotUpdatesSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	updateBallots(req.user, req.group!, updates)
		.then((data) => res.json(data))
		.catch(next);
}

function removeMany(req: Request, res: Response, next: NextFunction) {
	let ids: number[];
	try {
		ids = ballotIdsSchema.parse(req.body);
	} catch (error) {
		return next(error);
	}
	deleteBallots(req.user, req.group!, ids)
		.then((data) => res.json(data))
		.catch(next);
}

const router = Router();
router.all("*", validatePermissions);
router
	.route("/")
	.get(getAll)
	.post(addMany)
	.patch(updateMany)
	.delete(removeMany);

export default router;
