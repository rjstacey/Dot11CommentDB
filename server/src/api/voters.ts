/*
 * Voters API
 */
import {Router} from 'express';
import Multer from 'multer';
import { isPlainObject } from '../utils';
import {
	getVoters,
	addVoters,
	updateVoters,
	deleteVoters,
	votersFromSpreadsheet,
	votersFromMembersSnapshot,
	exportVoters
} from '../services/voters'

const upload = Multer();
const router = Router();

router.get('/:votingPoolId/$', async (req, res, next) => {
	try {
		const {votingPoolId} = req.params;
		const data = await getVoters(votingPoolId);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/:votingPoolId/$', async (req, res, next) => {
	try {
		const {votingPoolId} = req.params;
		const voters = req.body;
		if (!Array.isArray(voters))
			throw new TypeError('Bad or missing array of voter objects');
		if (!voters.every(v => isPlainObject(v)))
			throw new TypeError('Expected an array of objects');
		const data = await addVoters(votingPoolId, voters);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/$', async (req, res, next) => {
	try {
		const updates = req.body;
		if (!Array.isArray(updates))
			throw new TypeError('Bad or missing array of updates');
		const data = await updateVoters(updates);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/:votingPoolId/$', async (req, res, next) => {
	try {
		const {votingPoolId} = req.params;
		const ids = req.body;
		if (!Array.isArray(ids))
			throw new TypeError('Bad or missing array of voter identifiers');
		if (!ids.every(id => typeof id === 'string'))
			throw new TypeError('Expected an array of strings');
		const data = await deleteVoters(votingPoolId, ids);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/:votingPoolId/upload$', upload.single('File'), async (req, res, next) => {
	try {
		const {votingPoolId} = req.params;
		if (!req.file)
			throw new TypeError('Missing file');
		const data = await votersFromSpreadsheet(votingPoolId, req.file);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/:votingPoolId/membersSnapshot$', async (req, res, next) => {
	try {
		const {votingPoolId} = req.params;
		if (!isPlainObject(req.body) || !req.body.hasOwnProperty('date'))
			throw new TypeError('Bad or missing body; expected object with shape {date: string}');
		const {date} = req.body;
		const data = await votersFromMembersSnapshot(votingPoolId, date);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/:votingPoolId/export$', async (req, res, next) => {
	try {
		const {votingPoolId} = req.params;
		await exportVoters(votingPoolId, res);
	}
	catch(err) {next(err)}
});

export default router;
