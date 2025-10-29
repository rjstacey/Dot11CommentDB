/*
 * /:groupName routes
 *
 */
import { NextFunction, Response, Request, Router } from "express";

import type { Group } from "@schemas/groups.js";
import { getGroups } from "@/services/groups.js";
import { NotFoundError } from "@/utils/index.js";

import members from "./members.js";
import affiliationMap from "./affiliationMap.js";
import officers from "./officers.js";
import email from "./email.js";
import attendances from "./attendances.js";
import ballotParticipation from "./ballotParticipation.js";

import sessions from "./sessions.js";
import meetings from "./meetings.js";
import webex from "./webex.js";
import calendar from "./calendar.js";
import imat from "./imat.js";

import ballots from "./ballots.js";
import epolls from "./epolls.js";

const router = Router();

declare module "express-serve-static-core" {
	interface Request {
		groups?: Group[];
		group?: Group;
	}
}

async function parseGroupName(req: Request, res: Response, next: NextFunction) {
	try {
		const { groupName } = req.params;
		req.groups = await getGroups(req.user, { name: groupName });
		if (req.groups.length < 1)
			throw new NotFoundError(`Group ${groupName} does not exist`);
		req.group = req.groups[0];
		next();
	} catch (error) {
		next(error);
	}
}

/*
 * APIs for managing the organization
 */
router.use("/:groupName/members", parseGroupName, members); // Manage membership
router.use("/:groupName/affiliationMap", parseGroupName, affiliationMap); // Map affiliation to short name
router.use("/:groupName/officers", parseGroupName, officers); // Group and subgroup officers
router.use("/:groupName/attendances", parseGroupName, attendances); // Attendances
router.use(
	"/:groupName/ballotParticipation",
	parseGroupName,
	ballotParticipation
); // Ballot series participation
router.use("/:groupName/email", parseGroupName, email); // Email templates and sending email

/*
 * APIs for managing meetings
 */
router.use("/:groupName/sessions", parseGroupName, sessions); // Sessions
router.use("/:groupName/meetings", parseGroupName, meetings); // Session meetings and telecons
router.use("/:groupName/webex", parseGroupName, webex); // Webex account and meetings
router.use("/:groupName/calendar", parseGroupName, calendar); // Google calendar accounts and events
router.use("/:groupName/imat", parseGroupName, imat); // Access to IEEE SA attendance system (IMAT)

/*
 * APIs for balloting and comment resolution
 */
router.use("/:groupName/ballots", parseGroupName, ballots);
router.use("/:groupName/epolls", parseGroupName, epolls); // Access to ePolls balloting tool

export default router;
