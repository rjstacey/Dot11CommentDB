/*
 * Attendances API
 *
 */
 import { Router } from 'express';

 import {isPlainObject} from '../utils';
 
 import {
   getRecentAttendances,
   addAttendances,
   updateAttendances,
   deleteAttendances,
   importAttendances
 } from '../services/attendances';
 
const router = Router();
 
router.get('/', async (req, res, next) => {
   try {
      const data = await getRecentAttendances();
      res.json(data);
   }
   catch(err) {next(err)}
});

router.post('/$', async (req, res, next) => {
	try {
		const attendances = req.body;
		if (!Array.isArray(attendances))
			throw new TypeError('Missing or bad body; expected array');
		const data = await addAttendances(attendances);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.patch('/$', async (req, res, next) => {
	try {
		const updates = req.body;
		if (!Array.isArray(updates))
			throw new TypeError('Missing or bad body; expected array');
      for (const u of updates) {
         if (!isPlainObject(u) || !u.hasOwnProperty('id') || !u.hasOwnProperty('changes'))
            throw new TypeError('Expected an array of update objects with shape {id, changes}');
      }
		const data = await updateAttendances(updates);
		res.json(data);
	}
	catch(err) {next(err)}
});

router.delete('/$', async (req, res, next) => {
   try {
		const ids = req.body;
		if (!Array.isArray(ids))
			throw new TypeError('Missing or bad body; expected array');
		const data = await deleteAttendances(ids);
		res.json(data);
	}
	catch(err) {next(err)}
})

router.post('/:session_id(\\d+)/import', async (req, res, next) => {
	try {
		const {user} = req;
		let session_id = parseInt(req.params.session_id);
		const data = await importAttendances(user, session_id);
		res.json(data);
	}
	catch(err) {next(err)}
});

 export default router;
 