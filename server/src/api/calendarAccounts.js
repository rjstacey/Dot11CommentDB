/*
 * Google calendar accounts API
 */
import {
	authCalendarAccount,
	getCalendarAccounts,
	updateCalendarAccount,
	addCalendarAccount,
	deleteCalendarAccount
} from '../services/calendar';

const router = require('express').Router();

router.post('/auth/:id', async (req, res, next) => {
	try {
		const {id} = req.params;
		const entry = req.body;
		if (typeof entry !== 'object')
			throw 'Missing or bad body; expected object';
		const data = await authCalendarAccount(id, entry);
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

router.patch('/account/:id', async (req, res, next) => {
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

router.post('/account', async (req, res, next) => {
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

router.delete('/account/:id', async (req, res, next) => {
	try {
		const {id} = req.params;
		const data = await deleteCalendarAccount(id);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
