import { Router } from 'express';
import { AccessLevel } from '../auth/access';
import { selectUsers } from '../services/members';

const router = Router();

router
	.all('*', (req, res, next) => {
		if (!req.group)
			return res.status(500).send("Group not set");
		const access = req.group.permissions.users || AccessLevel.none;
		if (access >= AccessLevel.ro)
			return next();
		res.status(403).send('Insufficient karma');
	})
	.get('/', (req, res, next) => {
		const access = req.group!.permissions.users;
		selectUsers(req.user, access)
			.then(data => res.json(data))
			.catch(next);
	});

export default router;
