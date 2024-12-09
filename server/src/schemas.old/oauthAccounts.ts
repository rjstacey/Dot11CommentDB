import { z } from "zod";
import { groupIdSchema } from "./groups";

export const oAuthAccountTypeSchema = z.enum(["webex", "calendar"]);

export const oAuthAccountCreateSchema = z.object({
	name: z.string(),
	type: oAuthAccountTypeSchema,
	groupId: groupIdSchema,
});

export const oAuthAccountSchema = oAuthAccountCreateSchema.extend({
	id: z.number(),
	authUserId: z.number().nullable(),
	authDate: z.string().nullable(),
	authParams: z.record(z.string(), z.any()).nullable(),
});

export const oAuthAccountsQuerySchema = z
	.object({
		id: z.union([z.number(), z.number().array()]),
		name: z.union([z.string(), z.string().array()]),
		type: z.union([oAuthAccountTypeSchema, oAuthAccountTypeSchema.array()]),
		groupId: z.union([groupIdSchema, groupIdSchema.array()]),
	})
	.partial();

export const oAuthAccountChangeSchema = oAuthAccountCreateSchema.partial();

export const oAuthParamsSchema = oAuthAccountSchema.pick({
	id: true,
	authParams: true,
});

export type OAuthAccount = z.infer<typeof oAuthAccountSchema>;
export type OAuthAccountCreate = z.infer<typeof oAuthAccountCreateSchema>;
export type OAuthAccountChange = z.infer<typeof oAuthAccountChangeSchema>;
export type OAuthAccountsQuery = z.infer<typeof oAuthAccountsQuerySchema>;
export type OAuthParams = z.infer<typeof oAuthParamsSchema>;
