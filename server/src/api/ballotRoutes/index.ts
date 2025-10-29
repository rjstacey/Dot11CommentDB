/*
 * 802 tools server API
 *
 * Robert Stacey
 */
import { NextFunction, Request, Response, Router } from "express";

import { getGroups } from "@/services/groups.js";
import { getBallot } from "@/services/ballots.js";
import { BadRequestError, NotFoundError } from "@/utils/index.js";

import voters from "./voters.js";
import results from "./results.js";
import comments from "./comments.js";
import resolutions from "./resolutions.js";
import commentHistory from "./commentHistory.js";
import type { Ballot } from "@schemas/ballots.js";
import { Group } from "@schemas/groups.js";

const router = Router();

declare module "express-serve-static-core" {
	interface Request {
		ballot: Ballot;
		group?: Group;
		groups?: Group[];
		permissions: Group["permissions"];
	}
}

async function parseBallot_id(req: Request, res: Response, next: NextFunction) {
	try {
		const ballot_id = Number(req.params.ballot_id);
		if (isNaN(ballot_id))
			throw new BadRequestError("Bad path parameter :ballot_id");
		const ballot = await getBallot(ballot_id);
		if (!ballot) {
			throw new NotFoundError(`Ballot ${ballot_id} does not exist`);
		}
		if (!ballot.groupId) {
			throw new TypeError(
				`Ballot ${ballot_id} not associated with a group`
			);
		}

		req.ballot = ballot;
		req.groups = await getGroups(req.user, { id: ballot.groupId });
		if (req.groups.length < 1) {
			throw new NotFoundError(
				`Group associated with ballot ${ballot_id} does not exist`
			);
		}
		req.group = req.groups[0];
		req.permissions = req.group.permissions;
		next();
	} catch (error) {
		next(error);
	}
}

router.use("/voters/:ballot_id", parseBallot_id, voters); // Ballot voters
router.use("/results/:ballot_id", parseBallot_id, results); // Ballot results
router.use("/comments/:ballot_id", parseBallot_id, comments); // Ballot comments
router.use("/resolutions/:ballot_id", parseBallot_id, resolutions); // Comment resolutions
router.use("/commentHistory/:ballot_id", parseBallot_id, commentHistory); // Comment change history

export default router;
