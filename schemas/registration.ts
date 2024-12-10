import { z } from "zod";
import { sessionAttendanceSummariesSchema } from "./attendances";

const sessionRegistraionSchema = z.object({
	id: z.number(),
	SAPIN: z.number().nullable(),
	Name: z.string(),
	FirstName: z.string(),
	LastName: z.string(),
	Email: z.string(),
	RegType: z.string(),
});

export const sessionRegistraionsSchema = sessionRegistraionSchema.array();

export const uploadSessionRegistrationResponseSchema = z.object({
	attendances: sessionAttendanceSummariesSchema,
	registrations: sessionRegistraionsSchema,
});

export type SessionRegistration = z.infer<typeof sessionRegistraionSchema>;
export type UploadSessionRegistrationResponse = z.infer<
	typeof uploadSessionRegistrationResponseSchema
>;
