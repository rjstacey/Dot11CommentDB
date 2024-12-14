import { z } from "zod";
import { groupIdSchema } from "./groups";
import { resolutionSchema } from "./resolutions";
import { ballotSchema } from "./ballots";

const categoryTypeSchema = z.enum(["T", "E", "G"]);
export type CategoryType = z.infer<typeof categoryTypeSchema>;

export const commentSchema = z.object({
	id: z.number(),
	ballot_id: z.number(),
	CommentID: z.number(),
	CommenterName: z.string(),
	CommenterSAPIN: z.number().nullable(),
	CommenterEmail: z.string().nullable(),
	Vote: z.string().nullable(),
	Category: categoryTypeSchema,
	C_Clause: z.string().nullable(),
	C_Page: z.string().nullable(),
	C_Line: z.string().nullable(),
	C_Index: z.number().nullable(),
	MustSatisfy: z.boolean(),
	Clause: z.string().nullable(),
	Page: z.number().nullable(),
	Comment: z.string(),
	AdHocGroupId: groupIdSchema.nullable(),
	AdHoc: z.string(),
	Notes: z.string().nullable(),
	CommentGroup: z.string(),
	ProposedChange: z.string(),
	LastModifiedBy: z.number().nullable(),
	LastModifiedTime: z.string().datetime().nullable(),
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
export type CommentCreate = z.infer<typeof commentCreateSchema>;
export type CommentChange = z.infer<typeof commentChangeSchema>;
export type CommentUpdate = z.infer<typeof commentUpdateSchema>;

export const commentResolutionSchema = commentSchema
	.omit({ id: true })
	.merge(resolutionSchema.omit({ id: true }))
	.extend({
		id: z.string(),
		resolution_id: resolutionSchema.shape.id.nullable(),
		ResolutionID: z.number().nullable(),
		ResolutionCount: z.number(),
		CID: z.string(),
		LastModifiedName: z.string().nullable(),
	});
export const commentResolutionsSchema = commentResolutionSchema.array();

export const commentResolutionQuerySchema = z
	.object({
		modifiedSince: z.string().datetime(),
	})
	.partial();

export type CommentResolution = z.infer<typeof commentResolutionSchema>;
export type CommentResolutionQuery = z.infer<
	typeof commentResolutionQuerySchema
>;

const commentsExportFormatSchema = z.enum(["modern", "legacy", "myproject"]);
const commentsExportStyleSchema = z.enum([
	"AllComments",
	"TabPerAdHoc",
	"TabPerCommentGroup",
]);
export const commentsExportParamsSchema = z.object({
	format: commentsExportFormatSchema.optional(),
	style: commentsExportStyleSchema.optional(),
	appendSheets: z.enum(["true", "false"]).optional(),
});
export type CommentsExportParams = z.infer<typeof commentsExportParamsSchema>;
export type CommentsExportFormat = z.infer<typeof commentsExportFormatSchema>;
export type CommentsExportStyle = z.infer<typeof commentsExportStyleSchema>;

export const uploadCommentsResponseSchema = z.object({
	comments: commentResolutionsSchema,
	ballot: ballotSchema,
});
export type UploadCommentsResponse = z.infer<
	typeof uploadCommentsResponseSchema
>;
