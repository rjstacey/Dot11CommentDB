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
import {Router} from 'express';

import {
	getResultsCoalesced,
	deleteResults,
	importEpollResults,
	uploadEpollResults,
	uploadMyProjectResults,
	exportResultsForBallot,
	exportResultsForProject
} from '../services/results';

const upload = require('multer')();
const router = Router();

router.get('/:ballot_id(\\d+)$', async (req, res, next) => {
	try {
		const {user} = req;
		const {ballot_id} = req.params;
		const data = await getResultsCoalesced(user, ballot_id);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/:ballot_id(\\d+)/export$', (req, res, next) => {
	try {
		const {user} = req;
		const {ballot_id} = req.params;
		exportResultsForBallot(user, ballot_id, res);
	}
	catch(err) {next(err)}
});

router.delete('/:ballot_id(\\d+)$', async (req, res, next) => {
	try {
		const {ballot_id} = req.params;
		const data = await deleteResults(ballot_id);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/exportForProject$', (req, res, next) => {
	try {
		const {user} = req;
		const {project} = res.query;
		exportResultsForProject(user, project, res)
	}
	catch(err) {next(err)}
});

router.post('/:ballot_id(\\d+)/importFromEpoll/:epollNum(\\d+)$', async (req, res, next) => {
	try {
		const {user} = req;
		const {ballot_id, epollNum} = req.params;
		const data = await importEpollResults(user, ballot_id, epollNum);
		res.json(data)
	}
	catch(err) {next(err)}
});

router.post('/:ballot_id(\\d+)/uploadEpollResults$', upload.single('ResultsFile'), async (req, res, next) => {
	try {
		const {user} = req;
		const {ballot_id} = req.params;
		if (!req.file)
			throw 'Missing file'
		const data = await uploadEpollResults(user, ballot_id, req.file)
		res.json(data)
	}
	catch(err) {next(err)}
});

router.post('/:ballot_id(\\d+)/uploadMyProjectResults$', upload.single('ResultsFile'), async (req, res, next) => {
	try {
		const {user} = req;
		const {ballot_id} = req.params;
		if (!req.file)
			throw 'Missing file'
		const data = await uploadMyProjectResults(user, ballot_id, req.file)
		res.json(data)
	}
	catch(err) {next(err)}
});

export default router;
