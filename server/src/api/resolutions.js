import {
	addResolutions,
	updateResolutions,
	deleteResolutions
} from '../services/resolutions';

import {uploadResolutions} from '../services/uploadResolutions';

const upload = require('multer')();
const router = require('express').Router();

router.post('/$', async (req, res, next) => {
	try {
		const {user} = req;
		const resolutions = req.body;
		if (!Array.isArray(resolutions))
			throw 'Missing or bad array parameter';
		const data = await addResolutions(user.SAPIN, resolutions);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/$', async (req, res, next) => {
	try {
		const {user} = req;
		const updates = req.body;
		if (!Array.isArray(updates))
			throw 'Missing or bad array parameter';
		const data = await updateResolutions(user.SAPIN, updates);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/$', async (req, res, next) => {
	try {
		const {user} = req;
		const ids = req.body;
		if (!Array.isArray(ids))
			throw 'Missing or bad array parameter';
		const data = await deleteResolutions(user.SAPIN, ids)
		res.json(data)
	}
	catch(err) {next(err)}
});

router.post('/:ballot_id(\\d+)/upload/', upload.single('ResolutionsFile'), async (req, res, next) => {
	try {
		const {user} = req;
		const {ballot_id} = req.params
		if (!req.body.params)
			throw 'Missing parameters'
		const {toUpdate, matchAlgorithm, matchUpdate, sheetName} = JSON.parse(req.body.params)
		if (!Array.isArray(toUpdate))
			throw 'Missing or invalid parameter toUpdate'
		if (!matchAlgorithm || typeof matchAlgorithm !== 'string')
			throw 'Missing or invalid parameter matchAlgorithm'
		if (!matchUpdate || typeof matchUpdate !== 'string')
			throw 'Missing or invalid parameter matchUpdate'
		if (!req.file)
			throw 'Missing file'

		const data = await uploadResolutions(user.SAPIN, ballot_id, toUpdate, matchAlgorithm, matchUpdate, sheetName, req.file);

		res.json(data)
	}
	catch(err) {next(err)}
});

export default router;
