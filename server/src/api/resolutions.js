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
		if (!req.body.hasOwnProperty('resolutions'))
			throw 'Missing resolutions parameter';
		const {resolutions} = req.body;
		if (!Array.isArray(resolutions))
			throw 'Expect an array for resolutions parameter';
		const data = await addResolutions(user.SAPIN, resolutions);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.put('/$', async (req, res, next) => {
	try {
		const {user} = req;
		if (!req.body.hasOwnProperty('ids'))
			throw 'Missing ids parameter';
		if (!req.body.hasOwnProperty('changes'))
			throw 'Missing changes parameter';
		const {ids, changes} = req.body;
		if (!Array.isArray(ids))
			throw 'Expect an array for ids parameter';
		if (typeof changes !== 'object')
			throw 'Expect an object for changes parameter';
		const data = await updateResolutions(user.SAPIN, ids, changes);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/$', async (req, res, next) => {
	try {
		const {user} = req;
		if (!req.body.hasOwnProperty('resolutions'))
			throw 'Missing resolutions parameter'
		const {resolutions} = req.body
		if (!Array.isArray(resolutions))
			throw 'Expect an array for resolutions parameter'
		const data = await deleteResolutions(user.SAPIN, resolutions)
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
