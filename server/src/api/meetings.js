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
	getMeetings,
	updateMeetings,
	addMeetings,
	deleteMeetings,
} from '../services/meetings';

const router = require('express').Router();

router.get('/:groupId?', async (req, res, next) => {
	try {
		const {groupId} = req.params;
		const data = await getMeetings({groupId, ...req.query});
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/$', async (req, res, next) => {
	try {
		const updates = req.body;
		if (!Array.isArray(updates))
			throw 'Missing or bad body; expected array';
		const data = await updateMeetings(req.user, updates);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/$', async (req, res, next) => {
	try {
		const telecons = req.body;
		if (!Array.isArray(telecons))
			throw 'Missing or bad body; expected array';
		const data = await addMeetings(req.user, telecons);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/$', async (req, res, next) => {
	try {
		const ids = req.body;
		if (!Array.isArray(ids))
			throw 'Missing or bad body; expected array';
		const data = await deleteMeetings(req.user, ids);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
