/*
 * Google calendar accounts API
 */
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
		const {id} = req.params;
		const entry = req.body;
		if (typeof entry !== 'object')
			throw 'Missing or bad body; expected object';
		const data = await addCalendarAccount(entry);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/accounts/:id$', async (req, res, next) => {
	try {
		const {id} = req.params;
		const changes = req.body;
		if (typeof changes !== 'object')
			throw 'Missing or bad body; expected object';
		const data = await updateCalendarAccount(id, changes);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/accounts/:id/revoke$', async (req, res, next) => {
	try {
		const {id} = req.params;
		const data = await revokeAuthCalendarAccount(id);
		res.json(data);
	}
	catch (err) {next(err)}
});

router.delete('/accounts/:id$', async (req, res, next) => {
	try {
		const {id} = req.params;
		const data = await deleteCalendarAccount(id);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
