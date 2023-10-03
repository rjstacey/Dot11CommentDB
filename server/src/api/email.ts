import { Router } from 'express';
import { isPlainObject } from '../utils';
import { sendEmail } from '../services/email';

const router = Router();

router.post('/$', async (req, res, next) => {
	const {user, body} = req;
	if (!isPlainObject(body))
		return next(new TypeError('Bad or missing body; expected object'));
	sendEmail(user, body)
		.then(data => res.json(data))
		.catch(next)
});

export default router;
