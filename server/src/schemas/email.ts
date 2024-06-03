import { z } from "zod";

export const emailDestinationSchema = z.object({
	ToAddresses: z.string().array().optional(),
	CcAddresses: z.string().array().optional(),
	BccAddresses: z.string().array().optional(),
});
export type Destination = z.infer<typeof emailDestinationSchema>;

export const emailContentSchema = z.object({
	Data: z.string(),
	Charset: z.string().optional(),
});
export type Content = z.infer<typeof emailContentSchema>;

export const emailBodySchema = z.object({
	Text: emailContentSchema.optional(),
	Html: emailContentSchema.optional(),
});
export type Body = z.infer<typeof emailBodySchema>;

export const emailMessageSchema = z.object({
	Subject: emailContentSchema,
	Body: emailBodySchema,
});
export type Message = z.infer<typeof emailMessageSchema>;

export const emailSchema = z.object({
	Destination: emailDestinationSchema,
	Message: emailMessageSchema,
	ReplyToAddresses: z.string().array().optional(),
});
export type Email = z.infer<typeof emailSchema>;

export const emailTemplateSchema = z.object({
	id: z.number(),
	name: z.string(),
	subject: z.string(),
	body: z.string(),
});
export type EmailTemplate = z.infer<typeof emailTemplateSchema>;

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
