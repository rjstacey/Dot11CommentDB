import { Router } from "express";
import { AccessLevel } from "../auth/access";
import { ForbiddenError } from "../utils";
import { getUsers } from "../services/members";

const router = Router();

router
	.all("*", (req, res, next) => {
		if (!req.group) return next(new Error("Group not set"));
		
		const access = req.group.permissions.users || AccessLevel.none;
		if (access >= AccessLevel.admin) return next();

		next(new ForbiddenError("Insufficient karma"));
	})
	.get("/", (req, res, next) => {
		getUsers()
			.then((data) => res.json(data))
			.catch(next);
	});

export default router;
