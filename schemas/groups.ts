import { z } from "zod";

export const groupIdSchema = z.string().uuid();

export const groupTypeSchema = z.enum([
	"r", // Root
	"c", // Standards committee
	"wg", // Working group
	"tg", // Task group
	"sg", // Study group
	"sc", // Standing committee
	"ah", // Ad-hoc group
	"tig", // Topic interest group
]);

export const groupSchema = z.object({
	id: groupIdSchema,
	parent_id: groupIdSchema.nullable(),
	name: z.string(),
	type: groupTypeSchema.nullable(),
	status: z.number(),
	color: z.string().nullable(),
	symbol: z.string().nullable(),
	project: z.string().nullable(),
	permissions: z.record(z.number()),
	officerSAPINs: z.number().array(),
});
export const groupsSchema = z.array(groupSchema);

export const groupsQuerySchema = z
	.object({
		parentName: z.string(),
		id: z.union([groupIdSchema, groupIdSchema.array()]),
		parent_id: z.union([groupIdSchema, groupIdSchema.array()]),
		name: z.union([z.string(), z.string().array()]),
		type: z.union([groupTypeSchema, groupTypeSchema.array()]),
		status: z.union([z.coerce.number(), z.coerce.number().array()]),
		color: z.union([z.string(), z.string().array()]),
		symbol: z.union([z.string(), z.string().array()]),
	})
	.partial();

export const groupCreateSchema = groupSchema
	.pick({
		parent_id: true,
		name: true,
		type: true,
	})
	.merge(
		groupSchema
			.pick({
				id: true,
				status: true,
				color: true,
				symbol: true,
				project: true,
			})
			.partial()
	);
export const groupCreatesSchema = z.array(groupCreateSchema);
export const groupUpdateSchema = z.object({
	id: groupIdSchema,
	changes: groupSchema.partial(),
});
export const groupUpdatesSchema = z.array(groupUpdateSchema);
export const groupIdsSchema = z.array(groupIdSchema);

export type GroupType = z.infer<typeof groupTypeSchema>;
export type Group = z.infer<typeof groupSchema>;
export type GroupsQuery = z.infer<typeof groupsQuerySchema>;
export type GroupCreate = z.infer<typeof groupCreateSchema>;
export type GroupUpdate = z.infer<typeof groupUpdateSchema>;
