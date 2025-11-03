import { z } from "zod";
import { ballotsSchema } from "./ballots.js";

export const resultIdSchema = z.string(); // "{ballot_id}-{SAPIN}"

export const resultSchema = z.object({
	id: resultIdSchema,
	ballot_id: z.number(),
	SAPIN: z.number().optional(), // Present in WG ballots, but not SA ballots
	Email: z.email(),
	Name: z.string(),
	Affiliation: z.string(),
	Status: z.string().nullable(),
	lastBallotId: z.number().nullable(),
	lastSAPIN: z.number().optional(),
	vote: z.string(),
	commentCount: z.number(),
	totalCommentCount: z.number().optional(),
	notes: z.string().nullable(),
});
export const resultsSchema = resultSchema.array();

export const resultChangeSchema = resultSchema
	.pick({
		vote: true,
		notes: true,
	})
	.partial();
export const resultUpdateSchema = z.object({
	id: resultIdSchema,
	changes: resultChangeSchema,
});
export const resultUpdatesSchema = resultUpdateSchema.array();

export type Result = z.infer<typeof resultSchema>;
export type ResultChange = z.infer<typeof resultChangeSchema>;
export type ResultUpdate = z.infer<typeof resultUpdateSchema>;

export const getResultsResponseSchema = z.object({
	ballots: ballotsSchema,
	results: resultsSchema,
});
export type GetResultsResponse = z.infer<typeof getResultsResponseSchema>;
