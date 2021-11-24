/*
 * Ballot results API
 */
import {
	getResultsCoalesced,
	deleteResults,
	importEpollResults,
	uploadEpollResults,
	uploadMyProjectResults,
	exportResults
} from '../services/results';

const upload = require('multer')();
const router = require('express').Router();

router.get('/:ballotId', async (req, res, next) => {
	try {
		const {user} = req;
		const {ballotId} = req.params
		const data = await getResultsCoalesced(user, ballotId)
		res.json(data)
	}
	catch(err) {next(err)}
});
router.get('/resultsExport', (req, res, next) => {
	try {
		const {user} = req;
		exportResults(user, req.query, res)
	}
	catch(err) {next(err)}
});
router.delete('/:ballotId', async (req, res, next) => {
	try {
		const {ballotId} = req.params
		const data = await deleteResults(ballotId)
		res.json(data)
	}
	catch(err) {next(err)}
});
router.post('/importFromEpoll/:ballotId/:epollNum', async (req, res, next) => {
	try {
		const {user} = req;
		const {ballotId, epollNum} = req.params;
		const data = await importEpollResults(user.ieeeCookieJar, user, ballotId, epollNum);
		res.json(data)
	}
	catch(err) {next(err)}
});
router.post('/uploadEpollResults/:ballotId', upload.single('ResultsFile'), async (req, res, next) => {
	try {
		const {user} = req;
		const {ballotId} = req.params;
		if (!req.file)
			throw 'Missing file'
		const data = await uploadEpollResults(user, ballotId, req.file)
		res.json(data)
	}
	catch(err) {next(err)}
});
router.post('/uploadMyProjectResults/:ballotId', upload.single('ResultsFile'), async (req, res, next) => {
	try {
		const {user} = req;
		const {ballotId} = req.params;
		if (!req.file)
			throw 'Missing file'
		const data = await uploadMyProjectResults(user, ballotId, req.file)
		res.json(data)
	}
	catch(err) {next(err)}
});

export default router;
