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

import { Router } from "express";
import { ForbiddenError } from "../utils";
import { AccessLevel } from "../auth/access";
import {
	getBallots,
	updateBallots,
	addBallots,
	deleteBallots,
	validBallots,
	validBallotUpdates,
	validBallotIds,
} from "../services/ballots";

const router = Router();

router
	.all("*", (req, res, next) => {
		if (!req.group) return next(new Error("Group not set"));

		const access = req.group.permissions.ballots || AccessLevel.none;

		if (req.method === "GET" && access >= AccessLevel.ro) return next();
		if (req.method === "PATCH" && access >= AccessLevel.rw) return next();
		if (
			(req.method === "POST" || req.method === "DELETE") &&
			access >= AccessLevel.admin
		)
			return next();

		next(new ForbiddenError("Insufficient karma"));
	})
	.route("/")
		.get((req, res, next) => {
			const workingGroupId = req.group!.id;
			getBallots({workingGroupId})
				.then((data) => res.json(data))
				.catch(next);
		})
		.post((req, res, next) => {
			const ballots = req.body;
			if (!validBallots(ballots))
				return next(
					new TypeError("Bad or missing array of ballot objects")
				);
			addBallots(req.user, req.group!, ballots)
				.then((data) => res.json(data))
				.catch(next);
		})
		.patch((req, res, next) => {
			const updates = req.body;
			if (!validBallotUpdates(updates))
				return next(
					new TypeError(
						"Bad or missing array of updates; expected array of {id: number, changes: object}"
					)
				);
			updateBallots(req.user, req.group!, updates)
				.then((data) => res.json(data))
				.catch(next);
		})
		.delete((req, res, next) => {
			const ids = req.body;
			if (!validBallotIds(ids))
				return next(
					new TypeError(
						"Bad or missing array of ballot identifiers; expect number[]"
					)
				);
			deleteBallots(req.user, req.group!, ids)
				.then((data) => res.json(data))
				.catch(next);
		});

export default router;
