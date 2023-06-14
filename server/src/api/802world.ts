/*
 * 802 World schedule API
 */
import { Router } from 'express';
import axios from 'axios';

const router = Router();

const url = 'https://schedule.802world.com/schedule/schedule/show.json';

router.get('*', (req, res, next) => {
	return axios.get(url)
		.then(response => {
			if (response.status === 200 && response.headers['content-type'] === 'application/json')
				res.json(response.data);
			else
				next(new Error('Unexpected response'));
		})
		.catch(next);
});

export default router;
