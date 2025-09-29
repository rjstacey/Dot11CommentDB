import { Request, Response, NextFunction, Router } from "express";
import { AccessLevel } from "../auth/access.js";
import { ForbiddenError } from "../utils/index.js";
import { getUsers } from "../services/members.js";

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	if (!req.group) return next(new Error("Group not set"));

	const access = req.group.permissions.users || AccessLevel.none;
	console.log(req.group);
	if (access >= AccessLevel.ro) return next();

	next(new ForbiddenError("Insufficient karma"));
}

function get(req: Request, res: Response, next: NextFunction) {
	getUsers()
		.then((data) => res.json(data))
		.catch(next);
}

const router = Router();
router.all(/(.*)/, validatePermissions).get("/", get);

export default router;
