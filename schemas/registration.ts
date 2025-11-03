import { z } from "zod";
import { sessionAttendanceSummariesSchema } from "./attendances.js";

const sessionRegistraionSchema = z.object({
	id: z.number(),
	SAPIN: z.number().nullable(),
	Name: z.string(),
	FirstName: z.string(),
	LastName: z.string(),
	Email: z.string(),
	RegType: z.string(),
	Matched: z.enum(["SAPIN", "EMAIL"]).nullable(),
	CurrentName: z.string().nullable(),
	CurrentEmail: z.string().nullable(),
	CurrentSAPIN: z.number().nullable(),
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
