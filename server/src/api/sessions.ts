/*
 * Sessions API
 *
 * GET /
 *		Get sessions.
 *		Return and array of session objects.
 *
 * POST /
 *		Add a session.
 *		Body is the session object to be added.
 *		Returns the session object as added.
 *
 * PATCH /
 * 		Update a session.
 *		Body is an object with shape {id, changes}.
 *		Returns the session object as updated.
 *
 * DELETE /
 *		Delete sessions.
 *		Body contains an array of session identifiers.
 *		Returns the number of sessions deleted.
 *
 */
import { Router } from "express";

import { isPlainObject } from "../utils";
import {
	getSessions,
	updateSession,
	addSession,
	deleteSessions,
} from "../services/sessions";

const router = Router();

router
	.route("/")
		.get((req, res, next) => {
			getSessions(req.query)
				.then((data) => res.json(data))
				.catch(next);
		})
		.post((req, res, next) => {
			const session = req.body;
			if (!isPlainObject(session))
				return next(new TypeError("Bad or missing body; expected object"));
			addSession(session)
				.then((data) => res.json(data))
				.catch(next);
		})
		.patch((req, res, next) => {
			if (!isPlainObject(req.body))
				return next(new TypeError("Bad or missing session object"));
			const { id, changes } = req.body;
			if (typeof id !== "number" || !isPlainObject(changes))
				return next(
					new TypeError(
						"Bad body; expected update object with shape {id, changes}"
					)
				);
			updateSession(id, changes)
				.then((data) => res.json(data))
				.catch(next);
		})
		.delete((req, res, next) => {
			const ids = req.body;
			if (!Array.isArray(ids))
				return next(
					new TypeError("Bad or missing array of session identifiers")
				);
			if (!ids.every((id) => typeof id === "number"))
				return next(new TypeError("Expected an array of numbers"));
			deleteSessions(ids)
				.then((data) => res.json(data))
				.catch(next);
		});

export default router;
