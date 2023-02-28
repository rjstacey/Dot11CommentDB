/*
 * Comments History API
 */
import {Router} from 'express';
import {getCommentHistory} from '../services/commentHistory';

const router = Router();

router.get('/:comment_id', async (req, res, next) => {
	try {
		const {comment_id} = req.params
		const data = await getCommentHistory(comment_id);
		res.json(data)
	}
	catch(err) {next(err)}
});

export default router;
