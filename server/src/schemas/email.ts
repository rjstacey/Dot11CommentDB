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
export const emailsSchema = emailSchema.array();
