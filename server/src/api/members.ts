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
import { Router } from 'express';
import Multer from 'multer';
import { isPlainObject } from '../utils';
import {
	getMembers,
	getMembersSnapshot,
	updateMembers,
	addMemberStatusChangeEntries,
	updateMemberStatusChangeEntries,
	deleteMemberStatusChangeEntries,
	addMemberContactEmail,
	updateMemberContactEmail,
	deleteMemberContactEmail,
	addMembers,
	//upsertMembers,
	deleteMembers,
	uploadMembers,
	importMyProjectRoster,
	exportMyProjectRoster,
} from '../services/members';

const router = Router();
const upload = Multer();

router.get('/$', async (req, res, next) => {
	try {
		const data = await getMembers();
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
			throw new TypeError('Bad or missing array of member objects');
		if (!members.every(member => isPlainObject(member)))
			throw new TypeError('Expected an array of objects');
		const data = await addMembers(members);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/$', async (req, res, next) => {
	try {
		const updates = req.body;
		if (!Array.isArray(updates))
			throw new TypeError('Bad or missing array of update objects');
		if (!updates.every(u => isPlainObject(u) && typeof u.id === 'number' && isPlainObject(u.changes)))
			throw new TypeError('Expected an array of objects with shape {id, changes}');
		const data = await updateMembers(updates);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/$', async (req, res, next) => {
	try {
		const ids = req.body;
		if (!Array.isArray(ids))
			throw new TypeError('Bad or missing array of member identifiers');
		if (!ids.every(id => typeof id === 'number'))
			throw new TypeError('Expected an array of numbers');
		const data = await deleteMembers(ids);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/:id(\\d+)$', async (req, res, next) => {
	try {
		const id = Number(req.params.id);
		const changes = req.body;
		if (typeof changes !== 'object')
			throw new TypeError('Bad or missing body; expected object');
		const data = await updateMembers([{id, changes}]);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.put('/:id(\\d+)/StatusChangeHistory', async (req, res, next) => {
	try {
		const id = Number(req.params.id);
		const data = await addMemberStatusChangeEntries(id, req.body);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/:id(\\d+)/StatusChangeHistory', async (req, res, next) => {
	try {
		const id = Number(req.params.id);
		const data = await updateMemberStatusChangeEntries(id, req.body);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/:id(\\d+)/StatusChangeHistory', async (req, res, next) => {
	try {
		const id = Number(req.params.id);
		const data = await deleteMemberStatusChangeEntries(id, req.body);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/:id(\\d+)/ContactEmails', async (req, res, next) => {
	try {
		const id = Number(req.params.id);
		const entry = req.body;
		if (typeof entry !== 'object')
			throw new TypeError('Missing or bad ContactEmails row object');
		const data = await updateMemberContactEmail(id, entry);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/:id(\\d+)/ContactEmails', async (req, res, next) => {
	try {
		const id = Number(req.params.id);
		const entry = req.body;
		if (typeof entry !== 'object')
			throw new TypeError('Missing or bad ContactEmails row object');
		const data = await addMemberContactEmail(id, entry);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/:id(\\d+)/ContactEmails', async (req, res, next) => {
	try {
		const id = Number(req.params.id);
		const entry = req.body;
		if (typeof entry !== 'object')
			throw new TypeError('Missing or bad ContactEmails row object');
		const data = await deleteMemberContactEmail(id, entry);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/upload/:format', upload.single('File'), async (req, res, next) => {
	try {
		const {format} = req.params;
		if (!req.file)
			throw new TypeError('Missing file');
		const data = await uploadMembers(format, req.file)
		res.json(data)
	}
	catch(err) {next(err)}
});

router.post('/MyProjectRoster$', upload.single('File'), async (req, res, next) => {
	try {
		if (!req.file)
			throw new TypeError('Missing file');
		const data = await importMyProjectRoster(req.file);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/MyProjectRoster$', async (req, res, next) => {
	exportMyProjectRoster(req.user, res)
		.then(() => res.end())
		.catch(next)
});


export default router;
