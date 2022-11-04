/*
 * Google calendar accounts API
 *
 * GET /calendar/accounts 
 *		Get a list of calendar accounts
 *
 * POST /calendar/accounts (account)
 *		Add a calendar account. Body contains an object that is the account to be added.
 *		Returns an object that is the account added.
 *
 * PATCH /calendar/accounts/{accountId} (changes)
 *		Update a calendar account identified by accountId. Body contains an object with parameters to change.
 *		Returns an object that is the updated account.
 *
 * PATCH /calendar/accounts/{accountId}/revoke
 *		Revoke access to a calendar account identified by accountId.
 *		Returns an object that is the updated account.
 *
 * DELETE /calendar/accounts/{accountId}
 * 		Delete the calendar account identified by accountId.
 *		Returns 1.
 */
import {isPlainObject} from '../utils';

import {
	getAuthCalendarAccount,
	getCalendarAccounts,
	addCalendarAccount,
	updateCalendarAccount,
	revokeAuthCalendarAccount,
	deleteCalendarAccount,
} from '../services/calendar';

const router = require('express').Router();

router.get('/accounts', async (req, res, next) => {
	try {
		const data = await getCalendarAccounts();
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/accounts', async (req, res, next) => {
	try {
		const account = req.body;
		if (!isPlainObject(account))
			throw 'Missing or bad body; expected object';
		const data = await addCalendarAccount(account);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/accounts/:accountId$', async (req, res, next) => {
	try {
		const {accountId} = req.params;
		const changes = req.body;
		if (!isPlainObject(changes))
			throw 'Missing or bad body; expected object';
		const data = await updateCalendarAccount(accountId, changes);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/accounts/:accountId/revoke$', async (req, res, next) => {
	try {
		const {accountId} = req.params;
		const data = await revokeAuthCalendarAccount(accountId);
		res.json(data);
	}
	catch (err) {next(err)}
});

router.delete('/accounts/:accountId$', async (req, res, next) => {
	try {
		const {accountId} = req.params;
		const data = await deleteCalendarAccount(accountId);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
