/*
 * Webex accounts and meetings API
 */
import { Router } from "express";
import { ForbiddenError } from "../utils";
import { AccessLevel } from "../auth/access";
import {
	getWebexAccounts,
	updateWebexAccount,
	addWebexAccount,
	deleteWebexAccount,
	getWebexMeetings,
	addWebexMeetings,
	updateWebexMeetings,
	deleteWebexMeetings,
} from "../services/webex";

const router = Router();

/*
 * Webex accounts API
 *
 * GET /accounts
 *		Get a list of calendar accounts
 *
 * POST /accounts
 *		Add a Webex account.
 *		Body is an object that is the account to be added.
 *		Returns an object that is the account as added.
 *
 * PATCH /accounts/{accountId}
 *		Update a Webex account.
 *		URL parameters:
 *			accountId:number 	Identifies the account.
 *		Body is an object with parameters to change.
 *		Returns an object that is the account as updated.
 *
 * DELETE /accounts/{accountId}
 * 		Delete a Webex account.
 *		URL parameters:
 *			accountId:number 	Identifies the account.
 *		Returns 1.
 */
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
			getWebexAccounts(req, req.user, {groupId: req.group!.id})
				.then((data) => res.json(data))
				.catch(next);
		})
		.post((req, res, next) => {
			const account = req.body;
			addWebexAccount(req, req.user, req.group!.id, account)
				.then((data) => res.json(data))
				.catch(next);
		});

router
	.route("/accounts/:accountId(\\d+)")
		.patch((req, res, next) => {
			const accountId = Number(req.params.accountId);
			const changes = req.body;
			updateWebexAccount(req, req.user, req.group!.id, accountId, changes)
				.then((data) => res.json(data))
				.catch(next);
		})
		.delete((req, res, next) => {
			const accountId = Number(req.params.accountId);
			deleteWebexAccount(req.group!.id, accountId)
				.then((data) => res.json(data))
				.catch(next);
		});

/*
 * Webex Meetings API
 *
 * GET /meetings
 * 		Get a list of webex meetings.
 *		Query parameters:
 *			groupId:any 	Identifies the parent group to which the meetings belong (optional).
 *			fromDate:string ISO date. Meetings that start after this date (optional).
 *			toDate:string 	ISO date. Meetings that start before this date (optional).
 *		Returns an array of meetings.
 *
 * POST /meetings
 * 		Create webex meetings.
 *		Body is an array of meetings with shape {accountId, ...params}, where accountId identifies
 *		the Webex account and the remaining parameters are the meeting parameters.
 *		Returns an array of meetings as added.
 *
 * PATCH /meetings
 *		Update Webex meetings.
 *		Body is an array of meetings with shape {accountId, id, ...changes}, where accountId identifies
 *		the Webex account, id identifies the meeting instance and the remaining parameters are meeting parameters.
 *		Returns an array of meetings that were updated.
 *
 * DELETE /meetings
 *		Delete Webex meetings.
 *		Body is an array of meetings with shape {accountId, id}, where the accountId identifies
 *		the Webex account and the id identifies the meeting instance.
 *		Returns the number of meetings deleted.
 */

router
	.route("/meetings")
		.get((req, res, next) => {
			const group = req.group!;
			getWebexMeetings({groupId: group.id, ...req.query})
				.then((data) => res.json(data))
				.catch(next);
		})
		.post((req, res, next) => {
			const webexMeetings = req.body;
			addWebexMeetings(webexMeetings)
				.then((data) => res.json(data))
				.catch(next);
		})
		.patch((req, res, next) => {
			const webexMeetings = req.body;
			updateWebexMeetings(webexMeetings)
				.then((data) => res.json(data))
				.catch(next);
		})
		.delete((req, res, next) => {
			const webexMeetings = req.body;
			deleteWebexMeetings(webexMeetings)
				.then((data) => res.json(data))
				.catch(next);
		});

export default router;
