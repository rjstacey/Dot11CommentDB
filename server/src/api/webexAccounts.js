/*
 * Webex accounts API
 */

import {
	authWebexAccount,
	getWebexAccounts,
	updateWebexAccount,
	addWebexAccount,
	deleteWebexAccount
} from '../services/webex';

const router = require('express').Router();

router.post('/auth/:id', async (req, res, next) => {
	try {
		const {id} = req.params;
		const entry = req.body;
		if (typeof entry !== 'object')
			throw 'Missing or bad body; expected object';
		const data = await authWebexAccount(id, entry);
		res.json(data);
	}
	catch (err) {next(err)}
});

router.get('/accounts', async (req, res, next) => {
	try {
		const data = await getWebexAccounts();
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
		const data = await updateWebexAccount(id, changes);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/account', async (req, res, next) => {
	try {
		const entry = req.body;
		if (typeof entry !== 'object')
			throw 'Missing or bad body; expected object';
		const data = await addWebexAccount(entry);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/account/:id', async (req, res, next) => {
	try {
		const {id} = req.params;
		const data = await deleteWebexAccount(id);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
