/*
 * Google calendar accounts API
 *
 * GET /accounts
 *		Get a list of calendar accounts
 *
 * POST /accounts
 *		Add a calendar account.
 *		Body is an object that is the account to be added.
 *		Returns an object that is the account added.
 *
 * PATCH /accounts/{accountId}
 *		Update a calendar account
 *		URL parameters:
 *			accoundId:any 	Identified the account
 *		Body is an object with parameters to be changed.
 *		Returns an object that is the updated account.
 *
 * PATCH /accounts/{accountId}/revoke
 *		Revoke access to a calendar account.
 *		URL parameters:
 *			accoundId:any 	Identifies the account
 *		Returns an object that is the updated account.
 *
 * DELETE /accounts/{accountId}
 * 		Delete a calendar account.
 *		URL parameters:
 *			accoundId:any 	Identifies the account
 *		Returns 1.
 */
import { Router } from "express";

import { ForbiddenError } from "../utils";
import { AccessLevel } from "../auth/access";
import {
	getCalendarAccounts,
	addCalendarAccount,
	updateCalendarAccount,
	revokeAuthCalendarAccount,
	deleteCalendarAccount,
} from "../services/calendar";

const router = Router();

router
	.all("*", (req, res, next) => {
		if (!req.group) return next(new Error("Group not set"));

		const access = req.group.permissions.meetings || AccessLevel.none;

		if (req.method === "GET" && access >= AccessLevel.ro) return next();
		if (req.method === "PATCH" && access >= AccessLevel.rw) return next();
		if (
			(req.method === "DELETE" || req.method === "POST") &&
			access >= AccessLevel.admin
		)
			return next();

		next(new ForbiddenError("Insufficient karma"));
	})
	.route("/accounts")
		.get((req, res, next) => {
			getCalendarAccounts(req, req.user, {groupId: req.group!.id})
				.then((data) => res.json(data))
				.catch(next);
		})
		.post((req, res, next) => {
			const account = req.body;
			addCalendarAccount(req, req.user, req.group!.id, account)
				.then((data) => res.json(data))
				.catch(next);
		});

router
	.patch("/accounts/:accountId(\\d+)", (req, res, next) => {
		const accountId = Number(req.params.accountId);
		const changes = req.body;
		updateCalendarAccount(req, req.user, req.group!.id, accountId, changes)
			.then((data) => res.json(data))
			.catch(next)
	})
	.patch("/accounts/:accountId(\\d+)/revoke", (req, res, next) => {
		const accountId = Number(req.params.accountId);
		revokeAuthCalendarAccount(req, req.user, req.group!.id, accountId)
			.then((data) => res.json(data))
			.catch(next);
	})
	.delete("/accounts/:accountId(\\d+)", (req, res, next) => {
		const accountId = Number(req.params.accountId);
		deleteCalendarAccount(req.group!.id, accountId)
			.then((data) => res.json(data))
			.catch(next);
	});

export default router;
