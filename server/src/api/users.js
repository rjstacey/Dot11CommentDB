import {Router} from 'express';

import {selectUsers} from '../services/users';

const router = Router();

router.get('/$', async (req, res, next) => {
	try {
		const {user} = req;
		const users = await selectUsers(user);
		res.json({users});
	}
	catch(err) {next(err)}
});

export default router;
