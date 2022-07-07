/*
 * imat API
 * GET /imat/meetings: get a list of meetings from IMAT
 */

import {isPlainObject} from '../utils';
import {
	getImatCommittees,
	getImatMeetings,
	getImatBreakouts,
	addImatBreakouts,
	updateImatBreakouts,
	getImatBreakoutAttendance
} from '../services/imat';

const router = require('express').Router();

router.get('/committees/:group', async (req, res, next) => {
	try {
		const {user} = req;
		const {group} = req.params;
		const data = await getImatCommittees(user, group);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/meetings$', async (req, res, next) => {
	try {
		const {user} = req;
		const n = req.query.hasOwnProperty('n')? parseInt(req.query.n): 10;
		const data = await getImatMeetings(user, n);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/breakouts/:meetingNumber(\\d+)', async (req, res, next) => {
	try {
		const {user} = req;
		const meetingNumber = parseInt(req.params.meetingNumber, 10);
		const data = await getImatBreakouts(user, meetingNumber);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.put('/breakouts/:meetingNumber(\\d+)', async (req, res, next) => {
	try {
		const {user} = req;
		const meetingNumber = parseInt(req.params.meetingNumber, 10);
		const breakouts = req.body;
		if (!Array.isArray(breakouts))
			throw new TypeError('Bad or missing body; expected array of breakouts');
		const data = await updateImatBreakouts(user, meetingNumber, breakouts);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/breakouts/:meetingNumber(\\d+)', async (req, res, next) => {
	try {
		const {user} = req;
		const meetingNumber = parseInt(req.params.meetingNumber, 10);
		const breakouts = req.body;
		if (!Array.isArray(breakouts))
			throw new TypeError('Bad or missing body; expected array of breakouts');
		const data = await addImatBreakouts(user, meetingNumber, breakouts);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/attendance/:meetingNumber(\\d+)/:breakoutNumber(\\d+)', async (req, res, next) => {
	try {
		const {user} = req;
		const meetingNumber = parseInt(req.params.meetingNumber, 10);
		const breakoutNumber = parseInt(req.params.breakoutNumber, 10);
		const data = await getImatBreakoutAttendance(user, meetingNumber, breakoutNumber);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
