import { Request, Response, NextFunction, Router } from "express";
import { AccessLevel } from "../auth/access.js";
import { ForbiddenError } from "../utils/index.js";
import { getUsers } from "../services/members.js";

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	if (!req.group) {
		next(new Error("Group not set"));
		return;
	}

	const access = req.group.permissions.users || AccessLevel.none;
	if (access >= AccessLevel.ro) {
		next();
		return;
	}

	next(new ForbiddenError());
}

async function get(req: Request, res: Response, next: NextFunction) {
	try {
		const data = await getUsers();
		res.json(data);
	} catch (error) {
		next(error);
	}
}

const router = Router();
router.all(/(.*)/, validatePermissions).get("/", get);

export default router;
