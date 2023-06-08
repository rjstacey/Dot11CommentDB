/*
 * ePolls API
 *
 * GET /epolls?{n}
 *		Get a list of ePolls by scraping the mentor webpage for closed epolls.
 *		Returns an array of epoll objects.
 */
import { Router } from 'express';
import { AccessLevel } from '../auth/access';
import { getEpolls } from '../services/epoll';

const router = Router();

router
	.all('*', (req, res, next) => {
		const access = req.group?.permissions.ballots || AccessLevel.none;
		if (access >= AccessLevel.admin)
			return next();
		res.status(403).send('Insufficient karma');
	})
	.get('/', async (req, res, next) => {
		const groupName = req.group!.name;
		const n = typeof req.query.n === 'string'? Number(req.query.n): 20;
		getEpolls(req.user, groupName, n)
			.then(data => res.json(data))
			.catch(next);
	});

export default router;
