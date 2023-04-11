/*
 * Ballot Series Participation API
 *
 */
import { Router } from 'express';

import {
    getBallotSeriesParticipation,
} from '../services/ballotParticipation';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
     const data = await getBallotSeriesParticipation();
     res.json(data);
  }
  catch(err) {next(err)}
});

export default router;
