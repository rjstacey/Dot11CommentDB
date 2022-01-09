/*
 * Supply a list of time zones
 */

const router = require('express').Router();
const {DateTime} = require('luxon');
const {zones} = require('tzdata');

const timezones = Object.keys(zones)
    .filter(tz => DateTime.local().setZone(tz).isValid)
    .sort();

router.get('/', async (req, res, next) => res.json(timezones));

export default router;
