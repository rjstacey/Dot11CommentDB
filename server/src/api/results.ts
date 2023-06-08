/*
 * Ballot results API
 *
 * GET /{ballotId}
 * 		Get results for a given ballot
 *		URL parameters:
 *			ballotId:number		Identifies the ballot
 *		Returns an array of result objects that is the results for the speficied ballot
 *
 * GET /{ballotId}/export
 *		Get results for a given ballot as a spreadsheet
 *		URL parameters:
 *			ballotId:number		Identifies the ballot
 *		Returns a spreadsheet file
 *
 * DELETE /{ballotId}
 *		Delete results for a given ballot
 *		URL parameters:
 *			ballotId:number		Identifies the ballot
 *		Returns the number of result objects deleted
 *
 * GET /exportForProject
 *		Export results for project as a spreadsheet, one ballot per sheet
 *		Query parameters:
 *			project:string		Identifies the ballot
 *
 * POST /{ballotId}/importFromEpoll/{epollNum}
 *		Import ballot results for a given ballot from ePoll
 *		URL parameters:
 *			ballotId:number		Identifies the ballot
 *			epollNum:number		Identifies the ePoll
 *		Returns an array of result objects that is the results as imported
 *
 * POST /{ballotId}/uploadEpollResults
 *		Upload ballot results for a given ballot from ePoll CSV file
 *		URL parameters:
 *			ballotId:number		Identifies the ballot
 *		Returns an array of result objects that is the results as uploaded
 *
 * POST /{ballotId}/uploadMyProjectResults
 *		Upload ballot results for a given ballot from MyProject CSV file
 *		URL parameters:
 *			ballotId:number		Identifies the ballot
 *		Returns an array of result objects that is the results as uploaded
 */
import { Router } from 'express';
import Multer from 'multer';
import { AccessLevel } from '../auth/access';
import {
	getResultsCoalesced,
	deleteResults,
	importEpollResults,
	uploadEpollResults,
	uploadMyProjectResults,
	exportResultsForBallot,
	exportResultsForProject
} from '../services/results';

const upload = Multer();
const router = Router();

router
	.all('*', (req, res, next) => {
		const access = req.group?
			req.group.permissions.results:
			req.workingGroup?.permissions.results || AccessLevel.none;
		if (req.method === "GET" && access >= AccessLevel.ro)
			return next();
		if ((req.method === "DELETE" || req.method === "POST") && access >= AccessLevel.admin)
			return next();
		res.status(403).send('Insufficient karma');
	})
	.route('/')
		.get((req, res, next) => {
			const ballot_id = req.ballot!.id;
			getResultsCoalesced(req.user, ballot_id)
				.then(data => res.json(data))
				.catch(next);
		})
		.delete((req, res, next) => {
			const ballot_id = req.ballot!.id;
			deleteResults(ballot_id)
				.then(data => res.json(data))
				.catch(next);
		})
		
router
	.get('export$', (req, res, next) => {
		const ballot_id = req.ballot!.id;
		exportResultsForBallot(req.user, ballot_id, res)
			.catch(next);
		})
	.get('/exportForProject$', (req, res, next) => {
			const project = typeof req.query.project === 'string'? req.query.project: '';
			exportResultsForProject(req.user, project, res)
				.catch(next);
		})
	.post('/importFromEpoll/:epollNum(\\d+)$', async (req, res, next) => {
		const ballot_id = req.ballot!.id;
		const epollNum = Number(req.params.epollNum);
		importEpollResults(req.user, ballot_id, epollNum)
			.then(data => res.json(data))
			.catch(next);
	})
	.post('/uploadEpollResults$', upload.single('ResultsFile'), async (req, res, next) => {
		const ballot_id = req.ballot!.id;
		if (!req.file)
			return next(new TypeError('Missing file'));
		uploadEpollResults(req.user, ballot_id, req.file)
			.then(data => res.json(data))
			.catch(next);
	})
	.post('/uploadMyProjectResults$', upload.single('ResultsFile'), async (req, res, next) => {
		const ballot_id = req.ballot!.id;
		if (!req.file)
			return next(new TypeError('Missing file'));
		uploadMyProjectResults(req.user, ballot_id, req.file)
			.then(data => res.json(data))
			.catch(next);
	});

export default router;
