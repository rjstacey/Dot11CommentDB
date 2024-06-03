import { z } from "zod";

export const voterIdSchema = z.string().uuid();

export const voterSchema = z.object({
	id: voterIdSchema,
	SAPIN: z.number(),
	CurrentSAPIN: z.number(),
	Name: z.string(),
	Email: z.string().email(),
	Affiliation: z.string(),
	Status: z.string(),
	Excused: z.boolean(),
	ballot_id: z.number(),
});

export const voterQuerySchema = z
	.object({
		id: z.union([voterIdSchema, voterIdSchema.array()]),
		ballot_id: z.union([z.number(), z.number().array()]),
		sapin: z.union([z.number(), z.number().array()]),
	})
	.partial();

export const voterCreateSchema = voterSchema
	.pick({
		SAPIN: true,
		Name: true,
		Email: true,
		Status: true,
	})
	.merge(
		voterSchema
			.pick({
				id: true,
				Affiliation: true,
				Excused: true,
			})
			.partial()
	);
export const voterCreatesSchema = voterCreateSchema.array();
export const voterUpdateSchema = z.object({
	id: voterIdSchema,
	changes: voterSchema.partial(),
});
export const voterUpdatesSchema = voterUpdateSchema.array();
export const voterIdsSchema = voterIdSchema.array();

export type Voter = z.infer<typeof voterSchema>;
export type VoterQuery = z.infer<typeof voterQuerySchema>;
export type VoterCreate = z.infer<typeof voterCreateSchema>;
export type VoterUpdate = z.infer<typeof voterUpdateSchema>;
