import { z } from "zod";
import { contactInfoSchema } from "./members.js";

export const imatMeetingSchema = z.object({
	id: z.number(),
	organizerId: z.string(),
	organizerSymbol: z.string(),
	organizerName: z.string(),
	name: z.string(),
	type: z.string(),
	start: z.string(),
	end: z.string(),
	timezone: z.string(),
});
export const imatMeetingsSchema = imatMeetingSchema.array();

export type ImatMeeting = z.infer<typeof imatMeetingSchema>;

export const imatTimeslotSchema = z.object({
	id: z.number(),
	name: z.string(),
	startTime: z.string(),
	endTime: z.string(),
});
export const imatTimeslotsSchema = imatTimeslotSchema.array();

export type ImatTimeslot = z.infer<typeof imatTimeslotSchema>;

export const imatCommitteeSchema = z.object({
	id: z.number(),
	parentId: z.string(),
	type: z.string(),
	symbol: z.string(),
	shortName: z.string(),
	name: z.string(),
});
export const imatCommitteesSchema = imatCommitteeSchema.array();

export type ImatCommittee = z.infer<typeof imatCommitteeSchema>;

export const breakoutIdSchema = z.number();
export const breakoutIdsSchema = breakoutIdSchema.array();

export const breakoutSchema = z.object({
	id: breakoutIdSchema,
	name: z.string(),
	location: z.string(),
	day: z.number(),

	groupId: z.number(), // Committee identifier
	groupShortName: z.string().optional(), // Committee short name
	symbol: z.string(), // Committee sumbol

	start: z.string(),
	startTime: z.string(),
	startSlotId: z.number(),

	end: z.string(),
	endTime: z.string(),
	endSlotId: z.number(),

	credit: z.string(),
	creditOverrideNumerator: z.number(),
	creditOverrideDenominator: z.number(),

	facilitator: z.string(), // Facilitator email or ""

	editContext: z.string().optional(),
	editGroupId: z.string().optional(),
	formIndex: z.string().optional(), // Identifies the breakout for the delete post
});
export const breakoutsSchema = breakoutSchema.array();

export const breakoutCreateSchema = breakoutSchema.omit({
	id: true,
	start: true,
	end: true,
	editContext: true,
	editGroupId: true,
	formIndex: true,
});
export const breakoutCreatesSchema = breakoutCreateSchema.array();

export const breakoutUpdateSchema = breakoutSchema.omit({
	start: true,
	end: true,
	formIndex: true,
});
export const breakoutUpdatesSchema = breakoutUpdateSchema.array();

export type Breakout = z.infer<typeof breakoutSchema>;
export type BreakoutCreate = z.infer<typeof breakoutCreateSchema>;
export type BreakoutUpdate = z.infer<typeof breakoutUpdateSchema>;

export const imatMeetingAttendanceSchema = z.object({
	id: z.number(),
	committee: z.string(),
	breakoutName: z.string(),
	SAPIN: z.number(),
	Name: z.string(),
	Email: z.string(),
	Timestamp: z.string(),
	Affiliation: z.string(),
});
export const imatMeetingAttendancesSchema = imatMeetingAttendanceSchema.array();

export type ImatMeetingAttendance = z.infer<typeof imatMeetingAttendanceSchema>;

export const imatBreakoutAttendanceSchema = z.object({
	SAPIN: z.number(),
	Name: z.string(),
	Email: z.string(),
	Timestamp: z.string().nullable(), // ISO datetime
	Affiliation: z.string(),
});
export const imatBreakoutAttendancesSchema =
	imatBreakoutAttendanceSchema.array();

export type ImatBreakoutAttendance = z.infer<
	typeof imatBreakoutAttendanceSchema
>;

export const imatAttendanceSummarySchema = z.object({
	SAPIN: z.number(),
	Name: z.string(),
	FirstName: z.string(),
	MI: z.string(),
	LastName: z.string(),
	Email: z.string(),
	Affiliation: z.string(),
	Status: z.string(),
	AttendancePercentage: z.number(),
});
export const imatAttendanceSummariesSchema =
	imatAttendanceSummarySchema.array();

export type ImatAttendanceSummary = z.infer<typeof imatAttendanceSummarySchema>;

export const imatDailyAttendanceSummarySchema =
	imatAttendanceSummarySchema.extend({
		Employer: z.string(),
		ContactInfo: contactInfoSchema,
	});

export type ImatDailyAttendanceSummary = z.infer<
	typeof imatDailyAttendanceSummarySchema
>;

export const getImatBreakoutsResponseSchema = z.object({
	imatMeeting: imatMeetingSchema,
	breakouts: breakoutsSchema,
	timeslots: imatTimeslotsSchema,
	committees: imatCommitteesSchema,
});
export type GetImatBreakoutsResponse = z.infer<
	typeof getImatBreakoutsResponseSchema
>;
