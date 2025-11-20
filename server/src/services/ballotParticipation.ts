import db from "../utils/database.js";
import type { RowDataPacket } from "mysql2";
import { getBallots } from "./ballots.js";
import type {
	BallotSeries,
	BallotSeriesParticipationSummary,
	RecentBallotSeriesParticipation,
} from "@schemas/ballotParticipation.js";

/**
 * Get recent ballot series
 * @returns An array of ballot arrays that are the recent ballot series
 */
async function getRecentCompletedBallotSeries(
	workingGroupId: string
): Promise<BallotSeries[]> {
	const sql = `
		SELECT
			series_id AS id,
			initial_id AS votingPoolId,
			DATE_FORMAT(series_start, "%Y-%m-%dT%TZ") AS start,
			DATE_FORMAT(End, "%Y-%m-%dT%TZ") AS end,
			ballotIds,
			Project AS project
		FROM ballotsSeries s1
		WHERE workingGroupId=UUID_TO_BIN(${db.escape(
			workingGroupId
		)}) AND IsComplete<>0 AND type=1
		ORDER BY End;
	`;
	let ballotSeries: BallotSeries[] =
		await db.query<(RowDataPacket & BallotSeries)[]>(sql);

	// Find the earliest start of the last three ballot series
	let earliestStart = new Date();
	ballotSeries.slice(-3).forEach((series) => {
		const start = new Date(series.start);
		if (earliestStart > start) earliestStart = start;
	});

	// Select all that start after the earliest start of the three
	ballotSeries = ballotSeries.filter(
		(series) => new Date(series.start) >= earliestStart
	);

	return ballotSeries;
}

/**
 * Get active ballot series
 * @returns An array of ballot arrays that are the recent ballot series
 */
async function getActiveBallotSeries(
	workingGroupId: string
): Promise<BallotSeries[]> {
	const sql = `
		SELECT
			s1.series_id AS id,
			s1.initial_id AS votingPoolId,
			DATE_FORMAT(s1.series_start, "%Y-%m-%dT%TZ") AS start,
			DATE_FORMAT(s1.End, "%Y-%m-%dT%TZ") AS end,
			s1.ballotIds,
			s1.Project AS project
		FROM ballotsSeries s1
			LEFT JOIN ballots ON s1.id=ballots.prev_id
		WHERE s1.workingGroupId=UUID_TO_BIN(${db.escape(
			workingGroupId
		)}) AND s1.IsComplete=0 AND s1.type=1 AND ballots.id IS NULL AND s1.Project NOT LIKE "%TEST%"
		ORDER BY End;
	`;
	const ballotSeries: BallotSeries[] =
		await db.query<(RowDataPacket & BallotSeries)[]>(sql);

	return ballotSeries;
}

export function getBallotSeriesParticipationSummary(
	series_id: number,
	initial_id: number
): Promise<BallotSeriesParticipationSummary[]> {
	const sql = `
		WITH resultsForSeries AS (
			SELECT *
			FROM (
				SELECT
					b.id,
					b.series_id,
					b.initial_id,
					r.CurrentSAPIN,
					LAST_VALUE(r.vote) OVER w AS vote,
					LAST_VALUE(r.ballot_id) OVER w AS lastBallotId,
					LAST_VALUE(r.SAPIN) OVER w AS lastSAPIN,
					LAST_VALUE(r.commentCount) OVER w AS commentCount,
					SUM(r.commentCount) OVER w AS totalCommentCount,
					ROW_NUMBER() OVER w AS n
				FROM resultsCurrent r JOIN ballotsSeries b ON b.id=r.ballot_id
				WHERE b.series_id=${series_id} AND
					(r.Vote="Approve" OR r.Vote="Disapprove" OR r.Vote LIKE "Abstain%expertise")
				WINDOW w AS (PARTITION BY b.series_id, r.CurrentSAPIN ORDER BY b.Start DESC)
			) AS t
			WHERE n=1
		)
		SELECT
			v.CurrentSAPIN AS SAPIN,
			${series_id} AS series_id,
			v.SAPIN AS voterSAPIN,
			BIN_TO_UUID(v.id) AS voter_id,
			v.Excused AS excused,
			r.vote,
			r.lastSAPIN,
			r.lastBallotId,
			r.commentCount,
			r.totalCommentCount
		FROM votersCurrent v
			LEFT JOIN resultsForSeries r ON r.initial_id=v.ballot_id AND r.CurrentSAPIN=v.CurrentSAPIN
		WHERE v.ballot_id=${initial_id}
		ORDER BY SAPIN;
	`;

	return db.query<(RowDataPacket & BallotSeriesParticipationSummary)[]>(sql);
}

export async function getBallotSeriesParticipation(groupId: string) {
	const ballotSeries = await getRecentCompletedBallotSeries(groupId);

	const ballotIds = ballotSeries.reduce(
		(ids, series) => ids.concat(...series.ballotIds),
		[] as number[]
	);
	const ballots =
		ballotIds.length > 0 ? await getBallots({ id: ballotIds }) : [];

	const summaryIds: number[] = [];
	const summaryEntities: Record<number, BallotSeriesParticipationSummary[]> =
		{};
	for (const series of ballotSeries) {
		const summaries = await getBallotSeriesParticipationSummary(
			series.id,
			series.votingPoolId
		);
		for (const s of summaries) {
			if (!summaryIds.includes(s.SAPIN)) {
				summaryIds.push(s.SAPIN);
				summaryEntities[s.SAPIN] = [];
			}
			summaryEntities[s.SAPIN].push(s);
		}
	}

	const ballotSeriesParticipation: RecentBallotSeriesParticipation[] =
		summaryIds.map((sapin) => ({
			SAPIN: sapin,
			ballotSeriesParticipationSummaries: summaryEntities[sapin],
		}));

	return {
		ballotSeries,
		ballots,
		ballotSeriesParticipation,
	};
}

export async function getActiveBallotSeriesParticipation(groupId: string) {
	const ballotSeries = await getActiveBallotSeries(groupId);

	const ballotIds = ballotSeries.reduce(
		(ids, series) => ids.concat(...series.ballotIds),
		[] as number[]
	);
	const ballots =
		ballotIds.length > 0 ? await getBallots({ id: ballotIds }) : [];

	const summaryIds: number[] = [];
	const summaryEntities: Record<number, BallotSeriesParticipationSummary[]> =
		{};
	for (const series of ballotSeries) {
		const summaries = await getBallotSeriesParticipationSummary(
			series.id,
			series.votingPoolId
		);
		for (const s of summaries) {
			if (!summaryIds.includes(s.SAPIN)) {
				summaryIds.push(s.SAPIN);
				summaryEntities[s.SAPIN] = [];
			}
			summaryEntities[s.SAPIN].push(s);
		}
	}

	const ballotSeriesParticipation: RecentBallotSeriesParticipation[] =
		summaryIds.map((sapin) => ({
			SAPIN: sapin,
			ballotSeriesParticipationSummaries: summaryEntities[sapin],
		}));

	return {
		ballotSeries,
		ballots,
		ballotSeriesParticipation,
	};
}
