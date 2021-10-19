/*
 * Voters API
 */

import {
	getVoters,
	addVoters,
	updateVoters,
	deleteVoters,
	votersFromSpreadsheet,
	votersFromMembersSnapshot
} from '../services/voters'

const upload = require('multer')();
const router = require('express').Router();

router.get('/:votingPoolId', async (req, res, next) => {
	try {
		const {votingPoolId} = req.params;
		const data = await getVoters(votingPoolId);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/:votingPoolId$', async (req, res, next) => {
	try {
		const {votingPoolId} = req.params;
		const voters = req.body;
		if (!Array.isArray(voters))
			throw 'Missing or bad body; expected array of voters';
		const data = await addVoters(votingPoolId, voters);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/$', async (req, res, next) => {
	try {
		const updates = req.body;
		if (!Array.isArray(updates))
			throw 'Missing or bad body; expected array of updates';
		const data = await updateVoters(updates);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/:votingPoolId$', async (req, res, next) => {
	try {
		const {votingPoolId} = req.params;
		const ids = req.body;
		if (ids && !Array.isArray(ids))
			throw 'Missing or bad body; expected nothing or an array of IDs';
		const data = await deleteVoters(votingPoolId, ids);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/:votingPoolId/upload$', upload.single('File'), async (req, res, next) => {
	try {
		const {votingPoolId} = req.params;
		if (!req.file)
			throw 'Missing file';
		const data = await votersFromSpreadsheet(votingPoolId, req.file);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/:votingPoolId/membersSnapshot$', async (req, res, next) => {
	try {
		const {votingPoolId} = req.params;
		if (typeof req.body !== 'object' || !req.body.hasOwnProperty('date'))
			throw 'Missing or bad body; expected "{date: <string>}"';
		const {date} = req.body;
		const data = await votersFromMembersSnapshot(votingPoolId, date);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
