import { z } from "zod";

export const resnStatusTypeSchema = z.enum(["A", "V", "J"]);
export const editStatusTypeSchema = z.enum(["I", "N"]);

export const resolutionIdSchema = z.string().uuid();

export const resolutionSchema = z.object({
	id: resolutionIdSchema,
	comment_id: z.bigint(),
	ResolutionID: z.number(),
	AssigneeSAPIN: z.number().nullable(),
	AssigneeName: z.string(),
	ResnStatus: resnStatusTypeSchema.nullable(),
	Resolution: z.string().nullable(),
	ApprovedByMotion: z.string(),
	ReadyForMotion: z.boolean(),
	Submission: z.string(),
	EditStatus: editStatusTypeSchema.nullable(),
	EditNotes: z.string().nullable(),
	EditInDraft: z.string(),
	LastModifiedBy: z.number().nullable(),
	LastModifiedTime: z.string().datetime().nullable(),
});

export const resolutionCreateSchema = resolutionSchema
	.pick({
		comment_id: true,
	})
	.merge(
		resolutionSchema
			.pick({
				id: true,
				ResolutionID: true,
				AssigneeSAPIN: true,
				AssigneeName: true,
				ResnStatus: true,
				Resolution: true,
				ApprovedByMotion: true,
				ReadyForMotion: true,
				Submission: true,
				EditStatus: true,
				EditNotes: true,
				EditInDraft: true,
			})
			.partial()
	);

export const resolutionCreatesSchema = resolutionCreateSchema.array();

export const resolutionChangesSchema = resolutionSchema
	.omit({
		LastModifiedBy: true,
		LastModifiedTime: true,
	})
	.partial();

export const resolutionUpdateSchema = z.object({
	id: resolutionIdSchema,
	changes: resolutionChangesSchema,
});

export const resolutionUpdatesSchema = resolutionUpdateSchema.array();

export const resolutionIdsSchema = resolutionIdSchema.array();

export const resolutionQuerySchema = z.object({
	modifiedSince: z.string().datetime(),
});

export type ResnStatusType = z.infer<typeof resnStatusTypeSchema>;
export type EditStatusType = z.infer<typeof editStatusTypeSchema>;
export type Resolution = z.infer<typeof resolutionSchema>;
export type ResolutionQuery = z.infer<typeof resolutionQuerySchema>;
export type ResolutionCreate = z.infer<typeof resolutionCreateSchema>;
export type ResolutionChanges = z.infer<typeof resolutionChangesSchema>;
export type ResolutionUpdate = z.infer<typeof resolutionUpdateSchema>;
