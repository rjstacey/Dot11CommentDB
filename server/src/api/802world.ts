/*
 * 802 World schedule API
 */
import { Request, Response, Router } from "express";
import { fetch, EnvHttpProxyAgent } from "undici";
const dispatcher = new EnvHttpProxyAgent();
const url = "https://schedule.802world.com/schedule/schedule/show.json";

async function get802WorldSchedule(req: Request, res: Response) {
	const response = await fetch(url, { dispatcher });
	res.status(response.status).send(await response.json());
}

const router = Router();
router.get(/(.*)/, get802WorldSchedule);

export default router;
