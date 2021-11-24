/*
 * Voting pools API
 */

import {
	getVotingPools,
	deleteVotingPools,
	updateVotingPool,
} from '../services/voters'

const router = require('express').Router();

router.get('/$', async (req, res, next) => {
	try {
		const data = await getVotingPools()
		res.json(data)
	}
	catch(err) {next(err)}
});

router.delete('/$', async (req, res, next) => {
	try {
		const votingPoolIds = req.body
		if (!Array.isArray(votingPoolIds))
			throw "Array parameter missing"
		const data = await deleteVotingPools(votingPoolIds);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/:votingPoolId$', async (req, res, next) => {
	try {
		const {votingPoolId} = req.params;
		const changes = req.body;
		if (typeof changes !== 'object')
			throw 'Missing or bad body; expected object';
		const data = await updateVotingPool(votingPoolId, changes);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
