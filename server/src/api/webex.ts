/*
 * Webex accounts and meetings API
 */
import { Router, Request } from 'express';
import { isPlainObject } from '../utils';
import { AccessLevel } from '../auth/access';
import {
	getWebexAccounts,
	updateWebexAccount,
	addWebexAccount,
	deleteWebexAccount,
	getWebexMeetings,
	addWebexMeetings,
	updateWebexMeetings,
	deleteWebexMeetings
} from '../services/webex';

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
		.get(async (req, res, next) => {
			try {
				const data = await getWebexAccounts();
				res.json(data);
			}
			catch(err) {next(err)}
		})
		.post(async (req, res, next) => {
			try {
				const account = req.body;
				if (!isPlainObject(account))
					throw new TypeError('Bad or missing body; expected object');
				const data = await addWebexAccount(account);
				res.json(data);
			}
			catch(err) {next(err)}
		});

router
	.route('/accounts/:accountId(\\d+)')
		.patch(async (req, res, next) => {
			const accountId = Number(req.params.accountId);
			try {
				const changes = req.body;
				if (!isPlainObject(changes))
					throw new TypeError('Bad or missing; expected object');
				const data = await updateWebexAccount(accountId, changes);
				res.json(data);
			}
			catch(err) {next(err)}
		})
		.delete(async (req, res, next) => {
			const accountId = Number(req.params.accountId);
			try {
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

router
	.route('/meetings')
		.get(async (req: Request<unknown, unknown, unknown, Parameters<typeof getWebexMeetings>[0]>, res, next) => {
			try {
				const data = await getWebexMeetings(req.query);
				res.json(data);
			}
			catch(err) {next(err)}
		})
		.post(async (req, res, next) => {
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
		})
		.patch(async (req, res, next) => {
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
		})
		.delete(async (req, res, next) => {
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
