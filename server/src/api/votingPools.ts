/*
 * Voting pools API
 */
import { Router } from 'express';
import { isPlainObject } from '../utils';
import {
	getVotingPools,
	deleteVotingPools,
	updateVotingPool,
} from '../services/voters'

const router = Router();

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
			throw new TypeError("Bad or missing array of voting pool identifiers");
		if (!votingPoolIds.every(id => typeof id === 'string'))
			throw new TypeError("Expected an array of strings");
		const data = await deleteVotingPools(votingPoolIds);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/:votingPoolId/$', async (req, res, next) => {
	try {
		const {votingPoolId} = req.params;
		const changes = req.body;
		if (!isPlainObject(changes))
			throw new TypeError('Bad or missing body; expected object');
		const data = await updateVotingPool(votingPoolId, changes);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
