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
import {Router} from 'express';

import {isPlainObject} from '../utils';

import {
	getAuthCalendarAccount,
	getCalendarAccounts,
	addCalendarAccount,
	updateCalendarAccount,
	revokeAuthCalendarAccount,
	deleteCalendarAccount,
} from '../services/calendar';

const router = Router();

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
