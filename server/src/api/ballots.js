/*
 * Ballots API
 *
 * GET /ballots/{ballotId}
 *		Get ballot details
 *		URL parameters:
 *			ballotId:any 	The ballot identifier
 *		Return an object that is the identified ballot
 *
 * GET /ballots
 *		Get ballots
 *		Returns an array of ballot objects
 *
 * POST /ballots
 *		Add ballots
 *		Body is an array of ballot objects
 *		Returns an array of ballot objects as added
 *
 * PATCH /ballots
 *		Update ballots
 *		Body is an array of objects with shape {id:number, changes:object}
 *		Returns and array of ballot objects as updated
 *
 * DELETE /ballots
 *		Delete ballots
 *		Body is an array of ballot identifiers.
 *		Returns the number of ballots deleted.
 */

import {Router} from 'express';

import {
	getBallot,
	getBallots,
	updateBallots,
	addBallots,
	deleteBallots
} from '../services/ballots';

const router = Router();

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
