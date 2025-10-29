/*
 * 802 tools server API
 *
 * Robert Stacey
 */
import { NextFunction, Request, Response, Router } from "express";

import { UserContext } from "../services/users.js";
import { getGroups } from "../services/groups.js";
import type { Group } from "@schemas/groups.js";
import { getBallot } from "../services/ballots.js";
import { Ballot } from "@schemas/ballots.js";
import { authorize } from "../auth/jwt.js";
import { BadRequestError, NotFoundError } from "../utils/index.js";

import timezones from "./timezones.js";
import members from "./members.js";
import affiliationMap from "./affiliationMap.js";
import groups from "./groups.js";
import officers from "./officers.js";
import email from "./email.js";
import attendances from "./attendances.js";
import ballotParticipation from "./ballotParticipation.js";

import sessions from "./sessions.js";
import meetings from "./meetings.js";
import webex from "./webex.js";
import calendar from "./calendar.js";
import imat from "./imat.js";
import ieee802world from "./802world.js";

import ballots from "./ballots.js";
import epolls from "./epolls.js";
import voters from "./voters.js";
import results from "./results.js";
import comments from "./comments.js";
import resolutions from "./resolutions.js";
import commentHistory from "./commentHistory.js";

import pkg from "../../package.json" with { type: "json" };

const router = Router();

/*
 * The open part of the API is satisfied here
 */
router.use("/timezones", timezones);

/* A get on root tests connectivity and provides server info */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
router.get("/", (req, res, next) =>
	res.json({
		name: pkg.name,
		version: pkg.version,
		description: pkg.description,
	})
);

/*
 * The remainder of the API requires an authorized user
 *
 * Authorize access to the API
 * Successful authorization leaves authorized user's context in req (in req.user)
 */
router.use(authorize);

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Express {
		interface Request {
			user: UserContext;
			groups?: Group[];
			group?: Group;
			ballot?: Ballot;
			permissions?: Record<string, number>;
		}
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
router.use("/groups", groups); // Groups and subgroups

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
router.use("/802world", ieee802world); // Access to schedule802world.com (meeting organizer schedule)
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
