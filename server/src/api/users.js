
import {getUsers} from '../services/members';

const router = require('express').Router();

router.get('/$', async (req, res, next) => {
	try {
		const {user} = req;
		const data = await getUsers(user);
		res.json(data);
	}
	catch(err) {next(err)}
});

export default router;
