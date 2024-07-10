/*
 * 802 tools server API
 *
 * Robert Stacey
 */
import { NextFunction, Request, Response, Router } from "express";

import { User } from "../services/users";
import { getGroups } from "../services/groups";
import type { Group } from "../schemas/groups";
import { getBallot } from "../services/ballots";
import { Ballot } from "../schemas/ballots";
import { authorize } from "../auth/jwt";
import { NotFoundError } from "../utils";

import timezones from "./timezones";
import members from "./members";
import users from "./users";
import groups from "./groups";
import officers from "./officers";
import email from "./email";
import attendances from "./attendances";
import ballotParticipation from "./ballotParticipation";

import sessions from "./sessions";
import meetings from "./meetings";
import webex from "./webex";
import calendar from "./calendar";
import imat from "./imat";
import ieee802world from "./802world";

import ballots from "./ballots";
import epolls from "./epolls";
import voters from "./voters";
import results from "./results";
import comments from "./comments";
import resolutions from "./resolutions";
import commentHistory from "./commentHistory";

import * as pkg from "../../package.json";

const router = Router();

/*
 * The open part of the API is satisfied here
 */
router.use("/timezones", timezones);

/* A get on root tests connectivity and provides server info */
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
	namespace Express {
		interface Request {
			user: User;
			groups?: Group[];
			group?: Group;
			ballot?: Ballot;
			permissions?: Record<string, number>;
		}
	}
}

async function parseGroupName(req: Request, res: Response, next: NextFunction) {
	const { groupName } = req.params;
	req.groups = await getGroups(req.user, { name: groupName });
	if (req.groups.length < 1)
		return next(new NotFoundError(`Group ${groupName} does not exist`));
	req.group = req.groups[0];
	next();
}

/*
 * APIs for managing the organization
 */
router.use("/groups", groups); // Groups and subgroups

router.use("/:groupName/members", parseGroupName, members); // Manage membership
//router.use("/:groupName/users", parseGroupName, users); // Limited access to member information for various uses (comment resolution, meeting setup, etc.)
router.use("/:groupName/officers", parseGroupName, officers); // Group and subgroup officers
router.use("/:groupName/attendances", parseGroupName, attendances); // Attendances
router.use(
	"/:groupName/ballotParticipation",
	parseGroupName,
	ballotParticipation
); // Ballot series participation
router.use("/:groupName/email", parseGroupName, email); // Sending email

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
	const ballot_id = Number(req.params.ballot_id);
	const ballot = await getBallot(ballot_id);
	if (!ballot)
		return next(new NotFoundError(`Ballot ${ballot_id} does not exist`));
	if (!ballot.groupId)
		return next(
			new NotFoundError(`Ballot ${ballot_id} not associated with a group`)
		);
	req.ballot = ballot;
	req.groups = await getGroups(req.user, { id: ballot.groupId });
	if (req.groups.length < 1)
		return next(
			new NotFoundError(
				`Group associated with ballot ${ballot_id} does not exist`
			)
		);
	req.group = req.groups[0];
	req.permissions = req.group.permissions;
	next();
}

router.use("/voters/:ballot_id(\\d+)", parseBallot_id, voters); // Ballot voters
router.use("/results/:ballot_id(\\d+)", parseBallot_id, results); // Ballot results
router.use("/comments/:ballot_id(\\d+)", parseBallot_id, comments); // Ballot comments
router.use("/resolutions/:ballot_id(\\d+)", parseBallot_id, resolutions); // Comment resolutions
router.use("/commentHistory/:ballot_id(\\d+)", parseBallot_id, commentHistory); // Comment change history

export default router;
