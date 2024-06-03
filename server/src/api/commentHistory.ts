/*
 * Comments History API
 */
import { Request, Response, NextFunction, Router } from "express";
import { ForbiddenError } from "../utils";
import { AccessLevel } from "../auth/access";
import { getCommentHistory } from "../services/commentHistory";

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	const access = req.permissions?.comments || AccessLevel.none;
	if (req.method === "GET" && access >= AccessLevel.ro) return next();

	next(new ForbiddenError("Insufficient karma"));
}

function get(req: Request, res: Response, next: NextFunction) {
	const comment_id = Number(req.params.comment_id);
	getCommentHistory(comment_id)
		.then((data) => res.json(data))
		.catch(next);
}

const router = Router();
router.all("*", validatePermissions).get("/:comment_id(\\d+)", get);

export default router;
