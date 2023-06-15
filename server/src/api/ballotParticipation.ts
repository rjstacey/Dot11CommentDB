/*
 * Ballot Series Participation API
 *
 */
import { Router } from 'express';
import { AccessLevel } from '../auth/access';
import { getBallotSeriesParticipation } from '../services/ballotParticipation';

const router = Router();

router
  .all('*', (req, res, next) => {
    if (!req.group)
			return res.status(500).send("Group not set");

		const access = req.group.permissions.members || AccessLevel.none;

		if (req.method === "GET" && access >= AccessLevel.ro)
			return next();
		if (req.method === "PATCH" && access >= AccessLevel.rw)
			return next();
		if ((req.method === "DELETE" || req.method === "POST") && access >= AccessLevel.admin)
			return next();
      
		res.status(403).send('Insufficient karma');
  })
  .get('/', (req, res, next) => {
    getBallotSeriesParticipation()
        .then(data => res.json(data))
        .catch(next);
  });

export default router;
