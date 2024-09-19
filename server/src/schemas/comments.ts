import { z } from "zod";
import { groupIdSchema } from "./groups";
import { resolutionSchema } from "./resolutions";

export const commentSchema = z.object({
	id: z.number(),
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

export const commentCreateSchema = commentSchema.omit({ id: true }).partial();

export const commentChangeSchema = commentSchema
	.pick({
		CommentID: true,
		Category: true,
		Clause: true,
		Page: true,
		AdHoc: true,
		AdHocGroupId: true,
		CommentGroup: true,
		Notes: true,
	})
	.partial();

export const commentUpdateSchema = z.object({
	id: commentSchema.shape.id,
	changes: commentChangeSchema,
});
export const commentUpdatesSchema = commentUpdateSchema.array();

export type Comment = z.infer<typeof commentSchema>;
export type CommentsSummary = z.infer<typeof commentsSummarySchema>;
export type CommentCreate = z.infer<typeof commentCreateSchema>;
export type CommentChange = z.infer<typeof commentChangeSchema>;
export type CommentUpdate = z.infer<typeof commentUpdateSchema>;

export const commentResolutionSchema = commentSchema
	.omit({ id: true })
	.merge(resolutionSchema.omit({ id: true }))
	.extend({
		id: z.string(),
		resolution_id: resolutionSchema.shape.id,
		ResolutionID: z.number(),
		ResolutionCount: z.number(),
		CID: z.string(),
		LastModifiedName: z.string(),
	});

export const commentResolutionQuerySchema = z
	.object({
		modifiedSince: z.string().datetime(),
	})
	.partial();

export type CommentResolution = z.infer<typeof commentResolutionSchema>;
export type CommentResolutionQuery = z.infer<
	typeof commentResolutionQuerySchema
>;
