/*
 * ePolls API
 *
 * GET /epolls?{n}
 *		Get a list of ePolls by scraping the mentor webpage for closed epolls.
 *		Returns an array of epoll objects.
 */
import {Router} from 'express';
import {getEpolls} from '../services/epoll';

const router = Router();

router.get('/$', async (req, res, next) => {
	try {
		const {user} = req;
		const n = req.query.hasOwnProperty('n')? parseInt(req.query.n): 0;
		const data = await getEpolls(user, n);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
