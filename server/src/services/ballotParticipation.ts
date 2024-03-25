import { getRecentBallotSeries, type Ballot } from "./ballots";
import { getVotersForBallots } from "./voters";
import { getResultsForWgBallot, Result } from "./results";

type BallotSeries = {
	id: number;
	ballotIds: number[];
	start: string;
	end: string;
	project: string;
};

type BallotSeriesParticipationSummary = {
	id: number;					// Ballot series identifier
	votingPoolSAPIN: number;	// SAPIN in voting pool
	currentSAPIN: number;		// Current SAPIN (voting pool SAPIN may be obsolete)
	voter_id: string;			// Voter identifier
	excused: boolean;			// Excused from participation (recorded in voting pool table)
	vote: string | null;		// Last vote
	SAPIN: number | null;		// SAPIN used for last vote
	ballot_id: number | null;	// Ballot identifier for last vote
	commentCount: number | null;//Number of comments submitted with las vote
};

type RecentBallotSeriesParticipation = {
	SAPIN: number;
	ballotSeriesParticipationSummaries: BallotSeriesParticipationSummary[];
};

export async function getBallotSeriesParticipation(groupId: string) {
	//const t1 = Date.now();
	//let completedBallots = await getRecentWgBallots();

	//const t2 = Date.now();
	const ballotsArr = await getRecentBallotSeries(groupId);

	//const t3 = Date.now();
	const ballotSeriesArr: BallotSeries[] = [];
	const resultsEntities: Record<number, Result[]> = {};
	const initialBallot_ids: number[] = [];
	let allBallots: Ballot[] = [];
	for (const ballots of ballotsArr) {
		const id = ballots[0].id; // use initial ballot identifier as the series identifier
		initialBallot_ids.push(id);
		allBallots = allBallots.concat(ballots);
		const results = await Promise.all(
			ballots.map((ballot) => getResultsForWgBallot(ballot.id))
		);
		results.forEach(
			(results, i) => (resultsEntities[ballots[i].id] = results)
		);
		ballotSeriesArr.push({
			id,
			ballotIds: ballots.map((b) => b.id),
			start: ballots[0].Start!,
			end: ballots[ballots.length - 1].End!,
			project: ballots[0].Project,
		});
	}

	//const t4 = Date.now();
	const votersForBallots = initialBallot_ids.length > 0?
		await getVotersForBallots(initialBallot_ids): [];

	//const t5 = Date.now();
	let ballotSeriesParticipation: RecentBallotSeriesParticipation[] =
		votersForBallots.map((v) => {
			let ballotSeriesParticipationSummaries: BallotSeriesParticipationSummary[] =
				[];
			for (const byBallot of v.byBallots) {
				let ballotSeries = ballotSeriesArr.find(
					(ballotSeries) => ballotSeries.id === byBallot.ballot_id
				)!;
				const summary: BallotSeriesParticipationSummary = {
					id: ballotSeries.id,
					voter_id: byBallot.voter_id,
					excused: byBallot.Excused,
					votingPoolSAPIN: byBallot.SAPIN,
					currentSAPIN: v.SAPIN,
					SAPIN: null,
					ballot_id: null,
					vote: null,
					commentCount: null,
				};
				// Find last valid vote.
				for (const ballot_id of ballotSeries.ballotIds
					.slice()
					.reverse()) {
					const results = resultsEntities[ballot_id];
					let r = results.find(
						(r) =>
							r.CurrentSAPIN === v.SAPIN &&
							[
								"Approve",
								"Disapprove",
								"Abstain - Lack of expertise",
							].includes(r.Vote)
					);
					if (r) {
						summary.SAPIN = r.SAPIN;
						summary.ballot_id = ballot_id;
						summary.vote = r.Vote;
						summary.commentCount = r.CommentCount;
						break;
					}
				}
				ballotSeriesParticipationSummaries.push(summary);
			}
			return {
				SAPIN: v.SAPIN,
				ballotSeriesParticipationSummaries,
			};
		});

	//const t6 = Date.now();
	//console.log(`Total time: ${t6-t1}ms`);
	//console.log(`Get completed ballots: ${t2-t1}ms`);
	//console.log(`Get ballot series: ${t3-t2}ms`);
	//console.log(`Get results and for ballot series: ${t4-t3}ms`);
	//console.log(`Get voters for ballots: ${t5-t4}ms`);
	//console.log(`Colate results: ${t6-t5}ms`);

	return {
		ballotSeries: ballotSeriesArr,
		ballots: allBallots,
		ballotSeriesParticipation,
	};
}
