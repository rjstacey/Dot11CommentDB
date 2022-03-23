/*
 * officers API
 */

import {getOfficers, addOfficers, updateOfficers, removeOfficers} from '../services/officers';

const router = require('express').Router();

router.get('/$', async (req, res, next) => {
	try {
		const data = await getOfficers();
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/$', async (req, res, next) => {
	try {
		const officers = req.body;
		if (!Array.isArray(officers))
			throw TypeError('Bad or missing array of groups');
		const data = await addOfficers(officers);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.put('/$', async (req, res, next) => {
	try {
		const updates = req.body;
		if (!Array.isArray(updates))
			throw TypeError('Bad or missing array of updates');
		const data = await updateOfficers(updates);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/$', async (req, res, next) => {
	try {
		const ids = req.body;
		if (!Array.isArray(ids))
			throw TypeError('Bad or missing array of ids');
		const data = await removeOfficers(ids);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
