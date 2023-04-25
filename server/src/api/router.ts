/*
 * 802 tools server API
 *
 * Robert Stacey
 */
import { Router } from 'express';

import {userIsMember, userIsSubgroupAdmin, userIsWGAdmin, User} from '../services/users';
import {authorize} from '../auth/jwt'

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
import votingPools from './votingPools';
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
	  }
	}
}
  

/*
 * Enforce access levels
 *
 * The philosophy here is to deny access (status(403) at end of routine) unless permission is explicitly granted
 * through one the "return next()" statements.
 */
router.all('*', (req, res, next) => {
	const {user} = req;
	const access = user.Access;

	// WG Admin can do anything
	if (userIsWGAdmin(user))
		return next();

	const isMember = userIsMember(user);
	const isSubgroupAdmin = userIsSubgroupAdmin(user);

	switch (req.method) {
	case 'GET': /* read */
		/* public has read access to ballots, comments, resolutions and timeZones */
		if (req.path.match(/^\/ballot|^\/votingPools|^\/comment|^\/resolution/i))
			return next();
		/* members have read access to users */
		if (req.path.match(/^\/users/i) && isMember)
			return next();
		/* subgroup admins have read access to results */
		if (req.path.match(/^\/result/i) && isSubgroupAdmin)
			return next();
		/* subgroup admins have read access to meetings */
		if (req.path.match(/^\/meetings/i) && isSubgroupAdmin)
			return next();
		break;

	case 'POST': /* add */
	case 'DELETE': /* delete */
		if (req.path.match(/^\/comment|^\/resolution/i) && isSubgroupAdmin)
			return next();
		/* subgroup admins have create/delete access to meetings */
		if (req.path.match(/^\/meetings/i) && isSubgroupAdmin)
			return next();
		break;

	case 'PUT':
	case 'PATCH': /* modify existing */
		if (req.path.match(/^\/resolution/i) && isMember)
			return next();
		if (req.path.match(/^\/comment/i) && isSubgroupAdmin)
			return next();
		/* subgroup admins have modify access to meetings */
		if (req.path.match(/^\/meetings/i) && isSubgroupAdmin)
			return next();
		break;
	}

	return res.status(403).send('Insufficient karma');
});

/* A get on root returns OK: tests connectivity */
router.get('/$', (req, res, next) => res.json(null));

/*
 * APIs for managing the organization
 */
router.use('/members', members);			// Manage membership
router.use('/users', users);				// Limited access to member information for various uses (comment resolution, meeting setup, etc.)
router.use('/groups', groups);				// Groups and subgroups
router.use('/officers', officers);			// Group and subgroup officers
router.use('/email', email);				// Sending email
router.use('/permissions', permissions);	// Get list of permissions
router.use('/attendances', attendances);	// Attendances
router.use('/ballotParticipation', ballotParticipation);	// Ballot series participation

/*
 * APIs for managing meetings
 */
router.use('/sessions', sessions);			// Sessions
router.use('/meetings', meetings);			// Session meetings and telecons
router.use('/webex', webex);				// Webex account and meetings
router.use('/calendar', calendar);			// Google calendar accounts and events
router.use('/imat', imat);					// Access to IEEE SA attendance system (IMAT)
router.use('/802world', ieee802world);		// Access to schedule802world.com (meeting organizer schedule)

/*
 * APIs for balloting and comment resolution
 */
router.use('/ballots', ballots);			// Ballots
router.use('/votingPools', votingPools);	// Ballot voting pools
router.use('/voters', voters);				// Ballot voters
router.use('/results', results);			// Ballot results
router.use('/comments', comments);			// Ballot comments
router.use('/resolutions', resolutions);	// Comment resolutions
router.use('/commentHistory', commentHistory);	// Comment change history
router.use('/epolls', epolls);				// Access to ePolls balloting tool

export default router;
