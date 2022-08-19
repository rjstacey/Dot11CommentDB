/*
 * Google calendar accounts API
 */
import {
	getAuthCalendarAccount,
	completeAuthCalendarAccount,
	revokeAuthCalendarAccount,
	getCalendarAccounts,
	updateCalendarAccount,
	addCalendarAccount,
	deleteCalendarAccount,
	getPrimaryCalendar,
} from '../services/calendar';

const router = require('express').Router();

router.get('/auth/:id', async (req, res, next) => {
	try {
		const {id} = req.params;
		const params = req.query;
		const data = await getAuthCalendarAccount(id, params);
		res.json(data);
	}
	catch (err) {next(err)}
});

router.post('/auth', async (req, res, next) => {
	try {
		const params = req.body;
		if (typeof params !== 'object')
			throw new Error('Missing or bad body; expected object');
		const data = await completeAuthCalendarAccount(params);
		res.json(data);
	}
	catch (err) {next(err)}
});

router.delete('/auth/:id', async (req, res, next) => {
	try {
		const {id} = req.params;
		const data = await revokeAuthCalendarAccount(id);
		res.json(data);
	}
	catch (err) {next(err)}
});

router.get('/accounts', async (req, res, next) => {
	try {
		const data = await getCalendarAccounts();
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/accounts/:id', async (req, res, next) => {
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

router.delete('/accounts/:id', async (req, res, next) => {
	try {
		const {id} = req.params;
		const data = await deleteCalendarAccount(id);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/list/:id', async (req, res, next) => {
	try {
		const {id} = req.params;
		const data = await getPrimaryCalendar(id);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
