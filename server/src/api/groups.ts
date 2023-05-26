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
import { Router } from 'express';
import { isPlainObject } from '../utils';
import {
	getGroups,
	addGroups,
	updateGroups,
	removeGroups
} from '../services/groups';

const router = Router();

router.get('/:parentName?', async (req, res, next) => {
	try {
		const {parentName} = req.params;
		const data = await getGroups({parentName});
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/$', async (req, res, next) => {
	try {
		const groups = req.body;
		if (!Array.isArray(groups))
			throw new TypeError('Bad or missing array of group objects');
		if (!groups.every(group => isPlainObject(group)))
			throw new TypeError('Expected an array of objects');
		const data = await addGroups(groups);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.put('/$', async (req, res, next) => {
	try {
		const updates = req.body;
		if (!Array.isArray(updates))
			throw new TypeError('Bad or missing array of group updates');
		if (!updates.every(u => isPlainObject(u) && typeof u.id === 'string' && isPlainObject(u.changes)))
			throw new TypeError('Expected array of objects to have shape {id, changes}');
		const data = await updateGroups(updates);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/$', async (req, res, next) => {
	try {
		const ids = req.body;
		if (!Array.isArray(ids))
			throw TypeError('Bad or missing array of group identifiers');
		if (!ids.every(id => typeof id === 'string'))
			throw new TypeError('Expected an array of strings');
		const data = await removeGroups(ids);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
