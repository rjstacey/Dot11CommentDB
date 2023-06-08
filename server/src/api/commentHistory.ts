/*
 * Comments History API
 */
import { Router } from 'express';
import { getCommentHistory } from '../services/commentHistory';

const router = Router();

router.get('/:comment_id(\\d+)', async (req, res, next) => {
	const comment_id = Number(req.params.comment_id);
	getCommentHistory(comment_id)
		.then(data => res.json(data))
		.catch(next);
});

export default router;
