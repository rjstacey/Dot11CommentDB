/*
 * Supply a list of time zones
 */

const router = require('express').Router();
const tzdata = require('tzdata');
const timezones = Object.keys(tzdata.zones).sort();

router.get('/', async (req, res, next) => res.json(timezones));

export default router;
