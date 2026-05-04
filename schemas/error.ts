import { z } from "zod";

export const errorSchema = z.object({
	name: z.string(),
	message: z.string(),
});
export const errorsSchema = errorSchema.array();

export type ErrorObject = z.infer<typeof errorSchema>;
