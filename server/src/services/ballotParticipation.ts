import db from '../utils/database';

import {
    getBallotsSQL,
    BallotType,
    Ballot
} from './ballots';

import { getMembers } from './members';
import { getVoters, Voter } from './voters';
import { getResults, Result } from './results';

type BallotSeries = {
    id: number;
    ballotIds: number[];
    votingPoolId: string;
    start: string;
    end: string;
    project: string;
}

type BallotSeriesParticipationSummary = {
    id: number;                     /** Ballot series identifier */
	votingPoolSAPIN: number;        /** SAPIN in voting pool */
    excused: boolean;               /** Excused from participation (recorded in voting pool table) */
	vote: string | null;            /** Last vote */
    SAPIN: number | null;           /** SAPIN used for last vote */
	ballot_id: number | null;       /** Ballot identifier for last vote */
	commentCount: number | null;    /** Number of comments submitted with vote */
}

type RecentBallotSeriesParticipation = {
    SAPIN: number;
    ballotSeriesParticipationSummary: BallotSeriesParticipationSummary[];
}

export async function getBallotSeries(id: number) {

	async function recursiveBallotSeriesGet(ballotSeries: Ballot[], id: number): Promise<Ballot[]> {
		const [ballot] = await db.query(getBallotsSQL + ' WHERE id=?', [id]) as unknown as Ballot[];
        if (!ballot)
            return ballotSeries;
		ballotSeries.unshift(ballot);
        if (!ballot.prev_id || ballotSeries.length === 30)
            return ballotSeries;
        
		return recursiveBallotSeriesGet(ballotSeries, ballot.prev_id);
	}

	return recursiveBallotSeriesGet([], id);
}

export async function getBallotSeriesParticipation() {
	let ballots = await db.query(
		getBallotsSQL + ' WHERE ' +
			`Type=${BallotType.WG} AND ` +	// WG ballots
			'IsComplete<>0 ' + 				// series is complete
			'ORDER BY End DESC ' +			// newest to oldest
			'LIMIT 3;'						// last 3
	) as unknown as Ballot[];

    const ballotsArr = await Promise.all(ballots.map(b => getBallotSeries(b.id)));

    const ballotSeriesArr: BallotSeries[] = [];
    const resultsEntities: Record<number, Result[]> = {};
    const votersEntities: Record<number, Voter[]> = {};
    let allBallots: Ballot[] = [];
    for (const ballots of ballotsArr) {
        allBallots = allBallots.concat(ballots);
        const id = ballots[0].id;
        const votingPoolId = ballots[0].VotingPoolID;
        const {voters} = await getVoters(votingPoolId);
        votersEntities[id] = voters;
        const results = await Promise.all(ballots.map(ballot => getResults(ballot.id)));
        results.forEach((results, i) => resultsEntities[ballots[i].id] = results);
        ballotSeriesArr.push({
            id,
            ballotIds: ballots.map(b => b.id),
            votingPoolId,
            start: ballots[0].Start,
			end: ballots[ballots.length-1].End,
			project: ballots[0].Project,
        });
    }

    let ballotSeriesParticipation: RecentBallotSeriesParticipation[] = [];
    const members = await getMembers();
    for (const m of members) {
        let ballotSeriesParticipationSummary: BallotSeriesParticipationSummary[] = [];
        for (const ballotSeries of ballotSeriesArr) {
            // Ignore if members last status change occured after the ballot series started
		    if (m.StatusChangeDate && ballots[0].Start < m.StatusChangeDate)
                continue;
            const voters = votersEntities[ballotSeries.id];
            const sapins = [m.SAPIN].concat(m.ObsoleteSAPINs);
            let v = sapins.reduce((voter, sapin) => voter || voters.find(v => v.SAPIN === sapin), undefined as Voter | undefined);
            if (v) {
                // Member in voting pool, therefore counts toward maintaining voting rights
                const summary: BallotSeriesParticipationSummary = {
                    id: ballotSeries.id,
                    excused: v.Excused,
                    votingPoolSAPIN: v.SAPIN,
                    SAPIN: null,
                    ballot_id: null,
                    vote: null,
                    commentCount: null,
                };
                // Find last vote
                for (const ballot_id of ballotSeries.ballotIds.slice().reverse()) {
                    const results = resultsEntities[ballot_id];
                    let r = sapins.reduce((result, sapin) => result || results.find(r => r.SAPIN === sapin), undefined as Result | undefined);
                    if (r) {
                        summary.SAPIN = r.SAPIN;
                        summary.ballot_id = ballot_id;
                        summary.vote = r.Vote;
                        summary.commentCount = r.CommentCount;
                        break;
                    }
                }
                ballotSeriesParticipationSummary.push(summary);
            }
        }
        if (ballotSeriesParticipationSummary.length > 0)
            ballotSeriesParticipation.push({SAPIN: m.SAPIN, ballotSeriesParticipationSummary})
    }

    return {
        ballotSeries: ballotSeriesArr,
        ballots: allBallots,
        ballotSeriesParticipation
    };
}
