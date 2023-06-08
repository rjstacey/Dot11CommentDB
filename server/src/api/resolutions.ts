/*
 * Resolutions API
 *
 * POST /
 *		Add resolutions.
 *		Body is an object with parameters:
 *			entities:array
 *			ballot_id:				Identifies the ballot
 *			modifiedSince:string 	Datetime in ISO format
 *		Returns an array of resolution objects that is the complete list of resolutions for the comments affected.
 *
 * PATCH /
 *		Update resolutions.
 *		Body is an object with parameters:
 *			entities:object
 *			ballot_id:any 			Identifies the ballot
 *			modifiedSince:string 	Datetime in ISO format
 *		Returns resulutions that were modified after modifiedSince.
 *
 * DELETE / ({ids, ballot_id, modifiedSince})
 *		Delete resolutions.
 *		Body is an object with parameters:
 *			ids:array 			An array of ballot identifiers
 *
 * POST /resolutions/{ballotId}/upload (resolutionFile, params)
 *		URL parameters:
 *			ballotId:any 	Identifies the ballot
 *		Multipart body:
 *			resolutionFile:	the resolution spreadsheet
 *			params: JSON object with parameters:
 *				toUpdate:array
 *				matchAlgorithm:string
 *				matchUpdate:string
 *				sheetName:string		The sheet name with the resolutions
 *		Update existing and add missing resolutions from spreadsheet.
 */
import {Router} from 'express';
import Multer from 'multer';
import {
	addResolutions,
	updateResolutions,
	deleteResolutions,
	validResolutions,
	validResolutionIds,
	validResolutionUpdates,
} from '../services/resolutions';
import {
	validToUpdate,
	validMatchAlgo,
	validMatchUpdate,
	toUpdateOptions,
	matchAlgoOptions,
	matchUpdateOptions,
	uploadResolutions,
} from '../services/uploadResolutions';

const upload = Multer();
const router = Router();

function validModifiedSince(modifiedSince: any): modifiedSince is string | undefined {
	return typeof modifiedSince === 'undefined' || typeof modifiedSince == 'string';
}

router
	.post('/upload$', upload.single('ResolutionsFile'), async (req, res, next) => {
		const ballot_id = req.ballot!.id;
		const {toUpdate, matchAlgorithm, matchUpdate, sheetName} = JSON.parse(req.body.params);
		if (!validMatchAlgo(matchAlgorithm))
			return next(new TypeError(`Missing or bad matchAlgorithm body parameter: ${matchAlgorithm}; expected one of ${matchAlgoOptions.join(', ')}.`));
		if (!validMatchUpdate(matchUpdate))
			return next(new TypeError(`Missing or bad matchUpdate body parameter: ${matchUpdate}. Valid options are ${matchUpdateOptions.join(', ')}.`));
		if (typeof sheetName !== 'string')
			return next(new TypeError("Missing or bad sheetName body parameter; expected string."));
		if (!validToUpdate(toUpdate))
			return next(new TypeError(`Missing or bad toUpdate body parameter: ${toUpdate}; expected an array that is a subset of [${toUpdateOptions.join(', ')}].`));
		if (!req.file)
			return next(new TypeError('Missing file'));
		uploadResolutions(req.user, ballot_id, toUpdate, matchAlgorithm, matchUpdate, sheetName, req.file)
			.then(data => res.json(data))
			.catch(next);
	})
	.route('/')
		.post((req, res, next) => {
			const ballot_id = req.ballot!.id;
			const {modifiedSince} = req.query;
			if (!validModifiedSince(modifiedSince))
				return next(new TypeError("Optional query parameter `modifiedSince` must be an ISO datatime string"));
			const resolutions = req.body;
			if (!validResolutions(resolutions))
				return next(new TypeError('Bad or missing body; expected an array of resolution objects'));
			addResolutions(req.user, ballot_id, resolutions, modifiedSince)
				.then(data => res.json(data))
				.catch(next);
		})
		.patch((req, res, next) => {
			const ballot_id = req.ballot!.id;
			const {modifiedSince} = req.query;
			if (!validModifiedSince(modifiedSince))
				return next(new TypeError("Optional query parameter `modifiedSince` must be an ISO datatime string"));
			const updates = req.body;
			if (!validResolutionUpdates(updates))
				return next(new TypeError('Bad or missing body; expected an array of resolution update objects'));
			updateResolutions(req.user, ballot_id, updates, modifiedSince)
				.then(data => res.json(data))
				.catch(next);
		})
		.delete((req, res, next) => {
			const ballot_id = req.ballot!.id;
			const {modifiedSince} = req.query;
			if (!validModifiedSince(modifiedSince))
				return next(new TypeError("Optional query parameter `modifiedSince` must be an ISO datatime string"));
			const ids = req.body;
			if (!validResolutionIds(ids))
				return next(new TypeError("Bad or missing body; expected an array of resolution identifiers with shape string[]"));
			deleteResolutions(req.user, ballot_id, ids, modifiedSince)
				.then(data => res.json(data))
				.catch(next);
		});

export default router;
