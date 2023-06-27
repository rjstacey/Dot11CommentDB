/*
 * ePolls API
 *
 * GET /epolls?{n}
 *		Get a list of ePolls by scraping the mentor webpage for closed epolls.
 *		Returns an array of epoll objects.
 */
import { Router } from 'express';
import { ForbiddenError } from '../utils';
import { AccessLevel } from '../auth/access';
import { getEpolls } from '../services/epoll';

const router = Router();

router
	.all('*', (req, res, next) => {
		if (!req.group)
			return next(new Error("Group not set"));

		const access = req.group.permissions.ballots || AccessLevel.none;
		if (access >= AccessLevel.admin)
			return next();

		next(new ForbiddenError("Insufficient karma"));
	})
	.get('/', (req, res, next) => {
		const groupName = req.group!.name;
		const n = typeof req.query.n === 'string'? Number(req.query.n): 20;
		getEpolls(req.user, groupName, n)
			.then(data => res.json(data))
			.catch(next);
	});

export default router;
