/*
 * Webex accounts and meetings API
 */
import {Router, Request} from 'express';

import {isPlainObject} from '../utils';

import {
	getWebexAccounts,
	updateWebexAccount,
	addWebexAccount,
	deleteWebexAccount,
	addWebexMeetings,
	updateWebexMeetings,
	deleteWebexMeetings
} from '../services/webex';

// @ts-ignore
import {getWebexMeetings} from '../services/webex';

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
			throw new TypeError('Bad or missing body; expected object');
		const data = await addWebexAccount(account);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/accounts/:accountId(\\d+)', async (req, res, next) => {
	try {
		const accountId = Number(req.params.accountId);
		const changes = req.body;
		if (!isPlainObject(changes))
			throw new TypeError('Bad or missing; expected object');
		const data = await updateWebexAccount(accountId, changes);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/accounts/:accountId(\\d+)', async (req, res, next) => {
	try {
		const accountId = Number(req.params.accountId);
		const data = await deleteWebexAccount(accountId);
		res.json(data);
	}
	catch(err) {next(err)}
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

router.get('/meetings', async (req: Request<unknown, unknown, unknown, Parameters<typeof getWebexMeetings>[0]>, res, next) => {
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
			throw new TypeError('Bad or missing array of Webex meeting objects');
		if (!meetings.every(meeting => isPlainObject(meeting) && typeof meeting.accountId === 'number'))
			throw new TypeError('Expected an array of objects with shape {accountId: number, ...params');
		const data = await addWebexMeetings(meetings);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/meetings', async (req, res, next) => {
	try {
		const meetings = req.body;
		if (!Array.isArray(meetings))
			throw new TypeError('Bad or missing array of Webex meeting objects');
		if (!meetings.every(meeting => isPlainObject(meeting) && typeof meeting.accountId === 'number' && typeof meeting.id === 'string'))
			throw new TypeError('Expected an array of objects with shape {accountId: number, id: string, ...changes}');
		const data = await updateWebexMeetings(meetings);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/meetings', async (req, res, next) => {
	try {
		const meetings = req.body;
		if (!Array.isArray(meetings))
			throw new TypeError('Bad or missing array of Webex meeting objects');
		if (!meetings.every(meeting => isPlainObject(meeting) && typeof meeting.accountId === 'number' && typeof meeting.id === 'string'))
			throw new TypeError('Expected an array of objects with shape {accountId: number, id: string}');
		const data = await deleteWebexMeetings(meetings);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
