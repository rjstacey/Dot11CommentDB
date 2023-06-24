/*
 * Ballot results API
 *
 * For the comments routes, req includes the following
 *   ballot: Ballot	- The ballot associated with the results
 *   group?: Group - The group associated with the ballot (if configured)
 *   workingGroup?: Group - The working group associated with the ballot (if configure)
 *
 * GET /
 * 		Get results for a given ballot
 *		Returns an array of result objects that is the results for the speficied ballot
 *
 * DELETE /
 *		Delete results for a given ballot
 *		Returns the number of result objects deleted
 *
 * GET /export?forSeries={true|false}
 *		Get results for a given ballot as a spreadsheet
 *      Query parameters:
 *          forSeries: "true" | "false" -- If true, returns result for the ballot series (one sheet per ballot)
 *		Returns a spreadsheet file
 *
 * POST /import
 *		Import ballot results for a given ballot from ePoll
 *		Returns an array of result objects that is the results as imported
 *
 * POST /upload
 *		Upload ballot results for a given ballot from ePoll CSV file or MyProject ballot members spreadsheet
 *		Returns an array of result objects that is the results as uploaded
 */
import { Router } from 'express';
import Multer from 'multer';
import { AccessLevel } from '../auth/access';
import {
	getResultsCoalesced,
	deleteResults,
	importEpollResults,
	uploadResults,
	exportResults,
} from '../services/results';

const upload = Multer();
const router = Router();

router
	.all('*', (req, res, next) => {
		const access = req.permissions?.results || AccessLevel.none;
		if (req.method === "GET" && access >= AccessLevel.ro)
			return next();
		if ((req.method === "DELETE" || req.method === "POST") && access >= AccessLevel.admin)
			return next();
		res.status(403).send('Insufficient karma');
	})
	.get('/export', (req, res, next) => {
		const {forSeries} = req.query;
		if (forSeries && forSeries !== "true" && forSeries !== "false")
			return next(new TypeError("Invalid forSeries parameter: expected true or false"));

		const access = req.permissions?.results || AccessLevel.none;

		exportResults(req.user, access, req.ballot!, forSeries === "true", res)
			.then(() => res.end())
			.catch(next);
	})
	.post('/import', (req, res, next) => {
		importEpollResults(req.user, req.ballot!)
			.then(data => res.json(data))
			.catch(next);
	})
	.post('/upload', upload.single('ResultsFile'), (req, res, next) => {
		if (!req.file)
			return next(new TypeError('Missing file'));
		uploadResults(req.user, req.ballot!, req.file)
			.then(data => res.json(data))
			.catch(next);
	})
	.route('/')
		.get((req, res, next) => {
			const access = req.permissions?.results || AccessLevel.none;
			getResultsCoalesced(req.user, access, req.ballot!)
				.then(data => res.json(data))
				.catch(next);
		})
		.delete((req, res, next) => {
			deleteResults(req.ballot!.id)
				.then(data => res.json(data))
				.catch(next);
		})
		


export default router;
