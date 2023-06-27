/*
 * Comments History API
 */
import { Router } from 'express';
import { ForbiddenError } from '../utils';
import { AccessLevel } from '../auth/access';
import { getCommentHistory } from '../services/commentHistory';

const router = Router();

router
	.all('*', (req, res, next) => {
		const access = req.permissions?.comments || AccessLevel.none;
		if (req.method === "GET" && access >= AccessLevel.ro)
			return next();

		next(new ForbiddenError("Insufficient karma"));
	})
	.get('/:comment_id(\\d+)', async (req, res, next) => {
		const comment_id = Number(req.params.comment_id);
		getCommentHistory(comment_id)
			.then(data => res.json(data))
			.catch(next);
	});

export default router;
