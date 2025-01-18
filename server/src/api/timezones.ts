/*
 * Supply a list of time zones
 *
 * GET /
 *      Returns an array of strings that is the set of valid timezones.
 */
import { Router } from "express";
import { DateTime } from "luxon";
import tzdata from "tzdata" with { type: "json" };

const timezones = Object.keys(tzdata.zones)
	.filter((tz) => DateTime.local().setZone(tz).isValid)
	.sort();

const router = Router();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
router.get("/", (req, res, next) => res.json(timezones));

export default router;
