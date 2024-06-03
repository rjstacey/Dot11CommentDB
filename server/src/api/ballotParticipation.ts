/*
 * Ballot Series Participation API
 *
 */
import { Request, Response, NextFunction, Router } from "express";
import { AccessLevel } from "../auth/access";
import { ForbiddenError } from "../utils";
import { getBallotSeriesParticipation } from "../services/ballotParticipation";

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	if (!req.group) return next(new Error("Group not set"));

	const access = req.group.permissions.members || AccessLevel.none;

	if (req.method === "GET" && access >= AccessLevel.ro) return next();
	if (req.method === "PATCH" && access >= AccessLevel.rw) return next();
	if (
		(req.method === "DELETE" || req.method === "POST") &&
		access >= AccessLevel.admin
	)
		return next();

	next(new ForbiddenError("Insufficient karma"));
}

function getAll(req: Request, res: Response, next: NextFunction) {
	const group = req.group!;
	getBallotSeriesParticipation(group.id)
		.then((data) => res.json(data))
		.catch(next);
}

const router = Router();
router.all("*", validatePermissions);
router.get("/", getAll);

export default router;
