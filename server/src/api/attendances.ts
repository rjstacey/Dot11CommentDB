/*
 * Attendances API
 *
 */
import { Router } from 'express';
import { AccessLevel } from '../auth/access';
 
import {
	getRecentAttendances,
	addAttendances,
	updateAttendances,
	deleteAttendances,
	importAttendances,
	validAttendances,
	validAttendanceUpdates,
	validAttendanceIds
} from '../services/attendances';
 
const router = Router();
 
router
	.all('*', (req, res, next) => {
		if (!req.group)
			return res.status(500).send("Group not set");

		const access = req.group.permissions.members || AccessLevel.none;
		if (req.method === "GET" && access >= AccessLevel.ro)
			return next();
		if (req.method === "PATCH" && access >= AccessLevel.rw)
			return next();
		if ((req.method === "DELETE" || req.method === "POST") && access >= AccessLevel.admin)
			return next();
			
		res.status(403).send('Insufficient karma');
	})
	.post('/:session_id(\\d+)/import', async (req, res, next) => {
		const session_id = Number(req.params.session_id);
		const {use} = req.query;
		let useDailyAttendance = typeof use === 'string' && use.toLowerCase() === 'daily-attendance';
		importAttendances(req.user, session_id, useDailyAttendance)
			.then(data => res.json(data))
			.catch(next);
	})
	.route('/')
		.get((req, res, next) => {
			getRecentAttendances()
				.then(data => res.json(data))
				.catch(next);
		})
		.post((req, res, next) => {
			const attendances = req.body;
			if (!validAttendances(attendances))
				return next(new TypeError('Missing or bad body; expected an array of attendance objects'));
			addAttendances(attendances)
				.then(data => res.json(data))
				.catch(next);
		})
		.patch((req, res, next) => {
			const updates = req.body;
			if (!validAttendanceUpdates(updates))
				return next(new TypeError('Missing or bad body; expected array of updates with shate {id, changes}'));
			updateAttendances(updates)
				.then(data => res.json(data))
				.catch(next);
		})
		.delete((req, res, next) => {
			const ids = req.body;
			if (!validAttendanceIds(ids))
				return next(new TypeError('Missing or bad body; expected array of attendance ids'));
			deleteAttendances(ids)
				.then(data => res.json(data))
				.catch(next);
		});

 export default router;
 