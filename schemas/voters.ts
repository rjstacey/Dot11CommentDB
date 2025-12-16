import { z } from "zod";
import { ballotSchema } from "./ballots.js";

export const voterIdSchema = z.string().uuid();

export const voterSchema = z.object({
	id: voterIdSchema,
	SAPIN: z.number(),
	CurrentSAPIN: z.number(),
	Name: z.string(),
	LastName: z.string(),
	FirstName: z.string(),
	MI: z.string(),
	Email: z.email(),
	Affiliation: z.string(),
	Status: z.string(),
	Excused: z.boolean(),
	ballot_id: z.number(),
	initial_id: z.number(),
});
export const votersSchema = voterSchema.array();

export const voterQuerySchema = z
	.object({
		id: z.union([voterIdSchema, voterIdSchema.array()]),
		ballot_id: z.union([z.number(), z.number().array()]),
		sapin: z.union([z.number(), z.number().array()]),
	})
	.partial();

export const voterCreateSchema = voterSchema
	.pick({
		ballot_id: true,
		SAPIN: true,
		Status: true,
	})
	.extend(
		voterSchema
			.pick({
				id: true,
				Affiliation: true,
				Excused: true,
			})
			.partial().shape
	);
export const voterCreatesSchema = voterCreateSchema.array();

export const voterChangeSchema = voterSchema
	.pick({
		SAPIN: true,
		Excused: true,
		Status: true,
	})
	.partial();

export const voterUpdateSchema = z.object({
	id: voterIdSchema,
	changes: voterChangeSchema,
});
export const voterUpdatesSchema = voterUpdateSchema.array();
export const voterIdsSchema = voterIdSchema.array();

export const voterMemberSnapshotParamsSchema = z.object({
	date: z.iso.date(),
});

export const votersResponseSchema = z.object({
	voters: votersSchema,
	ballots: ballotSchema.pick({ id: true, Voters: true }).array().optional(),
});
export type VotersResponse = z.infer<typeof votersResponseSchema>;
export type VoterMemberSnapshotParams = z.infer<
	typeof voterMemberSnapshotParamsSchema
>;
export type Voter = z.infer<typeof voterSchema>;
export type VoterQuery = z.infer<typeof voterQuerySchema>;
export type VoterCreate = z.infer<typeof voterCreateSchema>;
export type VoterChange = z.infer<typeof voterChangeSchema>;
export type VoterUpdate = z.infer<typeof voterUpdateSchema>;
