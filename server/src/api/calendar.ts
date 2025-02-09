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
import { Request, Response, NextFunction, Router } from "express";

import { ForbiddenError } from "../utils/index.js";
import { AccessLevel } from "../auth/access.js";
import {
	getCalendarAccounts,
	addCalendarAccount,
	updateCalendarAccount,
	revokeAuthCalendarAccount,
	deleteCalendarAccount,
} from "../services/calendar.js";
import {
	calendarAccountChangeSchema,
	calendarAccountCreateSchema,
} from "@schemas/calendar.js";

function validatePermissions(req: Request, res: Response, next: NextFunction) {
	try {
		if (!req.group) throw new Error("Group not set");

		const access = req.group.permissions.meetings || AccessLevel.none;
		const grant =
			(req.method === "GET" && access >= AccessLevel.ro) ||
			(req.method === "PATCH" && access >= AccessLevel.rw) ||
			((req.method === "DELETE" || req.method === "POST") &&
				access >= AccessLevel.admin);

		if (grant) return next();

		throw new ForbiddenError();
	} catch (error) {
		next(error);
	}
}

async function getAccounts(req: Request, res: Response, next: NextFunction) {
	const user = req.user;
	const groupId = req.group!.id;
	try {
		const data = await getCalendarAccounts(req, user, { groupId });
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function addAccount(req: Request, res: Response, next: NextFunction) {
	const user = req.user;
	const groupId = req.group!.id;
	try {
		const account = calendarAccountCreateSchema.parse(req.body);
		const data = await addCalendarAccount(req, user, groupId, account);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

async function updateAccount(req: Request, res: Response, next: NextFunction) {
	const user = req.user;
	const groupId = req.group!.id;
	const accountId = Number(req.params.accountId);
	try {
		const changes = calendarAccountChangeSchema.parse(req.body);
		const data = await updateCalendarAccount(
			req,
			user,
			groupId,
			accountId,
			changes
		);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

function revokeAccountAuth(req: Request, res: Response, next: NextFunction) {
	const user = req.user;
	const groupId = req.group!.id;
	const accountId = Number(req.params.accountId);
	try {
		const data = revokeAuthCalendarAccount(req, user, groupId, accountId);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

function removeAccount(req: Request, res: Response, next: NextFunction) {
	const groupId = req.group!.id;
	const accountId = Number(req.params.accountId);
	try {
		const data = deleteCalendarAccount(groupId, accountId);
		res.json(data);
	} catch (error) {
		next(error);
	}
}

const router = Router();
router
	.all("*", validatePermissions)
	.route("/accounts")
	.get(getAccounts)
	.post(addAccount);
router
	.patch("/accounts/:accountId(\\d+)", updateAccount)
	.patch("/accounts/:accountId(\\d+)/revoke", revokeAccountAuth)
	.delete("/accounts/:accountId(\\d+)", removeAccount);

export default router;
