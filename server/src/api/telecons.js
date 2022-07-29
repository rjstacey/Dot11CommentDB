/*
 * Telecons API
 *
 * Maintain telecons list.
 * 
 * GET /telecons/{group}: return the complete list of telecons for a particular group.
 * PATCH /telecons: update the identified telecon and returns the updated field values.
 * POST /telecons: add a telecon and returns the complete entry as added.
 * DELETE /telecons: delete telecon identified by a list of IDs. Returns null.
 */

import {
	getTelecons,
	updateTelecons,
	addTelecons,
	deleteTelecons,
	addWebexMeetingToTelecons,
	removeWebexMeetingFromTelecons,
	syncTeleconsWithWebex,
	syncTeleconsWithCalendar
} from '../services/telecons'

const router = require('express').Router();

router.get('/:parent_id?', async (req, res, next) => {
	try {
		const {parent_id} = req.params;
		const data = await getTelecons({parent_id, ...req.query});
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/$', async (req, res, next) => {
	try {
		const updates = req.body;
		if (!Array.isArray(updates))
			throw 'Missing or bad body; expected array';
		const data = await updateTelecons(updates);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/webexMeeting$', async (req, res, next) => {
	try {
		const telecons = req.body;
		if (!Array.isArray(telecons))
			throw 'Missing or bad body; expected array';
		const data = await addWebexMeetingToTelecons(telecons);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/webexMeeting$', async (req, res, next) => {
	try {
		const telecons = req.body;
		if (!Array.isArray(telecons))
			throw 'Missing or bad body; expected array';
		const data = await removeWebexMeetingFromTelecons(telecons);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/syncWebex$', async (req, res, next) => {
	try {
		const ids = req.body;
		if (!Array.isArray(ids))
			throw 'Missing or bad body; expected array';
		const data = await syncTeleconsWithWebex(ids);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/syncCalendar$', async (req, res, next) => {
	try {
		const ids = req.body;
		if (!Array.isArray(ids))
			throw 'Missing or bad body; expected array';
		const data = await syncTeleconsWithCalendar(ids);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/$', async (req, res, next) => {
	try {
		const telecons = req.body;
		if (!Array.isArray(telecons))
			throw 'Missing or bad body; expected array';
		const data = await addTelecons(telecons);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/$', async (req, res, next) => {
	try {
		const ids = req.body;
		if (!Array.isArray(ids))
			throw 'Missing or bad body; expected array';
		const data = await deleteTelecons(ids);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
