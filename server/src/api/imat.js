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
	deleteImatBreakouts,
	getImatBreakoutAttendance
} from '../services/imat';

const router = require('express').Router();

router.get('/committees/:group', async (req, res, next) => {
	try {
		const {group} = req.params;
		const data = await getImatCommittees(req.user, group);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/meetings$', async (req, res, next) => {
	try {
		const data = await getImatMeetings(req.user);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/breakouts/:meetingNumber(\\d+)', async (req, res, next) => {
	try {
		const meetingNumber = parseInt(req.params.meetingNumber);
		const data = await getImatBreakouts(req.user, meetingNumber);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.put('/breakouts/:meetingNumber(\\d+)', async (req, res, next) => {
	try {
		const meetingNumber = parseInt(req.params.meetingNumber);
		const breakouts = req.body;
		if (!Array.isArray(breakouts))
			throw new TypeError('Bad or missing body; expected array of breakouts');
		const data = await updateImatBreakouts(req.user, meetingNumber, breakouts);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.post('/breakouts/:meetingNumber(\\d+)', async (req, res, next) => {
	try {
		const meetingNumber = parseInt(req.params.meetingNumber);
		const breakouts = req.body;
		if (!Array.isArray(breakouts))
			throw new TypeError('Bad or missing body; expected array of breakouts');
		const data = await addImatBreakouts(req.user, meetingNumber, breakouts);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/breakouts/:meetingNumber(\\d+)', async (req, res, next) => {
	try {
		const meetingNumber = parseInt(req.params.meetingNumber);
		const ids = req.body;
		if (!Array.isArray(ids))
			throw new TypeError('Bad or missing body; expected array of breakout IDs');
		const data = await deleteImatBreakouts(req.user, meetingNumber, ids);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.get('/attendance/:meetingNumber(\\d+)/:breakoutNumber(\\d+)', async (req, res, next) => {
	try {
		const meetingNumber = parseInt(req.params.meetingNumber);
		const breakoutNumber = parseInt(req.params.breakoutNumber);
		const data = await getImatBreakoutAttendance(req.user, meetingNumber, breakoutNumber);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
