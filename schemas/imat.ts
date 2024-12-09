import { z } from "zod";

export const breakoutSchema = z.object({
	id: z.number(),
	name: z.string(),
	location: z.string(),
	day: z.number(),

	groupId: z.number(), // Committee identifier
	groupShortName: z.string().optional(), // Committee short name
	symbol: z.string(), // Committee sumbol

	startTime: z.string().time(),
	startSlotId: z.number(),

	endTime: z.string().time(),
	endSlotId: z.number(),

	credit: z.string(),
	creditOverrideNumerator: z.number(),
	creditOverrideDenominator: z.number(),

	facilitator: z.string().email(), // Facilitator email

	editContext: z.string().optional(),
	editGroupId: z.string().optional(),
	formIndex: z.string().optional(), // Identifies the breakout for the delete post
});

export type Breakout = z.infer<typeof breakoutSchema>;

export const breakoutCreateSchema = breakoutSchema.omit({
	id: true,
	editContext: true,
	editGroupId: true,
	formIndex: true,
});
export type BreakoutCreate = z.infer<typeof breakoutCreateSchema>;
export const breakoutCreatesSchema = breakoutCreateSchema.array();

export const breakoutUpdateSchema = breakoutSchema.omit({
	formIndex: true,
});
export type BreakoutUpdate = z.infer<typeof breakoutUpdateSchema>;
export const breakoutUpdatesSchema = breakoutUpdateSchema.array();

export const breakoutIdsSchema = z.number().array();
