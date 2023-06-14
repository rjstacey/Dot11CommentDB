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

router
	.get('/:parentName?', (req, res, next) => {
		const {parentName} = req.params;
		console.log(req.query)
		getGroups(req.user, {parentName, ...req.query})
			.then(data => res.json(data))
			.catch(next);
	})
	.route('/')
		.post((req, res, next) => {
			addGroups(req.user, req.body)
				.then(data => res.json(data))
				.catch(next);
		})
		.patch((req, res, next) => {
			updateGroups(req.user, req.body)
				.then(data => res.json(data))
				.catch(next);
		})
		.delete((req, res, next) => {
			removeGroups(req.user, req.body)
				.then(data => res.json(data))
				.catch(next);
		});

export default router;
