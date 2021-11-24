/*
 * Comments History API
 */
import {getCommentsHistory} from '../services/commentsHistory';

const router = require('express').Router();

router.get('/commentsHistory/:comment_id', async (req, res, next) => {
	try {
		const {comment_id} = req.params
		const data = await getCommentsHistory(comment_id);
		res.json(data)
	}
	catch(err) {next(err)}
});

export default router;
