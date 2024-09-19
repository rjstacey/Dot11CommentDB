import { z } from "zod";
import { groupIdSchema } from "./groups";
import { resultsSummarySchema } from "./results";
import { commentsSummarySchema } from "./comments";

export const ballotSchema = z.object({
	id: z.number(),
	groupId: groupIdSchema,
	workingGroupId: groupIdSchema,
	Type: z.number(),
	number: z.number(),
	BallotID: z.string(),
	Project: z.string(),
	prev_id: z.number().nullable(),
	IsRecirc: z.boolean(),
	IsComplete: z.boolean(),
	stage: z.number(),
	Start: z.string().datetime({ offset: true }).nullable(),
	End: z.string().datetime({ offset: true }).nullable(),
	Document: z.string(),
	Topic: z.string(),
	EpollNum: z.number().nullable(),
	Results: resultsSummarySchema.nullable(),
	Comments: commentsSummarySchema,
	Voters: z.number(),
});

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
	IsRecirc: true,
	IsComplete: true,
	Start: true,
	End: true,
	Document: true,
	Topic: true,
	EpollNum: true,
	prev_id: true,
});
export const ballotCreatesSchema = ballotCreateSchema.array();
export const ballotChangesSchema = ballotSchema
	.omit({
		stage: true,
		Results: true,
		Comments: true,
		Voters: true,
	})
	.partial();
export const ballotUpdateSchema = z.object({
	id: z.number(),
	changes: ballotChangesSchema,
});
export const ballotUpdatesSchema = ballotUpdateSchema.array();
export const ballotIdsSchema = z.number().array();

export type Ballot = z.infer<typeof ballotSchema>;
export type BallotQuery = z.infer<typeof ballotQuerySchema>;
export type BallotCreate = z.infer<typeof ballotCreateSchema>;
export type BallotUpdate = z.infer<typeof ballotUpdateSchema>;
