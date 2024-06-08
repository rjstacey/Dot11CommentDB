import { z } from "zod";
import { groupIdSchema } from "./groups";
import { oAuthAccountSchema } from "./oauthAccounts";

export const calendarAccountCreateSchema = z.object({
	name: z.string(),
});

export const calendarAccountChangeSchema =
	calendarAccountCreateSchema.partial();

export const calendarAccountsQuery = z.object({
	id: z.number().optional(),
	name: z.string().optional(),
	groupId: groupIdSchema.optional(),
	isActive: z.boolean().optional(),
});

export const calendarAccountSchema = oAuthAccountSchema
	.omit({ authParams: true })
	.extend({
		authUrl: z.string().url(),
		displayName: z.string().optional(),
		userName: z.string().optional(),
		details: z.any().optional(),
		calendarList: z.any().array(),
		lastAccessed: z.string().datetime().nullable(),
	});
export type CalendarAccount = z.infer<typeof calendarAccountSchema>;
export type CalendarAccountCreate = z.infer<typeof calendarAccountCreateSchema>;
export type CalendarAccountChange = z.infer<typeof calendarAccountChangeSchema>;
export type CalendarAccountsQuery = z.infer<typeof calendarAccountsQuery>;
