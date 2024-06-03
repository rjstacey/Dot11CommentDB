import { z } from "zod";
import { webexMeetingSchema } from "./webex";

export const meetingSchema = z.object({
	id: z.number(),
	organizationId: z.string().uuid(),
	start: z.string().datetime(),
	end: z.string().datetime(),
	timezone: z.string(),
	summary: z.string(),
	location: z.string(),
	isCancelled: z.boolean(),
	hasMotions: z.boolean(),
	webexAccountId: z.number().nullable(),
	webexMeetingId: z.string().nullable(),
	webexMeeting: webexMeetingSchema.partial(),
	calendarAccountId: z.number().nullable(),
	calendarEventId: z.string().nullable(),
	imatMeetingId: z.number().nullable(),
	imatBreakoutId: z.number().nullable(),
	sessionId: z.number(),
	roomId: z.number(),
	roomName: z.string(),
});

export const meetingCreateSchema = meetingSchema.merge(
	z.object({
		webexMeetingId: z.union([z.string(), z.null(), z.literal("$add")]),
		imatBreakoutId: z.union([z.number(), z.null(), z.literal("$add")]),
	})
);
export const meetingCreatesSchema = meetingCreateSchema.array();

export const meetingUpdateSchema = z.object({
	id: z.number(),
	changes: meetingCreateSchema,
});
export const meetingUpdatesSchema = meetingUpdateSchema.array();

export const meetingIdsSchema = z.number().array();

export type Meeting = z.infer<typeof meetingSchema>;
export type MeetingCreate = z.infer<typeof meetingCreateSchema>;
export type MeetingChanges = z.infer<typeof meetingCreateSchema>;
export type MeetingUpdate = z.infer<typeof meetingUpdateSchema>;
