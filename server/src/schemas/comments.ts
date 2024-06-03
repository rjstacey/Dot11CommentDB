import { z } from "zod";
import { groupIdSchema } from "./groups";

export const commentSchema = z.object({
	id: z.bigint(),
	ballot_id: z.number(),
	CommentID: z.number(),
	CommenterSAPIN: z.nullable(z.number()),
	CommenterName: z.string(),
	CommenterEmail: z.string(),
	Vote: z.string(),
	Category: z.string(),
	C_Clause: z.string(),
	C_Page: z.string(),
	C_Line: z.string(),
	C_Index: z.number(),
	MustSatisfy: z.boolean(),
	Clause: z.nullable(z.string()),
	Page: z.nullable(z.number()),
	Comment: z.string(),
	AdHocGroupId: z.nullable(groupIdSchema),
	AdHoc: z.string(),
	Notes: z.nullable(z.string()),
	CommentGroup: z.string(),
	ProposedChange: z.string(),
	LastModifiedBy: z.nullable(z.number()),
	LastModifiedTime: z.nullable(z.string().datetime()),
});

export const commentsSummarySchema = z.object({
	Count: z.number(),
	CommentIDMin: z.nullable(z.number()),
	CommentIDMax: z.nullable(z.number()),
});

export const commentsUploadParamsSchema = z.object({
	startCommentId: z.number().optional(),
});
export type CommentsUploadParams = z.infer<typeof commentsUploadParamsSchema>;

export const commentsUploadUserParamsSchema = z.object({
	SAPIN: z.number(),
});
export type CommentsUploadUserParams = z.infer<
	typeof commentsUploadUserParamsSchema
>;

export type Comment = z.infer<typeof commentSchema>;
export type CommentsSummary = z.infer<typeof commentsSummarySchema>;
