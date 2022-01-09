import {
	addResolutions,
	updateResolutions,
	deleteResolutions
} from '../services/resolutions';

import {uploadResolutions} from '../services/uploadResolutions';

const upload = require('multer')();
const router = require('express').Router();

const isPlainObject = o => (!Array.isArray(o) && typeof o === 'object');

router.post('/$', async (req, res, next) => {
	try {
		const {user} = req;
		if (!isPlainObject(req.body))
			throw 'Bad body; expected plain object';
		const {entities, ballot_id, modifiedSince} = req.body;
		if (!Array.isArray(entities))
			throw 'Missing or bad entities parameter; expected array';
		const data = await addResolutions(user.SAPIN, entities, ballot_id, modifiedSince);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/$', async (req, res, next) => {
	try {
		const {user} = req;
		if (!isPlainObject(req.body))
			throw 'Bad body; expected plain object';
		const {updates, ballot_id, modifiedSince} = req.body;
		if (!Array.isArray(updates))
			throw 'Missing or bad updates parameter; expected array';
		const data = await updateResolutions(user.SAPIN, updates, ballot_id, modifiedSince);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/$', async (req, res, next) => {
	try {
		const {user} = req;
		if (!isPlainObject(req.body))
			throw 'Bad body; expected plain object';
		const {ids, ballot_id, modifiedSince} = req.body;
		if (!Array.isArray(ids))
			throw 'Missing or bad ids parameter; expected array';
		const data = await deleteResolutions(user.SAPIN, ids, ballot_id, modifiedSince)
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
