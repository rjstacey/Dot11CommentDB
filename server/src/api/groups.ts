/*
 * Groups API
 *
 * GET /
 *		Returns an array of group objects.
 *
 * POST /
 *		Add groups.
 *		Body is an array of group objects to be added.
 *		Returns an array of group objects as added
 *
 * PUT /
 *		Update groups.
 *		Body is an array of objects with shape {id, changes}, where id identifies the group and changes is an object
 *		with parameters to be changed.
 *		Returns an array of group objects as updated.
 *
 * DELETE /
 *		Delete groups.
 *		Body is an array of group identifiers.
 *		Returns the number of groups deleted.
 */
import {Router} from 'express';

import {
	getGroups,
	addGroups,
	updateGroups,
	removeGroups
} from '../services/groups';

const router = Router();

router.get('/$', async (req, res, next) => {
	try {
		const data = await getGroups();
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/$', async (req, res, next) => {
	try {
		const groups = req.body;
		if (!Array.isArray(groups))
			throw TypeError('Bad or missing array of groups');
		const data = await addGroups(groups);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.put('/$', async (req, res, next) => {
	try {
		const updates = req.body;
		if (!Array.isArray(updates))
			throw TypeError('Bad or missing array of updates');
		const data = await updateGroups(updates);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/$', async (req, res, next) => {
	try {
		const ids = req.body;
		if (!Array.isArray(ids))
			throw TypeError('Bad or missing array of ids');
		const data = await removeGroups(ids);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
