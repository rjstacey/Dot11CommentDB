import { z } from "zod";
import { groupIdSchema } from "./groups";

export const affiliationMapIdsSchema = z.number().array();

export const affiliationMapSchema = z.object({
	id: z.number(),
	groupId: groupIdSchema,
	match: z.string(),
	shortAffiliation: z.string(),
});

const affiliationMapCreateSchema = affiliationMapSchema.omit({
	id: true,
	groupId: true,
});
export const affiliationMapCreatesSchema = affiliationMapCreateSchema.array();

const affiliationMapChangeSchema = affiliationMapCreateSchema.partial();

const affiliationMapUpdateSchema = z.object({
	id: z.number(),
	changes: affiliationMapChangeSchema,
});
export const affiliationMapUpdatesSchema = affiliationMapUpdateSchema.array();

export type AffiliationMap = z.infer<typeof affiliationMapSchema>;
export type AffiliationMapCreate = z.infer<typeof affiliationMapCreateSchema>;
export type AffiliationMapUpdate = z.infer<typeof affiliationMapUpdateSchema>;
