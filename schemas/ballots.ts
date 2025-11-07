import { z } from "zod";
import { groupIdSchema } from "./groups.js";

export enum BallotType {
	CC = 0, // comment collection
	WG = 1, // WG ballot
	SA = 2, // SA ballot
}
export const ballotTypeSchema = z.enum(BallotType);

export const commentsSummarySchema = z.object({
	Count: z.number(),
	CommentIDMin: z.nullable(z.number()),
	CommentIDMax: z.nullable(z.number()),
});
export type CommentsSummary = z.infer<typeof commentsSummarySchema>;

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
	VotingPoolSize: z.number().optional(),
	Commenters: z.number().optional(),
});
export type ResultsSummary = z.infer<typeof resultsSummarySchema>;

export const ballotSchema = z.object({
	id: z.number(),
	groupId: groupIdSchema,
	workingGroupId: groupIdSchema,
	Type: ballotTypeSchema, //z.number(),
	number: z.number(),
	//BallotID: z.string(),
	Project: z.string(),
	prev_id: z.number().nullable(),
	IsComplete: z.boolean(),
	stage: z.number(),
	Start: z.iso.datetime({ offset: true }).nullable(),
	End: z.iso.datetime({ offset: true }).nullable(),
	Document: z.string(),
	Topic: z.string(),
	EpollNum: z.number().nullable(),
	Results: resultsSummarySchema.nullable(),
	Comments: commentsSummarySchema,
	Voters: z.number(),
});
export const ballotsSchema = ballotSchema.array();

export const ballotQuerySchema = z
	.object({
		id: z.union([z.number(), z.number().array()]),
		workingGroupId: z.union([groupIdSchema, groupIdSchema.array()]),
		groupId: z.union([groupIdSchema, groupIdSchema.array()]),
		BallotID: z.union([z.string(), z.string().array()]),
		Type: z.union([z.number(), z.number().array()]),
	})
	.partial();

export const ballotCreateSchema = ballotSchema.pick({
	groupId: true,
	Type: true,
	number: true,
	Project: true,
	IsComplete: true,
	Start: true,
	End: true,
	Document: true,
	Topic: true,
	EpollNum: true,
	prev_id: true,
});
export const ballotCreatesSchema = ballotCreateSchema.array();
export const ballotChangeSchema = ballotSchema
	.omit({
		stage: true,
		Results: true,
		Comments: true,
		Voters: true,
	})
	.partial();
export const ballotUpdateSchema = z.object({
	id: z.number(),
	changes: ballotChangeSchema,
});
export const ballotUpdatesSchema = ballotUpdateSchema.array();
export const ballotIdsSchema = z.number().array();

export type Ballot = z.infer<typeof ballotSchema>;
export type BallotQuery = z.infer<typeof ballotQuerySchema>;
export type BallotCreate = z.infer<typeof ballotCreateSchema>;
export type BallotUpdate = z.infer<typeof ballotUpdateSchema>;
export type BallotChange = z.infer<typeof ballotChangeSchema>;
