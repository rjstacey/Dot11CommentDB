import { z } from "zod";
import { groupIdSchema } from "./groups.js";

export const sessionAttendanceSummarySchema = z.object({
	id: z.number(),
	session_id: z.number(), // Session identifier
	AttendancePercentage: z.number().nullable(), // Percentage of meeting slots attended
	IsRegistered: z.boolean().nullable(), // Registered for session
	InPerson: z.boolean().nullable(), // Attended in-person (vs remote)
	DidAttend: z.boolean(), // Declare attendance criteria met
	DidNotAttend: z.boolean(), // Declare attendance criteria not met
	SAPIN: z.number(), // SA PIN under which attendance was logged
	CurrentSAPIN: z.number(), // Member's current SA PIN
	Notes: z.string().nullable(),
});
export const sessionAttendanceSummariesSchema =
	sessionAttendanceSummarySchema.array();

export const recentSessionAttendancesSchema = z.object({
	SAPIN: z.number(),
	sessionAttendanceSummaries: sessionAttendanceSummariesSchema,
});
export type RecentSessionAttendances = z.infer<
	typeof recentSessionAttendancesSchema
>;

export const sessionAttendanceSummaryCreateSchema =
	sessionAttendanceSummarySchema
		.pick({
			session_id: true,
			SAPIN: true,
		})
		.extend(
			sessionAttendanceSummarySchema
				.pick({
					AttendancePercentage: true,
					IsRegistered: true,
					InPerson: true,
					DidAttend: true,
					DidNotAttend: true,
					Notes: true,
				})
				.partial().shape
		);
export const sessionAttendanceSummaryCreatesSchema =
	sessionAttendanceSummaryCreateSchema.array();

export const sessionAttendanceSummaryChangesSchema =
	sessionAttendanceSummarySchema
		.pick({
			session_id: true,
			SAPIN: true,
			AttendancePercentage: true,
			IsRegistered: true,
			InPerson: true,
			DidAttend: true,
			DidNotAttend: true,
			Notes: true,
		})
		.partial();
export const sessionAttendanceSummaryUpdateSchema = z.object({
	id: z.number(),
	changes: sessionAttendanceSummaryChangesSchema,
});
export const sessionAttendanceSummaryUpdatesSchema =
	sessionAttendanceSummaryUpdateSchema.array();

export const sessionAttendanceSummaryIdsSchema = z.number().array();

export const sessionAttendanceSummaryQuerySchema = z
	.object({
		id: z.union([z.coerce.number(), z.coerce.number().array()]),
		groupId: z.union([groupIdSchema, groupIdSchema.array()]),
		session_id: z.union([z.coerce.number(), z.coerce.number().array()]),
		withAttendance: z.coerce.boolean(),
	})
	.partial();

export type SessionAttendanceSummary = z.infer<
	typeof sessionAttendanceSummarySchema
>;
export type SessionAttendanceSummaryQuery = z.infer<
	typeof sessionAttendanceSummaryQuerySchema
>;
export type SessionAttendanceSummaryCreate = z.infer<
	typeof sessionAttendanceSummaryCreateSchema
>;
export type SessionAttendanceSummaryChanges = z.infer<
	typeof sessionAttendanceSummaryChangesSchema
>;
export type SessionAttendanceSummaryUpdate = z.infer<
	typeof sessionAttendanceSummaryUpdateSchema
>;
