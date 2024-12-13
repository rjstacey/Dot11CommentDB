/*
 * Comments History API
 */
import { Request, Response, NextFunction, Router } from "express";
import { ForbiddenError } from "../utils";
import { AccessLevel } from "../auth/access";
import { getCommentHistory } from "../services/commentHistory";

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
	try {
		const data = await getCommentHistory(comment_id);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

const router = Router();
router.all("*", validatePermissions).get("/:comment_id(\\d+)", get);

export default router;
