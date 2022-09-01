
import {sendEmail} from '../services/email';

const router = require('express').Router();

router.post('/$', async (req, res, next) => {
	try {
		const {user, body} = req;
		if (typeof body !== 'object')
			throw new TypeError('Bad or missing body; expected object');
		const data = await sendEmail(user, body);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
