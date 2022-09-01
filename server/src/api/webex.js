/*
 * Webex accounts API
 */

import {
	completeAuthWebexAccount,
	getWebexAccounts,
	updateWebexAccount,
	addWebexAccount,
	deleteWebexAccount,
	getWebexMeetings,
	addWebexMeetings,
	deleteWebexMeetings
} from '../services/webex';

const router = require('express').Router();

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

router.get('/accounts', async (req, res, next) => {
	try {
		const data = await getWebexAccounts();
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/accounts/:id', async (req, res, next) => {
	try {
		const {id} = req.params;
		const changes = req.body;
		if (typeof changes !== 'object')
			throw new Error('Missing or bad body; expected object');
		const data = await updateWebexAccount(id, changes);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/accounts', async (req, res, next) => {
	try {
		const entry = req.body;
		if (typeof entry !== 'object')
			throw new Error('Missing or bad body; expected object');
		const data = await addWebexAccount(entry);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/accounts/:id', async (req, res, next) => {
	try {
		const {id} = req.params;
		const data = await deleteWebexAccount(id);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/meetings/:groupId?', async (req, res, next) => {
	try {
		const {groupId} = req.params;
		const data = await getWebexMeetings({groupId, ...req.query});
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/meetings', async (req, res, next) => {
	try {
		const meetings = req.body;
		if (!Array.isArray(meetings))
			throw new Error('Missing or bad body; expected array')
		const data = await addWebexMeetings(meetings);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/meetings', async (req, res, next) => {
	try {
		const meetings = req.body;
		if (!Array.isArray(meetings))
			throw new Error('Missing or bad body; expected array')
		const data = await deleteWebexMeetings(meetings);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
