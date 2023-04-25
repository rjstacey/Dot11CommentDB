import { Router } from 'express';
import { isPlainObject } from '../utils';
import { sendEmail } from '../services/email';

const router = Router();

router.post('/$', async (req, res, next) => {
	try {
		const {user, body} = req;
		if (!isPlainObject(body))
			throw new TypeError('Bad or missing body; expected object');
		const data = await sendEmail(user, body);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
