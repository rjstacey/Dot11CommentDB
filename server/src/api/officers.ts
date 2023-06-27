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
import { Router } from 'express';
import { ForbiddenError } from '../utils';
import { AccessLevel } from '../auth/access';
import {
	getOfficers,
	addOfficers,
	updateOfficers,
	removeOfficers,
	validateOfficers,
	validateOfficerUpdates,
	validateOfficerIds
} from '../services/officers';

const router = Router();

router
	.all('*', (req, res, next) => {
		if (!req.group)
			return next(new Error("Group not set"));

		const access = req.group.permissions.members || AccessLevel.none;
		if (access >= AccessLevel.admin)
			return next();
		
		next(new ForbiddenError("Insufficient karma"));
	})
	.route('/')
		.get((req, res, next) => {
			const parentGroupId = req.group!.id;
			getOfficers({parentGroupId})
				.then(data => res.json(data))
				.catch(next);
		})
		.post((req, res, next) => {
			const officers = req.body;
			try {validateOfficers(officers)}
			catch (error) {
				return next(error);
			}
			addOfficers(req.user, req.group!, officers)
				.then(data => res.json(data))
				.catch(next);
		})
		.patch((req, res, next) => {
			const updates = req.body;
			try {validateOfficerUpdates(updates)}
			catch (error) {
				return next(error);
			}
			updateOfficers(req.user, req.group!, updates)
				.then(data => res.json(data))
				.catch(next);
		})
		.delete((req, res, next) => {
			const ids = req.body;
			try {validateOfficerIds(ids)}
			catch (error) {
				return next(error);
			}
			removeOfficers(req.user, req.group!, ids)
				.then(data => res.json(data))
				.catch(next);
		});

export default router;
