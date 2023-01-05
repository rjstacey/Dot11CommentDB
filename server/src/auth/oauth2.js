import {Router} from 'express';

import {completeAuthCalendarAccount} from '../services/calendar';
import {completeAuthWebexAccount} from '../services/webex';

/*
 * oauth2 API
 *
 * This interface is used for oauth2 callbacks
 * GET /calendar: oauth2 calback for calendar authorizations
 * GET /webex: oauth2 callback for webex authorizations
 */
const router = Router();

router.get('/calendar', async (req, res, next) => {
    try {
        await completeAuthCalendarAccount(req.query);
        res.redirect('/telecons/accounts');
    }
    catch (err) {
        next(err);
    }
});

router.get('/webex', async (req, res, next) => {
    try {
        await completeAuthWebexAccount(req.query);
        res.redirect('/telecons/accounts');
    }
    catch (err) {
        next(err);
    }
});

export default router;
