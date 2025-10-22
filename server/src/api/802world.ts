/*
 * 802 World schedule API
 */
import { Request, Response, Router, NextFunction } from "express";
import { fetch, EnvHttpProxyAgent } from "undici";
const dispatcher = new EnvHttpProxyAgent();
const url = "https://schedule.802world.com/schedule/schedule/show.json";

async function get802WorldSchedule(
	req: Request,
	res: Response,
	next: NextFunction
) {
	try {
		const response = await fetch(url, { dispatcher });
		res.status(response.status).send(await response.json());
	} catch (error) {
		next(error);
	}
}

const router = Router();
router.get(/(.*)/, get802WorldSchedule);

export default router;
