import { z } from "zod";
import { commentResolutionsSchema } from "./comments.js";
import { commentsSummarySchema } from "./ballots.js";

export const toUpdateOptions = [
	"cid",
	"clausepage",
	"adhoc",
	"assignee",
	"resolution",
	"editing",
] as const;
const toUpdateSchema = z.enum(toUpdateOptions);
export type FieldToUpdate = z.infer<typeof toUpdateSchema>;

export const matchAlgoOptions = ["cid", "comment", "elimination"] as const;
export const matchAlgoSchema = z.enum(matchAlgoOptions);
export type MatchAlgo = z.infer<typeof matchAlgoSchema>;

export const matchUpdateOptions = ["all", "any", "add"] as const;
export const matchUpdateSchema = z.enum(matchUpdateOptions);
export type MatchUpdate = z.infer<typeof matchUpdateSchema>;

export const resolutionsUploadParamsSchema = z.object({
	toUpdate: z.union([toUpdateSchema, toUpdateSchema.array()]),
	matchAlgorithm: matchAlgoSchema,
	matchUpdate: matchUpdateSchema,
	sheetName: z.string(),
});

export type ResolutionsUploadParams = z.infer<
	typeof resolutionsUploadParamsSchema
>;

export const uploadResolutionsResponseSchema = z.object({
	comments: commentResolutionsSchema,
	ballot: z.object({ id: z.number(), Comments: commentsSummarySchema }),
	matched: z.number().array(),
	unmatched: z.number().array(),
	added: z.string().array(),
	remaining: z.string().array(),
	updated: z.number(),
});
export type UploadResolutionsResponse = z.infer<
	typeof uploadResolutionsResponseSchema
>;
