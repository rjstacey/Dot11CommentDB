import { Router } from 'express';

import { completeAuthCalendarAccount } from '../services/calendar';
import { completeAuthWebexAccount } from '../services/webex';

/*
 * oauth2 API
 *
 * This interface is used for oauth2 callbacks
 * GET /calendar: oauth2 calback for calendar authorizations
 * GET /webex: oauth2 callback for webex authorizations
 */
const router = Router();

router
    .get('/calendar', (req, res, next) => {
        completeAuthCalendarAccount(req.query)
            .then(() => res.redirect('/meetings/accounts'))
            .catch(next);
    })
    .get('/webex', (req, res, next) => {
        completeAuthWebexAccount(req.query)
            .then(() => res.redirect('/meetings/accounts'))
            .catch(next);
    });

export default router;
