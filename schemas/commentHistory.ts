import { z } from "zod";
import { commentSchema, commentResolutionChangeSchema } from "./comments.js";
import { resolutionSchema } from "./resolutions.js";

const commentHistoryEntrySchema = z.object({
	id: z.number(),
	Action: z.enum(["add", "update", "delete"]),
	Timestamp: z.string(),
	UserID: z.number().nullable(),
	UserName: z.string().nullable(),
	Changes: commentResolutionChangeSchema,
	comment_id: z.number(),
	comment: commentSchema,
	resolution_id: z.string().optional(),
	resolution: resolutionSchema.optional(),
});

export type CommentHistoryEntry = z.infer<typeof commentHistoryEntrySchema>;

export const commentHistoryGetResponseSchema = z.object({
	history: z.array(commentHistoryEntrySchema),
});
export type CommentHistoryGetResponse = z.infer<
	typeof commentHistoryGetResponseSchema
>;
