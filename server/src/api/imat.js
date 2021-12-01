/*
 * imat API
 * GET /imat/meetings: get a list of meetings from IMAT
 */

import {getImatMeetings} from '../services/imat';

const router = require('express').Router();

router.get('/meetings', async (req, res, next) => {
	try {
		const {user} = req;
		const n = req.query.hasOwnProperty('n')? parseInt(req.query.n): 10;
		const data = await getImatMeetings(user, n);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
