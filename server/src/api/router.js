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
		/* subgroup admins have read access to telecons */
		if (req.path.match(/^\/telecons/i) && access >= AccessLevel.SubgroupAdmin)
			return next();
		break;

	case 'POST': /* add */
	case 'DELETE': /* delete */
		if (req.path.match(/^\/comment|^\/resolution/i) && access >= AccessLevel.SubgroupAdmin)
			return next();
		if (req.path.match(/^\/ballot/i) && access >= AccessLevel.WGAdmin)
			return next();
		/* subgroup admins have create/delete access to telecons */
		if (req.path.match(/^\/telecons/i) && access >= AccessLevel.SubgroupAdmin)
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
		/* subgroup admins have modify access to telecons */
		if (req.path.match(/^\/telecons/i) && access >= AccessLevel.SubgroupAdmin)
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

/* Webex accounts API */
router.use('/webex', require('./webex').default);

/* Google calendar accounts API */
router.use('/calendar', require('./calendar').default);

/* Telecons API */
router.use('/telecons', require('./telecons').default);

/* Groups API */
router.use('/groups', require('./groups').default);

/* Officers API */
router.use('/officers', require('./officers').default);

/* Voting pools API */
router.use('/votingPools', require('./votingPools').default);

/* Voters API */
router.use('/voters', require('./voters').default);

/* Ballot API */
router.use('/ballots', require('./ballots').default);

/* Ballot results API */
router.use('/results', require('./results').default);

/* Comments API */
router.use('/comments', require('./comments').default);

/* Comment resolutions API */
router.use('/resolutions', require('./resolutions').default);

/* Comment history API */
router.use('/commentHistory', require('./commentHistory').default);

/* Users API */
router.use('/users', require('./users').default);

/* Members API */
router.use('/members', require('./members').default);

/* Sessions API */
router.use('/sessions', require('./sessions').default);

/* ePolls API */
router.use('/epolls', require('./epolls').default);

/* imat API */
router.use('/imat', require('./imat').default);

/* Access to schedule802world.com */
router.use('/802world', require('./802world').default);

export default router;
