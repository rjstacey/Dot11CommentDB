
/*
 * Ballots API
 *
 * GET /ballot/{ballotId} - return details on a specific ballot
 * GET /ballots - return the complete list of ballots
 * PUT /ballots - update select fields in ballot entries
 * POST: /ballots - add ballot entries
 * DELETE: /ballots - delete ballots
 * GET: /epolls?{n} - return a list of n epolls by scraping the mentor webpage for closed epolls.
 */
import {
	getBallot,
	getBallots,
	updateBallots,
	addBallots,
	deleteBallots
} from '../services/ballots';

const router = require('express').Router();

router.get('/:ballot_id(\\d+)', async (req, res, next) => {
	try {
		const {ballot_id} = req.params;
		const data = await getBallot(ballot_id);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/$', async (req, res, next) => {
	try {
		res.json(await getBallots());
	}
	catch(err) {next(err)}
});

router.patch('/$', async (req, res, next) => {
	try {
		const {user} = req;
		const updates = req.body;
		if (!Array.isArray(updates))
			throw 'Bad or missing body; expected an array of ballots';
		const data = await updateBallots(user, updates);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/$', async (req, res, next) => {
	try {
		const {user} = req;
		const ballots = req.body;
		if (!Array.isArray(ballots))
			throw 'Bad or missing body; expected an array of ballots';
		const data = await addBallots(user, ballots);
		res.json(data)
	}
	catch(err) {next(err)}
});

router.delete('/$', async (req, res, next) => {
	try {
		const ids = req.body;
		if (!Array.isArray(ids))
			throw 'Missing or bad body; expected an array of ids';
		await deleteBallots(ids)
		res.json(null)
	}
	catch(err) {next(err)}
});

export default router;
