import { z } from "zod";

export const resnStatusTypeSchema = z.enum(["", "A", "V", "J"]);
export const editStatusTypeSchema = z.enum(["", "I", "N", "M"]);

export const resolutionIdSchema = z.string().uuid();

export const resolutionSchema = z.object({
	id: resolutionIdSchema,
	comment_id: z.number(),
	ResolutionID: z.number(),
	AssigneeSAPIN: z.number().nullable(),
	AssigneeName: z.string(),
	ResnStatus: resnStatusTypeSchema.nullable(),
	Resolution: z.string().nullable(),
	ApprovedByMotion: z.string().nullable(),
	ReadyForMotion: z.boolean(),
	Submission: z.string(),
	EditStatus: editStatusTypeSchema.nullable(),
	EditNotes: z.string().nullable(),
	EditInDraft: z.string().nullable(),
	LastModifiedBy: z.number().nullable(),
	LastModifiedTime: z.iso.datetime().nullable(),
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

export const resolutionChangeSchema = resolutionSchema
	.pick({
		ResolutionID: true,
		AssigneeSAPIN: true,
		AssigneeName: true,
		Submission: true,
		ResnStatus: true,
		Resolution: true,
		ReadyForMotion: true,
		ApprovedByMotion: true,
		EditStatus: true,
		EditNotes: true,
		EditInDraft: true,
	})
	.partial();

export const resolutionUpdateSchema = z.object({
	id: resolutionIdSchema,
	changes: resolutionChangeSchema,
});

export const resolutionUpdatesSchema = resolutionUpdateSchema.array();

export const resolutionIdsSchema = resolutionIdSchema.array();

export type ResnStatusType = z.infer<typeof resnStatusTypeSchema>;
export type EditStatusType = z.infer<typeof editStatusTypeSchema>;
export type Resolution = z.infer<typeof resolutionSchema>;
export type ResolutionCreate = z.infer<typeof resolutionCreateSchema>;
export type ResolutionChange = z.infer<typeof resolutionChangeSchema>;
export type ResolutionUpdate = z.infer<typeof resolutionUpdateSchema>;
