/*
 * 802 tools server API
 *
 * Robert Stacey
 */
import { NextFunction, Request, Response, Router } from 'express';

import { userIsMember, userIsSubgroupAdmin, userIsWGAdmin, User } from '../services/users';
import { getGroup, getGroups, Group } from '../services/groups';
import { getBallot, Ballot } from '../services/ballots';
import { authorize } from '../auth/jwt'
import { NotFoundError } from '../utils';

import timezones from './timezones';
import members from './members';
import users from './users';
import groups from './groups';
import officers from './officers';
import email from './email';
import permissions from './permissions';
import attendances from './attendances';
import ballotParticipation from './ballotParticipation';

import sessions from './sessions';
import meetings from './meetings';
import webex from './webex';
import calendar from './calendar';
import imat from './imat';
import ieee802world from './802world';

import ballots from './ballots';
import voters from './voters';
import results from './results';
import comments from './comments';
import resolutions from './resolutions';
import commentHistory from './commentHistory';
import epolls from './epolls';

const router = Router();

/*
 * The open part of the API is satisfied here
 */
router.use('/timezones', timezones);

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
			group?: Group;
			workingGroup?: Group;
			ballot?: Ballot;
		}
	}
}
  
/* A get on root returns OK: tests connectivity */
router.get('/', (req, res, next) => res.json('OK'));

async function parsePathGroupName(req: Request, res: Response, next: NextFunction) {
	const {groupName} = req.params;
	const group = await getGroup(req.user, groupName);
	if (!group)
		return next(new NotFoundError(`Group ${groupName} does not exist`));
	req.group = group;
	next();
}

/*
 * APIs for managing the organization
 */
router.use('/groups', groups);				// Groups and subgroups
router.use('/email', email);				// Sending email
router.use('/permissions', permissions);	// Get list of permissions
router.use('/:groupName/members', parsePathGroupName, members);			// Manage membership
router.use('/:groupName/users', parsePathGroupName, users);				// Limited access to member information for various uses (comment resolution, meeting setup, etc.)
router.use('/:groupName/officers', parsePathGroupName, officers);		// Group and subgroup officers
router.use('/:groupName/attendances', parsePathGroupName, attendances);	// Attendances
router.use('/:groupName/ballotParticipation', parsePathGroupName, ballotParticipation);	// Ballot series participation

/*
 * APIs for managing meetings
 */
router.use('/802world', ieee802world);		// Access to schedule802world.com (meeting organizer schedule)
router.use('/:groupName/sessions', parsePathGroupName, sessions);		// Sessions
router.use('/:groupName/meetings', parsePathGroupName, meetings);		// Session meetings and telecons
router.use('/:groupName/webex', parsePathGroupName, webex);				// Webex account and meetings
router.use('/:groupName/calendar', parsePathGroupName, calendar);		// Google calendar accounts and events
router.use('/:groupName/imat', parsePathGroupName, imat);				// Access to IEEE SA attendance system (IMAT)

/*
 * APIs for balloting and comment resolution
 */
async function parsePathBallot_id(req: Request, res: Response, next: NextFunction) {
	const ballot_id = Number(req.params.ballot_id);
	const ballot = await getBallot(ballot_id);
	if (!ballot)
		return next(new NotFoundError(`Ballot ${ballot_id} does not exist`));
	req.ballot = ballot;
	req.workingGroup = (await getGroups(req.user, {id: ballot.workingGroupId}))[0];
	if (ballot.groupId)
		req.group = (await getGroups(req.user, {id: ballot.groupId}))[0];
	else
		req.group = req.workingGroup;
	next();
}

router.use('/voters/:ballot_id(\\d+)', parsePathBallot_id, voters);				// Ballot voters
router.use('/results/:ballot_id(\\d+)', parsePathBallot_id, results);			// Ballot results
router.use('/comments/:ballot_id(\\d+)', parsePathBallot_id, comments);			// Ballot comments
router.use('/resolutions/:ballot_id(\\d+)', parsePathBallot_id, resolutions);	// Comment resolutions
router.use('/commentHistory/:ballot_id(\\d+)', parsePathBallot_id, commentHistory);	// Comment change history

router.use('/:groupName/ballots', parsePathGroupName, ballots);
router.use('/:groupName/epolls', parsePathGroupName, epolls);				// Access to ePolls balloting tool

export default router;
