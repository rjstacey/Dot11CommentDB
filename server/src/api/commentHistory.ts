/*
 * Comments History API
 */
import { Request, Response, NextFunction, Router } from "express";
import { ForbiddenError } from "../utils/index.js";
import { AccessLevel } from "../auth/access.js";
import { getCommentHistory } from "../services/commentHistory.js";

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	try {
		const access = req.permissions?.comments || AccessLevel.none;
		const grant = req.method === "GET" && access >= AccessLevel.ro;

		if (grant) return next();

		throw new ForbiddenError();
	} catch (error) {
		next(error);
	}
}

async function get(req: Request, res: Response, next: NextFunction) {
	const comment_id = Number(req.params.comment_id);
	if (isNaN(comment_id))
		return res.status(404).send("path parameter comment_id not a number");
	try {
		const data = await getCommentHistory(comment_id);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

const router = Router();
router.all(/(.*)/, validatePermissions).get("/:comment_id", get);

export default router;
