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
import { Router } from 'express';

import {isPlainObject} from '../utils';
import { AccessLevel } from '../auth/access';
import {
	getCalendarAccounts,
	addCalendarAccount,
	updateCalendarAccount,
	revokeAuthCalendarAccount,
	deleteCalendarAccount,
} from '../services/calendar';

const router = Router();

router
	.all('*', (req, res, next) => {
		if (!req.group)
			return res.status(500).send("Group not set");

			const access = req.group.permissions.meetings || AccessLevel.none;
		if (req.method === "GET" && access >= AccessLevel.ro)
			return next();
		if (req.method === "PATCH" && access >= AccessLevel.rw)
			return next();
		if ((req.method === "DELETE" || req.method === "POST") && access >= AccessLevel.admin)
			return next();
		res.status(403).send('Insufficient karma');
	})
	.route('/accounts')
		.get((req, res, next) => {
			getCalendarAccounts()
				.then(data => res.json(data))
				.catch(next);
		})
		.post((req, res, next) => {
			const account = req.body;
			if (!isPlainObject(account))
				return next(new TypeError('Missing or bad body; expected object'));
			addCalendarAccount(account)
				.then(data => res.json(data))
				.catch(next);
		})

router
	.patch('/accounts/:accountId(\\d+)/$', async (req, res, next) => {
		const accountId = Number(req.params.accountId);
		try {
			const changes = req.body;
			if (!isPlainObject(changes))
				throw 'Missing or bad body; expected object';
			const data = await updateCalendarAccount(accountId, changes);
			res.json(data);
		}
		catch(err) {next(err)}
	})
	.patch('/accounts/:accountId(\\d+)/revoke$', async (req, res, next) => {
		const accountId = Number(req.params.accountId);
		revokeAuthCalendarAccount(accountId)
			.then(data => res.json(data))
			.catch(next)
	})
	.delete('/accounts/:accountId(\\d+)/$', (req, res, next) => {
		const accountId = Number(req.params.accountId);
		deleteCalendarAccount(accountId)
			.then(data => res.json(data))
			.catch(next);
	});

export default router;
