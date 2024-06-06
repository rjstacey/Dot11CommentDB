import { z } from "zod";
import { webexMeetingSchema } from "./webex";
import { groupIdSchema } from "./groups";

const webexMeetingParamsSchema = webexMeetingSchema.omit({
	start: true,
	end: true,
	timezone: true,
	title: true,
	integrationTags: true,
});

export const meetingSchema = z.object({
	id: z.number(),
	organizationId: z.string().uuid(),
	start: z.string().datetime({ offset: true }),
	end: z.string().datetime({ offset: true }),
	timezone: z.string(),
	summary: z.string(),
	location: z.string().optional(),
	isCancelled: z.boolean(),
	hasMotions: z.boolean(),
	webexAccountId: z.number().nullable(),
	webexMeetingId: z.string().nullable(),
	webexMeeting: webexMeetingParamsSchema.partial(),
	calendarAccountId: z.number().nullable(),
	calendarEventId: z.string().nullable(),
	imatMeetingId: z.number().nullable(),
	imatBreakoutId: z.number().nullable(),
	sessionId: z.number(),
	roomId: z.number(),
	roomName: z.string().optional(),
});

export const meetingsQuerySchema = z.object({
	id: z.union([z.number(), z.number().array()]).optional(),
	groupId: groupIdSchema.optional(),
	sessionId: z.number().optional(),
	fromDate: z.string().date().optional(),
	toDate: z.string().date().optional(),
	timezone: z.string().optional(),
	organizationId: z.union([z.string(), z.string().array()]).optional(),
});

export const meetingCreateSchema = meetingSchema.omit({ id: true }).merge(
	z.object({
		webexMeetingId: z.union([z.string(), z.null(), z.literal("$add")]),
		imatBreakoutId: z.union([z.number(), z.null(), z.literal("$add")]),
	})
);
export const meetingCreatesSchema = meetingCreateSchema.array();

export const meetingChangesSchema = meetingCreateSchema.partial();

export const meetingUpdateSchema = z.object({
	id: z.number(),
	changes: meetingChangesSchema,
});
export const meetingUpdatesSchema = meetingUpdateSchema.array();

export const meetingIdsSchema = z.number().array();

export type Meeting = z.infer<typeof meetingSchema>;
export type MeetingsQuery = z.infer<typeof meetingsQuerySchema>;
export type MeetingCreate = z.infer<typeof meetingCreateSchema>;
export type MeetingChanges = z.infer<typeof meetingChangesSchema>;
export type MeetingUpdate = z.infer<typeof meetingUpdateSchema>;
