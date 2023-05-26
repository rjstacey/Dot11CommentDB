/*
 * Voters API
 */
import {Router} from 'express';
import Multer from 'multer';
import { isPlainObject } from '../utils';
import {
	getVoters,
	addVoters,
	updateVoters,
	deleteVoters,
	votersFromSpreadsheet,
	votersFromMembersSnapshot,
	exportVoters
} from '../services/voters'

const upload = Multer();
const router = Router();

router.get('/:ballot_id(\\d+)', async (req, res, next) => {
	try {
		const ballot_id = Number(req.params.ballot_id);
		const data = await getVoters({ballot_id});
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/:ballot_id(\\d+)', async (req, res, next) => {
	try {
		const ballot_id = Number(req.params.ballot_id);
		const data = await addVoters(ballot_id, req.body);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/', async (req, res, next) => {
	try {
		const data = await updateVoters(req.body);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/', async (req, res, next) => {
	try {
		const data = await deleteVoters(req.body);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/:ballot_id(\\d+)/upload', upload.single('File'), async (req, res, next) => {
	try {
		const ballot_id = Number(req.params.ballot_id);
		if (!req.file)
			throw new TypeError('Missing file');
		const data = await votersFromSpreadsheet(ballot_id, req.file);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/:ballot_id(\\d+)/membersSnapshot', async (req, res, next) => {
	try {
		const ballot_id = Number(req.params.ballot_id);
		if (!isPlainObject(req.body) || !req.body.hasOwnProperty('date'))
			throw new TypeError('Bad or missing body; expected object with shape {date: string}');
		const {date} = req.body;
		const data = await votersFromMembersSnapshot(ballot_id, date);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/:ballot_id(\\d+)/export', async (req, res, next) => {
	try {
		const ballot_id = Number(req.params.ballot_id);
		await exportVoters(ballot_id, res);
	}
	catch(err) {next(err)}
});

export default router;
