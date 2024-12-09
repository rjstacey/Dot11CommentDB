import { z } from "zod";
import { datetimeSchema } from "./common";

const statusChangeEntrySchema = z.object({
	id: z.number(),
	Date: z.nullable(datetimeSchema),
	OldStatus: z.string(),
	NewStatus: z.string(),
	Reason: z.string(),
});

const contactEmailSchema = z.object({
	id: z.number(),
	Email: z.string().email(),
	DateAdded: z.nullable(datetimeSchema),
	Primary: z.boolean(),
	Broken: z.boolean(),
});

const contactInfoSchema = z.object({
	StreetLine1: z.string(),
	StreetLine2: z.string(),
	City: z.string(),
	State: z.string(),
	Zip: z.string(),
	Country: z.string(),
	Phone: z.optional(z.string()),
	Fax: z.optional(z.string()),
});

const userSchema = z.object({
	SAPIN: z.number(), // SA PIN (unique identifier for IEEE SA account)
	Name: z.string(), // Member name (formed from FirstName + MI + LastName)
	FirstName: z.string(),
	MI: z.string(),
	LastName: z.string(),
	Email: z.string().email(), // Member account email (alternate unique identifier for IEEE SA account)
	Employer: z.string(), // Member declared employer
	ContactInfo: contactInfoSchema,
	ContactEmails: z.array(contactEmailSchema),
});

const groupMemberSchema = z.object({
	SAPIN: z.number(),
	groupId: z.string().uuid(),
	Affiliation: z.string(),
	Status: z.string(), // Group member status
	ObsoleteSAPINs: z.array(z.number()), // Array of SAPINs previously used by member
	ReplacedBySAPIN: z.number(), // SAPIN that replaces this one
	StatusChangeDate: z.nullable(datetimeSchema), // Date of last status change
	StatusChangeHistory: z.array(statusChangeEntrySchema), // History of status change
	StatusChangeOverride: z.boolean(), // Manually maintain status; don't update based on attendance/participation
	DateAdded: z.nullable(datetimeSchema), // Date member was added
	MemberID: z.number(), // Member identifier from Adrian's Access database
	Notes: z.string(),
	InRoster: z.boolean(), // Present in MyProject roster
});

export const memberSchema = userSchema.merge(groupMemberSchema);

export const memberQuerySchema = z
	.object({
		SAPIN: z.union([z.number(), z.array(z.number())]),
		Status: z.union([z.string(), z.array(z.string())]),
		groupId: z.union([z.string(), z.array(z.string())]),
		InRoster: z.boolean(),
	})
	.partial();

export const memberCreateSchema = userSchema
	.pick({
		SAPIN: true,
		Name: true,
		FirstName: true,
		MI: true,
		LastName: true,
		Email: true,
		Employer: true,
	})
	.merge(
		userSchema
			.pick({
				ContactInfo: true,
				ContactEmails: true,
			})
			.partial()
	)
	.merge(
		groupMemberSchema.pick({
			Affiliation: true,
			Status: true,
		})
	)
	.merge(
		groupMemberSchema
			.pick({
				StatusChangeDate: true,
				StatusChangeHistory: true,
				StatusChangeOverride: true,
				DateAdded: true,
				MemberID: true,
				Notes: true,
			})
			.partial()
	);

export const memberCreatesSchema = z.array(memberCreateSchema);
export const memberUpdateSchema = z.object({
	id: z.number(),
	changes: memberSchema.partial(),
});
export const memberUpdatesSchema = z.array(memberUpdateSchema);
export const memberIdsSchema = z.array(z.number());

export type UpdateRosterOptions = {
	appendNew?: boolean;
	removeUnchanged?: boolean;
};

export type StatusChangeEntry = z.infer<typeof statusChangeEntrySchema>;
export type ContactEmail = z.infer<typeof contactEmailSchema>;
export type ContactInfo = z.infer<typeof contactInfoSchema>;
export type UserType = z.infer<typeof userSchema>;
export type GroupMember = z.infer<typeof groupMemberSchema>;
export type Member = z.infer<typeof memberSchema>;
export type MemberQuery = z.infer<typeof memberQuerySchema>;
export type MemberCreate = z.infer<typeof memberCreateSchema>;
export type MemberUpdate = z.infer<typeof memberUpdateSchema>;
