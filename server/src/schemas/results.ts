import { boolean, z } from "zod";

export const resultIdSchema = z.string(); // "{ballot_id}-{SAPIN}"

export const resultSchema = z.object({
	id: resultIdSchema,
	ballot_id: z.number(),
	SAPIN: z.number(),
	Email: z.string().email(),
	Name: z.string(),
	Affiliation: z.string(),
	Status: z.string(),
	lastBallotId: z.number(),
	lastSAPIN: z.number(),
	vote: z.string(),
	commentCount: z.number(),
	totalCommentCount: z.number().optional(),
	notes: z.string().nullable(),
});

export const resultsSummarySchema = z.object({
	Approve: z.number(),
	Disapprove: z.number(),
	Abstain: z.number(),
	InvalidVote: z.number(),
	InvalidAbstain: z.number(),
	InvalidDisapprove: z.number(),
	ReturnsPoolSize: z.number(),
	TotalReturns: z.number(),
	BallotReturns: z.number(),
	VotingPoolSize: z.number(),
	Commenters: z.number(),
});

export const resultChangeSchema = resultSchema.pick({
	vote: true,
	notes: true,
});
export const resultUpdateSchema = z.object({
	id: resultIdSchema,
	changes: resultChangeSchema,
});
export const resultUpdatesSchema = resultUpdateSchema.array();

export type Result = z.infer<typeof resultSchema>;
export type ResultsSummary = z.infer<typeof resultsSummarySchema>;
export type ResultChange = z.infer<typeof resultChangeSchema>;
export type ResultUpdate = z.infer<typeof resultUpdateSchema>;
