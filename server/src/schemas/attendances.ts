import { z } from "zod";

export const sessionAttendanceSummarySchema = z.object({
	id: z.number(),
	session_id: z.number(), // Session identifier
	AttendancePercentage: z.number(), // Percentage of meeting slots attended
	DidAttend: z.boolean(), // Declare attendance criteria met
	DidNotAttend: z.boolean(), // Declare attendance criteria not met
	SAPIN: z.number(), // SA PIN under which attendance was logged
	CurrentSAPIN: z.number(), // Member's current SA PIN
	Notes: z.string(),
});
export type SessionAttendanceSummary = z.infer<
	typeof sessionAttendanceSummarySchema
>;

export const recentSessionAttendancesSchema = z.object({
	SAPIN: z.number(),
	sessionAttendanceSummaries: sessionAttendanceSummarySchema.array(),
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
		.merge(
			sessionAttendanceSummarySchema
				.pick({
					AttendancePercentage: true,
					DidAttend: true,
					DidNotAttend: true,
					Notes: true,
				})
				.partial()
		);
export type SessionAttendanceSummaryCreate = z.infer<
	typeof sessionAttendanceSummaryCreateSchema
>;
export const sessionAttendanceSummaryCreatesSchema =
	sessionAttendanceSummaryCreateSchema.array();

export const sessionAttendanceSummaryChangesSchema =
	sessionAttendanceSummarySchema
		.pick({
			session_id: true,
			SAPIN: true,
			AttendancePercentage: true,
			DidAttend: true,
			DidNotAttend: true,
			Notes: true,
		})
		.partial();
export type SessionAttendanceSummaryChanges = z.infer<
	typeof sessionAttendanceSummaryChangesSchema
>;
export const sessionAttendanceSummaryUpdateSchema = z.object({
	id: z.number(),
	changes: sessionAttendanceSummaryChangesSchema,
});
export type SessionAttendanceSummaryUpdate = z.infer<
	typeof sessionAttendanceSummaryUpdateSchema
>;
export const sessionAttendanceSummaryUpdatesSchema =
	sessionAttendanceSummaryUpdateSchema.array();

export const sessionAttendancesSummaryIdsSchema = z.number().array();
