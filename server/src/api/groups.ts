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
import { Router } from "express";
import {
	getGroups,
	addGroups,
	updateGroups,
	removeGroups,
	validateGroups,
	validateGroupUpdates,
	validateGroupIds,
} from "../services/groups";

const router = Router();

router
	.get("/:parentName?", (req, res, next) => {
		const { parentName } = req.params;
		getGroups(req.user, { parentName, ...req.query })
			.then((data) => res.json(data))
			.catch(next);
	})
	.route("/")
		.post((req, res, next) => {
			const groups = req.body;
			try {
				validateGroups(groups);
			} catch (error) {
				return next(error);
			}
			addGroups(req.user, groups)
				.then((data) => res.json(data))
				.catch(next);
		})
		.patch((req, res, next) => {
			const updates = req.body;
			try {
				validateGroupUpdates(updates);
			} catch (error) {
				return next(error);
			}
			updateGroups(req.user, updates)
				.then((data) => res.json(data))
				.catch(next);
		})
		.delete((req, res, next) => {
			const ids = req.body;
			try {
				validateGroupIds(ids);
			} catch (error) {
				return next(error);
			}
			removeGroups(req.user, ids)
				.then((data) => res.json(data))
				.catch(next);
		});

export default router;
