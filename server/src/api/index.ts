/*
 * 802 tools server API
 *
 * Robert Stacey
 */
import { Router } from "express";

import { UserContext } from "@/services/users.js";
import { authorize } from "../auth/authorize.js";
import groupRouter from "./groupRoutes/index.js";
import ballotRoutes from "./ballotRoutes/index.js";
import timezones from "./timezones.js";
import groups from "./groups.js";
import ieee802world from "./802world.js";

import pkg from "../../package.json" with { type: "json" };

const router = Router();

/*
 * The open part of the API is satisfied here
 */

/* A get on root tests connectivity and provides server info */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
router.get("/", (req, res, next) =>
	res.json({
		name: pkg.name,
		version: pkg.version,
		description: pkg.description,
	})
);

router.use("/timezones", timezones);

/*
 * The remainder of the API requires an authorized user
 *
 * Authorize access to the API
 * Successful authorization leaves authorized user's context in req (in req.user)
 */
router.use(authorize);

declare module "express-serve-static-core" {
	interface Request {
		user: UserContext;
	}
}

router.use("/groups", groups); // Groups and subgroups
router.use("/802world", ieee802world); // Access to schedule802world.com (meeting organizer schedule)
router.use(ballotRoutes);
router.use(groupRouter);

export default router;
