/*
 * 802 World schedule API
 */
import { Request, Response, NextFunction, Router } from "express";
import axios from "axios";

const url = "https://schedule.802world.com/schedule/schedule/show.json";
function get802WorldSchedule(req: Request, res: Response, next: NextFunction) {
	return axios
		.get(url)
		.then((response) => {
			if (
				response.status === 200 &&
				response.headers["content-type"] === "application/json"
			)
				res.json(response.data);
			else next(new Error("Unexpected response"));
		})
		.catch(next);
}

const router = Router();
router.get(/(.*)/, get802WorldSchedule);

export default router;
