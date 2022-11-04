/*
 * 802 tools server API
 *
 * Robert Stacey
 */

import {AccessLevel} from '../auth/access';
import {authorize} from '../auth/jwt'

const upload = require('multer')();
const router = require('express').Router();

/*
 * The open part of the API is satisfied here
 */
router.use('/timezones', require('./timezones').default);

/*
 * The remainder of the API requires an authorized user
 *
 * Authorize access to the API
 * Successful authorization leaves authorized user's context in req (in req.user)
 */
router.use(authorize);

/*
 * Enforce access levels
 *
 * Default is to deny access (status(403) at end of routine) unless permission is explicitly granted
 * through one the "return next()" statements.
 */
router.all('*', (req, res, next) => {
	const access = req.user.Access;

	switch (req.method) {
	case 'GET': /* read */
		/* public has read access to ballots, comments, resolutions and timeZones */
		if (req.path.match(/^\/ballot|^\/votingPools|^\/comment|^\/resolution/i))
			return next();
		/* members have read access to users */
		if (req.path.match(/^\/users/i) && access >= AccessLevel.Member)
			return next();
		/* subgroup admins have read access to results */
		if (req.path.match(/^\/result/i) && access >= AccessLevel.SubgroupAdmin)
			return next();
		/* subgroup admins have read access to meetings */
		if (req.path.match(/^\/meetings/i) && access >= AccessLevel.SubgroupAdmin)
			return next();
		break;

	case 'POST': /* add */
	case 'DELETE': /* delete */
		if (req.path.match(/^\/comment|^\/resolution/i) && access >= AccessLevel.SubgroupAdmin)
			return next();
		if (req.path.match(/^\/ballot/i) && access >= AccessLevel.WGAdmin)
			return next();
		/* subgroup admins have create/delete access to meetings */
		if (req.path.match(/^\/meetings/i) && access >= AccessLevel.SubgroupAdmin)
			return next();
		break;

	case 'PUT':
	case 'PATCH': /* modify existing */
		if (req.path.match(/^\/resolution/i) && access >= AccessLevel.Member)
			return next();
		if (req.path.match(/^\/comment/i) && access >= AccessLevel.SubgroupAdmin)
			return next();
		if (req.path.match(/^\/ballot/i) && access >= AccessLevel.WGAdmin)
			return next();
		/* subgroup admins have modify access to meetings */
		if (req.path.match(/^\/meetings/i) && access >= AccessLevel.SubgroupAdmin)
			return next();
		break;
	}

	/* WG admin can do anything */
	if (access === AccessLevel.WGAdmin)
		return next();

	return res.status(403).send('Insufficient karma');
});

/* A get on root returns OK: tests connect availability */
router.get('/$', (req, res, next) => res.json(null));

/*
 * APIs for managing the organization
 */
router.use('/members', require('./members').default);			// Manage membership
router.use('/users', require('./users').default);				// Limited access to member information for various uses (comment resolution, meeting setup, etc.)
router.use('/groups', require('./groups').default);				// Groups and subgroups
router.use('/officers', require('./officers').default);			// Group and subgroup officers
router.use('/email', require('./email').default);				// Sending email

/*
 * APIs for managing meetings
 */
router.use('/sessions', require('./sessions').default);			// Sessions
router.use('/meetings', require('./meetings').default);			// Session meetings and telecons
router.use('/webex', require('./webex').default);				// Webex account and meetings
router.use('/calendar', require('./calendar').default);			// Google calendar accounts and events
router.use('/imat', require('./imat').default);					// Access to IEEE SA attendance system (IMAT)
router.use('/802world', require('./802world').default);			// Access to schedule802world.com (meeting organizer schedule)

/*
 * APIs for balloting and comment resolution
 */
router.use('/ballots', require('./ballots').default);			// Ballots
router.use('/votingPools', require('./votingPools').default);	// Ballot voting pools
router.use('/voters', require('./voters').default);				// Ballot voters
router.use('/results', require('./results').default);			// Ballot results
router.use('/comments', require('./comments').default);			// Ballot comments
router.use('/resolutions', require('./resolutions').default);	// Comment resolutions
router.use('/commentHistory', require('./commentHistory').default);	// Comment change history
router.use('/epolls', require('./epolls').default);				// Access to ePolls balloting tool

export default router;
