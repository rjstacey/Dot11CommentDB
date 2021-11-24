
/*
 * ePolls API
 * GET: /epolls?{n} - return a list of n epolls by scraping the mentor webpage for closed epolls.
 */

import {getEpolls} from '../services/epoll';

const router = require('express').Router();

router.get('/$', async (req, res, next) => {
	try {
		const {user} = req;
		const n = req.query.hasOwnProperty('n')? parseInt(req.query.n): 0
		const data = await getEpolls(user, n)
		res.json(data)
	}
	catch(err) {next(err)}
});

export default router;
