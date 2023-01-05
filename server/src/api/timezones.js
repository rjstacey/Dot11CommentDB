/*
 * Supply a list of time zones
 *
 * GET /
 *      Returns an array of strings that is the set of valid timezones.
 */
import {Router} from 'express';
import {DateTime} from 'luxon';
import {zones} from 'tzdata';

const router = Router();

const timezones = Object.keys(zones)
    .filter(tz => DateTime.local().setZone(tz).isValid)
    .sort();

router.get('/', async (req, res, next) => res.json(timezones));

export default router;
