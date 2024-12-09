import { z } from "zod";
import { groupIdSchema } from "./groups";

const officerIdSchema = z.string().uuid();

export const officerSchema = z.object({
	id: officerIdSchema,
	group_id: groupIdSchema,
	sapin: z.number(),
	position: z.string(),
});

export const officerQuerySchema = z
	.object({
		parentGroupId: z.string().uuid().optional(),
		id: z.union([officerIdSchema, z.array(officerIdSchema)]),
		group_id: z.union([groupIdSchema, z.array(groupIdSchema)]),
		sapin: z.union([z.number(), z.array(z.number())]),
		position: z.union([z.string(), z.array(z.string())]),
	})
	.partial();

export const officerCreateSchema = officerSchema
	.omit({ id: true })
	.merge(officerSchema.pick({ id: true }).partial());
export const officerCreatesSchema = z.array(officerCreateSchema);

export const officerUpdateSchema = z.object({
	id: officerIdSchema,
	changes: officerSchema.partial(),
});
export const officerUpdatesSchema = z.array(officerUpdateSchema);
export const officerIdsSchema = z.array(z.string().uuid());

export type Officer = z.infer<typeof officerSchema>;
export type OfficerQuery = z.infer<typeof officerQuerySchema>;
export type OfficerUpdate = z.infer<typeof officerUpdateSchema>;
export type OfficerCreate = z.infer<typeof officerCreateSchema>;
