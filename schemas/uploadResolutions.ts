import { z } from "zod";
import { commentResolutionsSchema } from "./comments.js";
import { commentsSummarySchema } from "./ballots.js";

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
