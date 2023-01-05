/*
 * Officers API
 *
 * GET /
 *		Get a list of officers
 *		Returns an array of officer objects.
 *
 * POST /
 *		Add officers.
 *		Body is an array of officer objects to be added.
 *		Returns an array of officer objects.
 *
 * PATCH /
 *		Update officers.
 *		Body is an array of update objects in shape {id, changes}, where id identifies the officer and
 *		changes is an object with paramters to change.
 *		Returns an array of officer objects.
 *
 * DELETE /
 *		Delete officers.
 *		Body is an array of ids identifying the officers to be deleted.
 *		Returns the number of officers deleted.
 */
import {Router} from 'express';

import {
	getOfficers,
	addOfficers,
	updateOfficers,
	removeOfficers
} from '../services/officers';

const router = Router();

router.get('/$', async (req, res, next) => {
	try {
		const data = await getOfficers();
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/$', async (req, res, next) => {
	try {
		const officers = req.body;
		if (!Array.isArray(officers))
			throw TypeError('Bad or missing array of groups');
		const data = await addOfficers(officers);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/$', async (req, res, next) => {
	try {
		const updates = req.body;
		if (!Array.isArray(updates))
			throw TypeError('Bad or missing array of updates');
		const data = await updateOfficers(updates);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/$', async (req, res, next) => {
	try {
		const ids = req.body;
		if (!Array.isArray(ids))
			throw TypeError('Bad or missing array of ids');
		const data = await removeOfficers(ids);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
