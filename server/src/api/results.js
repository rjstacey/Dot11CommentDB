/*
 * Ballot results API
 */
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
const router = require('express').Router();

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
		const data = await importEpollResults(user.ieeeCookieJar, user, ballot_id, epollNum);
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
