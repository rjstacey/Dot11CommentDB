/*
 * Groups API
 *
 * GET /groups
 *		Returns an array of groups
 *
 * POST /groups (groups[])
 *		Add groups. Body contains an array of group objects.
 *		Returns an array of groups added
 *
 * PUT /groups (updates[])
 *		Update groups. Body contains an array of updates, objects with shape {id, changes}, where changes is an object with parameters that are changed.
 *		Returns an arrays of groups updated.
 *
 * DELETE /groups (ids[])
 *		Delete groups. Body contains an array of group IDs.
 *		Returns the number of groups deleted.
 */

import {
	getGroups,
	addGroups,
	updateGroups,
	removeGroups
} from '../services/groups';

const router = require('express').Router();

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
