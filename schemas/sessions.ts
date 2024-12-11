import { z } from "zod";
import { groupIdSchema } from "./groups";

export const roomSchema = z.object({
	id: z.number(),
	name: z.string(),
	description: z.string(),
});
export type Room = z.infer<typeof roomSchema>;

export const timeslotSchema = z.object({
	id: z.number(),
	name: z.string(),
	startTime: z.string(),
	endTime: z.string(),
});
export type Timeslot = z.infer<typeof timeslotSchema>;

// To fix: some entries are string[][] and some are {}[]
export const defaultCreditsSchema = z.array(
	z.union([z.string().array(), z.object({})])
);

export const sessionTypeSchema = z.enum(["p", "i", "o", "g"]);
export type SessionType = z.infer<typeof sessionTypeSchema>;

export const sessionIdSchema = z.number();

export const sessionSchema = z.object({
	id: sessionIdSchema,
	number: z.number().nullable(),
	name: z.string(),
	type: sessionTypeSchema,
	groupId: z.string().nullable(),
	isCancelled: z.boolean(),
	imatMeetingId: z.number().nullable(),
	OrganizerID: z.string(),
	timezone: z.string(),
	startDate: z.string().date(),
	endDate: z.string().date(),
	attendees: z.number(),
	rooms: roomSchema.array(),
	timeslots: timeslotSchema.array(),
	defaultCredits: defaultCreditsSchema,
});
export const sessionsSchema = sessionSchema.array();

export const sessionsQuerySchema = z
	.object({
		id: z.union([sessionIdSchema, sessionIdSchema.array()]),
		number: z.union([z.coerce.number(), z.coerce.number().array()]),
		name: z.union([z.string(), z.string().array()]),
		type: z.union([sessionTypeSchema, sessionTypeSchema.array()]),
		timezone: z.union([z.string(), z.string().array()]),
		groupId: z.union([groupIdSchema, groupIdSchema.array()]),
		isCancelled: z.union([z.boolean(), z.boolean().array()]),
		limit: z.coerce.number(),
	})
	.partial();

export const sessionCreateSchema = sessionSchema.omit({
	id: true,
	attendees: true,
});
export const sessionCreatesSchema = sessionCreateSchema.array();

export const sessionChangesSchema = sessionSchema
	.omit({
		attendees: true,
	})
	.partial();
export const sessionUpdateSchema = z.object({
	id: sessionIdSchema,
	changes: sessionChangesSchema,
});
export const sessionUpdatesSchema = sessionUpdateSchema.array();

export const sessionIdsSchema = sessionIdSchema.array();

export type Session = z.infer<typeof sessionSchema>;
export type SessionsQuery = z.infer<typeof sessionsQuerySchema>;
export type SessionCreate = z.infer<typeof sessionCreateSchema>;
export type SessionChanges = z.infer<typeof sessionChangesSchema>;
export type SessionUpdate = z.infer<typeof sessionUpdateSchema>;
