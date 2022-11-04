/*
 * Webex accounts and meetings API
 */
import {isPlainObject} from '../utils';

import {
	completeAuthWebexAccount,
	getWebexAccounts,
	updateWebexAccount,
	addWebexAccount,
	deleteWebexAccount,
	getWebexMeetings,
	addWebexMeetings,
	updateWebexMeetings,
	deleteWebexMeetings
} from '../services/webex';

const router = require('express').Router();

/*
 * Webex accounts API
 *
 * GET /webex/accounts
 *		Get a list of calendar accounts
 *
 * POST /webex/accounts (account)
 *		Add a Webex account. Body contains an object that is the account to be added.
 *		Returns an object that is the account added.
 *
 * PATCH /webex/accounts/{accountId} (changes)
 *		Update a Webex account identified by accountId. Body contains an object with parameters to change.
 *		Returns an object that is the updated account.
 *
 * DELETE /webex/accounts/{accountId} ()
 * 		Delete the Webex account identified by accountId.
 *		Returns 1.
 */
router.post('/auth', async (req, res, next) => {
	try {
		const params = req.body;
		if (typeof params !== 'object')
			throw new Error('Missing or bad body; expected object');
		const data = await completeAuthWebexAccount(params);
		res.json(data);
	}
	catch (err) {next(err)}
});

router.get('/accounts$', async (req, res, next) => {
	try {
		const data = await getWebexAccounts();
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/accounts$', async (req, res, next) => {
	try {
		const account = req.body;
		if (!isPlainObject(account))
			throw new Error('Missing or bad body; expected object');
		const data = await addWebexAccount(account);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/accounts/:accountId', async (req, res, next) => {
	try {
		const {accountId} = req.params;
		const changes = req.body;
		if (!isPlainObject(changes))
			throw new Error('Missing or bad body; expected object');
		const data = await updateWebexAccount(accountId, changes);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/accounts/:accountId', async (req, res, next) => {
	try {
		const {accountId} = req.params;
		const data = await deleteWebexAccount(accountId);
		res.json(data);
	}
	catch(err) {next(err)}
});


/*
 * Webex Meetings API
 *
 * GET /webex/meetings?constraints
 * 		Get a list of webex meetings. Optionally specify constraints (such as groupId, fromDate, toDate) for which the meetings are requested.
 *		Returns an array of meetings.
 *
 * POST /webex/meetings (meetings[])
 * 		Create webex meetings. Body contains an array of meetings with shape {accountId, ...meeting}, where accountId identifies
 *		the Webex account and the remaining parameters are the meeting parameters.
 *		Returns an array of meetings that were added.
 *
 * PATCH /webex/meetings (meetings[])
 *		Update Webex meetings. Body contains an array of meetings with shape {accountId, id, ...meeting}, where accountId identifies
 *		the Webex account, id identifies the meeting instance and remaining parameters are meeting parameters.
 *		Returns an array of meetings that were updated.
 * 
 * DELETE /webex/meetings (meetings[])
 *		Delete Webex meetings. Body contains an array of meetings with shape {accountId, id}, where the accountId identifies
 *		the Webex account and the id identifies the meeting instance.
 *		Returns the number of meetings deleted.
 */

router.get('/meetings', async (req, res, next) => {
	try {
		const data = await getWebexMeetings(req.query);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/meetings', async (req, res, next) => {
	try {
		const meetings = req.body;
		if (!Array.isArray(meetings))
			throw new TypeError('Missing or bad body; expected array')
		const data = await addWebexMeetings(meetings);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/meetings', async (req, res, next) => {
	try {
		const meetings = req.body;
		if (!Array.isArray(meetings))
			throw new TypeError('Missing or bad body; expected array')
		const data = await updateWebexMeetings(meetings);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/meetings', async (req, res, next) => {
	try {
		const meetings = req.body;
		if (!Array.isArray(meetings))
			throw new TypeError('Missing or bad body; expected array')
		const data = await deleteWebexMeetings(meetings);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
