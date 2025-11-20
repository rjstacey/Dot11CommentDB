import { z } from "zod";
import { ballotsSchema } from "./ballots.js";

export const ballotSeriesSchema = z.object({
	id: z.number(),
	ballotIds: z.array(z.number()),
	votingPoolId: z.number(),
	start: z.string(),
	end: z.string(),
	project: z.string(),
});

export const ballotSeriesParticipationSummarySchema = z.object({
	SAPIN: z.number(), // Current SAPIN
	series_id: z.number(), // Ballot series identifier
	voterSAPIN: z.number(), // SAPIN in voting pool
	voter_id: z.string(), // Voter identifier in voting pool
	excused: z.boolean(), // Excused from participation (recorded in voting pool)
	vote: z.string().nullable(), // Last vote
	lastSAPIN: z.number().nullable(), // SAPIN used for last vote
	lastBallotId: z.number().nullable(), // Ballot identifier for last vote
	commentCount: z.number().nullable(), // Number of comments submitted with last vote
	totalCommentCount: z.number().nullable(), // Total comments over ballot series
});

export const recentBallotSeriesParticipationSchema = z.object({
	SAPIN: z.number(),
	ballotSeriesParticipationSummaries: z.array(
		ballotSeriesParticipationSummarySchema
	),
});

export type BallotSeriesParticipationSummary = z.infer<
	typeof ballotSeriesParticipationSummarySchema
>;

export type RecentBallotSeriesParticipation = z.infer<
	typeof recentBallotSeriesParticipationSchema
>;

export type BallotSeries = z.infer<typeof ballotSeriesSchema>;

export const getBallotParticipationResponseSchema = z.object({
	ballots: ballotsSchema,
	ballotSeries: ballotSeriesSchema.array(),
	ballotSeriesParticipation: recentBallotSeriesParticipationSchema.array(),
});
