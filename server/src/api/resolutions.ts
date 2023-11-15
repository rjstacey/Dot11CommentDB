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
import { ForbiddenError, isPlainObject } from '../utils';
import { AccessLevel } from '../auth/access';
import {
	addResolutions,
	updateResolutions,
	deleteResolutions,
	validResolutions,
	validResolutionIds,
	validResolutionUpdates,
} from '../services/resolutions';
import {
	toUpdateOptions,
	matchAlgoOptions,
	matchUpdateOptions,
	FieldToUpdate,
	MatchAlgo,
	MatchUpdate,
	uploadResolutions,
} from '../services/uploadResolutions';

const upload = Multer();
const router = Router();

const validModifiedSince = (modifiedSince: any): modifiedSince is string | undefined => typeof modifiedSince === 'undefined' || typeof modifiedSince == 'string';

const validToUpdate = (toUpdate: any): toUpdate is FieldToUpdate[] => Array.isArray(toUpdate) && toUpdate.every(f => toUpdateOptions.includes(f));
const validMatchAlgo = (o: unknown): o is MatchAlgo => typeof o === 'string' && matchAlgoOptions.includes(o as any);
const validMatchUpdate = (f: unknown): f is MatchUpdate => typeof f === 'string' && matchUpdateOptions.includes(f as any);

function validateUploadParams(params: any): asserts params is {toUpdate: FieldToUpdate[], matchAlgorithm: MatchAlgo, matchUpdate: MatchUpdate, sheetName: string} {
	if (!isPlainObject(params))
		throw new TypeError("Bad body; extected params to be object with shape {toUpdate, matchAlgorithm, matchUpdate, sheetName}");
	if (!validToUpdate(params.toUpdate))
		throw new TypeError(`Bad body; expected toUpdate to be an array that is a subset of [${toUpdateOptions.join(', ')}].`);
	if (!validMatchAlgo(params.matchAlgorithm))
		throw new TypeError(`Bad body; expected matchAlgorithm to be one of ${matchAlgoOptions.join(', ')}.`);
	if (!validMatchUpdate(params.matchUpdate))
		throw new TypeError(`Bad body; expected matchUpdate to be one of ${matchUpdateOptions.join(', ')}.`);
	if (typeof params.sheetName !== 'string')
		throw new TypeError("Bad body; expected sheetName to be a string.");
}

router
	.post('/upload', upload.single('ResolutionsFile'), (req, res, next) => {
		const access = req.permissions?.comments || AccessLevel.none;
		if (access < AccessLevel.rw)
			return next(new ForbiddenError("Need at least read-write privileges at the ballot level to upload resolutions"));
		const ballot_id = req.ballot!.id;
		if (typeof req.body.params !== 'string' || !req.file)
			return next(new TypeError("Bad body; expected multipart with file in ResolutionsFile and JSON in params"));

		let params: any;
		try {
			params = JSON.parse(req.body.params);
			validateUploadParams(params);
		}
		catch (error) {
			return next(error);
		}
		uploadResolutions(req.user, ballot_id, params.toUpdate, params.matchAlgorithm, params.matchUpdate, params.sheetName, req.file)
			.then(data => res.json(data))
			.catch(next);
	})
	.route('/')
		.post((req, res, next) => {
			const access = req.permissions?.comments || AccessLevel.none;
			// Need at least read-only privileges at the ballot level to add a resolution. Check for comment level privileges later.
			if (access < AccessLevel.ro)
				return next(new ForbiddenError("Need at least read-only privileges at the ballot level to add a resolution"));
			const ballot_id = req.ballot!.id;
			const {modifiedSince} = req.query;
			if (!validModifiedSince(modifiedSince))
				return next(new TypeError("Optional query parameter `modifiedSince` must be an ISO datatime string"));
			const resolutions = req.body;
			if (!validResolutions(resolutions))
				return next(new TypeError('Bad or missing body; expected an array of resolution objects'));
			addResolutions(req.user, ballot_id, access, resolutions, modifiedSince)
				.then(data => res.json(data))
				.catch(next);
		})
		.patch((req, res, next) => {
			const access = req.permissions?.comments || AccessLevel.none;
			// Need at least read-only privileges at the ballot level to add a resolution. Check for comment level or resolution level
			// privileges later.
			if (access < AccessLevel.ro)
				return next(new ForbiddenError("Need at least read-only privileges at the ballot level to update a resolution"));
			const ballot_id = req.ballot!.id;
			const {modifiedSince} = req.query;
			if (!validModifiedSince(modifiedSince))
				return next(new TypeError("Optional query parameter `modifiedSince` must be an ISO datatime string"));
			const updates = req.body;
			if (!validResolutionUpdates(updates))
				return next(new TypeError('Bad or missing body; expected an array of resolution update objects'));
			updateResolutions(req.user, ballot_id, access, updates, modifiedSince)
				.then(data => res.json(data))
				.catch(next);
		})
		.delete((req, res, next) => {
			const access = req.permissions?.comments || AccessLevel.none;
			// Need at least read-only privileges at the ballot level to delete a resolution. Check for comment level privileges later.
			if (access < AccessLevel.ro)
				return next(new ForbiddenError("Need at least read-only privileges at the ballot level to delete a resolution"));
			const ballot_id = req.ballot!.id;
			const {modifiedSince} = req.query;
			if (!validModifiedSince(modifiedSince))
				return next(new TypeError("Optional query parameter `modifiedSince` must be an ISO datatime string"));
			const ids = req.body;
			if (!validResolutionIds(ids))
				return next(new TypeError("Bad or missing body; expected an array of resolution identifiers with shape string[]"));
			deleteResolutions(req.user, ballot_id, access, ids, modifiedSince)
				.then(data => res.json(data))
				.catch(next);
		});

export default router;
