import { z } from "zod";
import { groupIdSchema } from "./groups.js";

export const membershipEventIdsSchema = z.number().array();

export const membershipEventSchema = z.object({
	id: z.number(),
	groupId: groupIdSchema,
	date: z.iso.date(),
	count: z.number(),
	note: z.string().nullable(),
});
export const membershipEventsSchema = membershipEventSchema.array();

const membershipEventCreateSchema = membershipEventSchema.omit({
	id: true,
	groupId: true,
});
export const membershipEventCreatesSchema = membershipEventCreateSchema.array();

const membershipEventChangeSchema = membershipEventCreateSchema.partial();

const membershipEventUpdateSchema = z.object({
	id: z.number(),
	changes: membershipEventChangeSchema,
});
export const membershipEventUpdatesSchema = membershipEventUpdateSchema.array();

export type MembershipEvent = z.infer<typeof membershipEventSchema>;
export type MembershipEventCreate = z.infer<typeof membershipEventCreateSchema>;
export type MembershipEventUpdate = z.infer<typeof membershipEventUpdateSchema>;
