/*
 * 802 World schedule API
 */
import {Router} from 'express';
import axios from 'axios';

const router = Router();

const url = 'https://schedule.802world.com/schedule/schedule/show.json';

router.get('*', async (req, res, next) => {
	try {
		const response = await axios.get(url);
		if (response.status === 200 && response.headers['content-type'] === 'application/json') {
			res.json(response.data);
		}
		else {
			console.log(response);
			throw new Error('Unexpected response');
		}
	}
	catch(err) {next(err)}
});

export default router;
