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

import { Router } from 'express';

import {
	getBallot,
	getBallots,
	updateBallots,
	addBallots,
	deleteBallots,
	getBallotPermissions
} from '../services/ballots';

const router = Router();

router.get('/:ballot_id(\\d+)', async (req, res, next) => {
	try {
		const ballot_id = Number(req.params.ballot_id);
		const data = await getBallot(ballot_id);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/:ballot_id(\\d+)/permissions', async (req, res, next) => {
	try {
		const ballot_id = Number(req.params.ballot_id);
		const data = await getBallotPermissions(req.user, ballot_id);
		res.json(data);
	}
	catch(err) {next(err)}
});


router.get('/', async (req, res, next) => {
	try {
		res.json(await getBallots());
	}
	catch(err) {next(err)}
});

router.post('/', async (req, res, next) => {
	try {
		const data = await addBallots(req.user, req.body);
		res.json(data)
	}
	catch(err) {next(err)}
});

router.patch('/', async (req, res, next) => {
	try {
		const data = await updateBallots(req.user, req.body);
		res.json(data);
	}
	catch(err) {next(err)}
});


router.delete('/', async (req, res, next) => {
	try {
		const data = await deleteBallots(req.user, req.body);
		res.json(data)
	}
	catch(err) {next(err)}
});

export default router;
