/*
 * ePolls API
 *
 * GET /epolls?{n}
 *		Get a list of ePolls by scraping the mentor webpage for closed epolls.
 *		Returns an array of epoll objects.
 */
import { Request, Response, NextFunction, Router } from "express";
import { ForbiddenError } from "../utils/index.js";
import { AccessLevel } from "../auth/access.js";
import { getEpolls } from "../services/epoll.js";

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	try {
		if (!req.group) throw new Error("Group not set");

		const access = req.group.permissions.ballots || AccessLevel.none;
		const grant = access >= AccessLevel.admin;

		if (grant) return next();
		throw new ForbiddenError();
	} catch (error) {
		next(error);
	}
}

async function getAll(req: Request, res: Response, next: NextFunction) {
	const groupName = req.group!.name;
	const n = typeof req.query.n === "string" ? Number(req.query.n) : 20;
	try {
		const data = await getEpolls(req.user, groupName, n);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

const router = Router();
router.all(/(.*)/, validatePermissions);
router.get("/", getAll);

export default router;
