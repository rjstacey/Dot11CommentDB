import { z } from "zod";

export const emailTemplateSchema = z.object({
	id: z.number(),
	name: z.string(),
	to: z.string().nullable(),
	cc: z.string().nullable(),
	bcc: z.string().nullable(),
	subject: z.string(),
	body: z.string(),
});
export type EmailTemplate = z.infer<typeof emailTemplateSchema>;
export const emailTemplatesSchema = emailTemplateSchema.array();

export const emailTemplateQuerySchema = z.object({
	id: z.union([z.number(), z.number().array()]),
});
export type EmailTemplateQuery = z.infer<typeof emailTemplateQuerySchema>;

export const emailTemplateCreateSchema = emailTemplateSchema.omit({
	id: true,
});
export type EmailTemplateCreate = z.infer<typeof emailTemplateCreateSchema>;
export const emailTemplateCreatesSchema = emailTemplateCreateSchema.array();

const emailTemplateChanges = emailTemplateSchema.partial();
export const emailTemplateUpdateSchema = z.object({
	id: z.number(),
	changes: emailTemplateChanges,
});
export type EmailTemplateUpdate = z.infer<typeof emailTemplateUpdateSchema>;
export const emailTemplateUpdatesSchema = emailTemplateUpdateSchema.array();

export const emailTemplateIdsSchema = z.number().array();
