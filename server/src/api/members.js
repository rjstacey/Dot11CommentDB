/*
 * Members API
 *
 * Maintain the members roster.
 * 
 * GET /users: returns the complete array of user entries in the database.
 * PUT /user/{userId}: updates entry for a specific user ID. Returns the complete entry for the updated user.
 * POST /user: adds a user to the database. Returns the complete entry for the user added.
 * DELETE /users: deletes users from list of user IDs. Returns null.
 * POST /users/upload: insert users from file. Returns the complete array of user entries in the database.
 * POST /users: insert or update users. Returns the complete entry for the user added.
 */
import {
	getMembersWithParticipation,
	getMembersSnapshot,
	updateMembers,
	updateMemberStatusChange,
	deleteMemberStatusChange,
	addMemberContactEmail,
	updateMemberContactEmail,
	deleteMemberContactEmail,
	addMembers,
	upsertMembers,
	deleteMembers,
	uploadMembers,
	importMyProjectRoster,
	exportMyProjectRoster
} from '../services/members';

const upload = require('multer')();
const router = require('express').Router();

router.get('/$', async (req, res, next) => {
	try {
		const data = await getMembersWithParticipation();
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/snapshot$', async (req, res, next) => {
	try {
		const {date} = req.body;
		const data = await getMembersSnapshot(date);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/$', async (req, res, next) => {
	try {
		const members = req.body;
		if (!Array.isArray(members))
			throw 'Bad or missing array of members';
		const data = await addMembers(members);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.put('/$', async (req, res, next) => {
	try {
		const members = req.body;
		if (!Array.isArray(members))
			throw 'Bad or missing array of members';
		const data = await upsertMembers(members);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/$', async (req, res, next) => {
	try {
		const {id} = req.params;
		const updates = req.body;
		if (!Array.isArray(updates))
			throw 'Bad or missing array of updates';
		const data = await updateMembers(updates);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/$', async (req, res, next) => {
	try {
		const ids = req.body;
		if (!Array.isArray(ids))
			throw 'Missing or bad array parameter';
		const data = await deleteMembers(ids);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/:id(\\d+)$', async (req, res, next) => {
	try {
		const {id} = req.params;
		const changes = req.body;
		if (typeof changes !== 'object')
			throw 'Bad or missing body; expected object';
		const data = await updateMember(id, changes);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/:id(\\d+)/StatusChangeHistory', async (req, res, next) => {
	try {
		const {id} = req.params;
		const statusChangeEntry = req.body;
		if (typeof statusChangeEntry !== 'object')
			throw 'Missing or bad StatusChangeHistory row object';
		const data = await updateMemberStatusChange(id, statusChangeEntry);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/:id(\\d+)/StatusChangeHistory', async (req, res, next) => {
	try {
		const {id} = req.params;
		const statusChangeEntry = req.body;
		if (typeof statusChangeEntry !== 'object')
			throw 'Missing or bad StatusChangeHistory row object';
		const data = await deleteMemberStatusChange(id, statusChangeEntry.id);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/:id(\\d+)/ContactEmails', async (req, res, next) => {
	try {
		const {id} = req.params;
		const entry = req.body;
		if (typeof entry !== 'object')
			throw 'Missing or bad ContactEmails row object';
		const data = await updateMemberContactEmail(id, entry);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/:id(\\d+)/ContactEmails', async (req, res, next) => {
	try {
		const {id} = req.params;
		const entry = req.body;
		if (typeof entry !== 'object')
			throw 'Missing or bad ContactEmails row object';
		const data = await addMemberContactEmail(id, entry);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/:id(\\d+)/ContactEmails', async (req, res, next) => {
	try {
		const {id} = req.params;
		const entry = req.body;
		if (typeof entry !== 'object')
			throw 'Missing or bad ContactEmails row object';
		const data = await deleteMemberContactEmail(id, entry);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/upload/:format', upload.single('File'), async (req, res, next) => {
	try {
		const {user} = req;
		const {format} = req.params;
		if (!req.file)
			throw 'Missing file';
		const data = await uploadMembers(format, req.file)
		res.json(data)
	}
	catch(err) {next(err)}
});

router.post('/MyProjectRoster$', upload.single('File'), async (req, res, next) => {
	try {
		if (!req.file)
			throw 'Missing file';
		const data = await importMyProjectRoster(req.file);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/MyProjectRoster$', async (req, res, next) => {
	try {
		exportMyProjectRoster(res);
	}
	catch(err) {next(err)}
});


export default router;
