import { z } from "zod";
import {
	webexMeetingCreateSchema,
	webexMeetingChangeSchema,
	webexMeetingsSchema,
} from "./webex";
import { groupIdSchema } from "./groups";
import { breakoutsSchema } from "./imat";

export const meetingIdSchema = z.number();
export const meetingIdsSchema = meetingIdSchema.array();

export const meetingSchema = z.object({
	id: meetingIdSchema,
	organizationId: z.string().uuid(),
	start: z.string().datetime({ offset: true }),
	end: z.string().datetime({ offset: true }),
	timezone: z.string(),
	summary: z.string(),
	location: z.string().nullable().optional(),
	isCancelled: z.boolean(),
	hasMotions: z.boolean(),
	webexAccountId: z.number().nullable(),
	webexMeetingId: z.string().nullable(),
	calendarAccountId: z.number().nullable(),
	calendarEventId: z.string().nullable(),
	imatMeetingId: z.number().nullable(),
	imatBreakoutId: z.number().nullable(),
	sessionId: z.number(),
	roomId: z.number().nullable(),
	roomName: z.string().optional(),
});
export const meetingsSchema = meetingSchema.array();

/** Query schema. Will coerce strings to numbers so that it can be used with URL search params. */
export const meetingsQuerySchema = z
	.object({
		id: z.union([z.coerce.number(), z.coerce.number().array()]),
		groupId: groupIdSchema,
		sessionId: z.coerce.number(),
		fromDate: z.string().date(),
		toDate: z.string().date(),
		timezone: z.string(),
		organizationId: z.union([z.string(), z.string().array()]),
	})
	.partial();

export const meetingCreateWebexParamsSchema = webexMeetingCreateSchema.omit({
	start: true,
	end: true,
	timezone: true,
	title: true,
	integrationTags: true,
});

export const meetingCreateSchema = meetingSchema
	.omit({ id: true, roomName: true })
	.extend({
		webexMeetingId: z.union([z.string(), z.null(), z.literal("$add")]),
		imatBreakoutId: z.union([z.number(), z.null(), z.literal("$add")]),
		webexMeeting: meetingCreateWebexParamsSchema.optional(),
	});
export const meetingCreatesSchema = meetingCreateSchema.array();

export const meetingChangeWebexParamsSchema = webexMeetingChangeSchema.omit({
	start: true,
	end: true,
	timezone: true,
	title: true,
	integrationTags: true,
});
export const meetingChangeSchema = meetingCreateSchema
	.omit({ webexMeeting: true })
	.extend({
		webexMeeting: meetingChangeWebexParamsSchema.optional(),
	})
	.partial();

export const meetingUpdateSchema = z.object({
	id: z.number(),
	changes: meetingChangeSchema,
});
export const meetingUpdatesSchema = meetingUpdateSchema.array();

export const meetingsGetResponse = z.object({
	meetings: meetingsSchema,
	webexMeetings: webexMeetingsSchema,
	//breakouts: breakoutsSchema,
});
export const meetingsUpdateResponse = z.object({
	meetings: meetingsSchema,
	webexMeetings: webexMeetingsSchema,
	breakouts: breakoutsSchema,
});

export type Meeting = z.infer<typeof meetingSchema>;
export type MeetingsQuery = z.infer<typeof meetingsQuerySchema>;
export type MeetingCreate = z.infer<typeof meetingCreateSchema>;
export type MeetingChange = z.infer<typeof meetingChangeSchema>;
export type MeetingUpdate = z.infer<typeof meetingUpdateSchema>;
export type MeetingCreateWebexParams = z.infer<
	typeof meetingCreateWebexParamsSchema
>;
export type MeetingChangeWebexParams = z.infer<
	typeof meetingChangeWebexParamsSchema
>;
export type MeetingsGetResponse = z.infer<typeof meetingsGetResponse>;
export type MeetingsUpdateResponse = z.infer<typeof meetingsUpdateResponse>;
