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
 * PATCH /
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
import { getGroups,	addGroups, updateGroups, removeGroups } from '../services/groups';

const router = Router();

router.get('/:parentName?', async (req, res, next) => {
	try {
		const {parentName} = req.params;
		const data = await getGroups(req.user, {parentName, ...req.query});
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/', async (req, res, next) => {
	try {
		const data = await addGroups(req.user, req.body);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/', async (req, res, next) => {
	try {
		const data = await updateGroups(req.user, req.body);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/', async (req, res, next) => {
	try {
		const data = await removeGroups(req.user, req.body);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
