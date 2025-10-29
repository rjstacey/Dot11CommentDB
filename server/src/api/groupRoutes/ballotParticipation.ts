/*
 * Ballot Series Participation API
 *
 */
import { Request, Response, NextFunction, Router } from "express";
import { AccessLevel } from "@schemas/access.js";
import { ForbiddenError } from "@/utils/index.js";
import { getBallotSeriesParticipation } from "@/services/ballotParticipation.js";

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	try {
		if (!req.group) throw new Error("Group not set");

		const access = req.group.permissions.members || AccessLevel.none;

		const grant =
			(req.method === "GET" && access >= AccessLevel.ro) ||
			(req.method === "PATCH" && access >= AccessLevel.rw) ||
			((req.method === "DELETE" || req.method === "POST") &&
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
		const groupId = req.group!.id;
		const data = await getBallotSeriesParticipation(groupId);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

const router = Router();
router.all(/(.*)/, validatePermissions);
router.get("/", getAll);

export default router;
