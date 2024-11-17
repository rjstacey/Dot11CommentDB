import { string, z } from "zod";
import { groupIdSchema } from "./groups";

const datetimeSchema = z.string().datetime({ offset: true });

export const eventIdSchema = z.number();

export const eventSchema = z.object({
	id: eventIdSchema,
	groupId: groupIdSchema,
	name: z.string(),
	timeZone: z.string(),
	datetime: datetimeSchema,
});
export type Event = z.infer<typeof eventSchema>;

export const eventCreateInSchema = eventSchema
	.pick({
		groupId: true,
		name: true,
	})
	.merge(eventSchema.pick({ timeZone: true, datetime: true }).partial());

export const eventCreateSchema = eventCreateInSchema.required();
export type EventCreate = z.infer<typeof eventCreateSchema>;

export const eventChangeSchema = eventSchema
	.omit({
		id: true,
	})
	.partial();

export const eventUpdateSchema = z.object({
	id: eventIdSchema,
	changes: eventChangeSchema,
});
export type EventUpdate = z.infer<typeof eventUpdateSchema>;

export const eventsQuerySchema = z
	.object({
		id: z.union([eventIdSchema, eventIdSchema.array()]),
		groupId: z.union([groupIdSchema, groupIdSchema.array()]),
		name: z.union([z.string(), z.string().array()]),
	})
	.partial();
export type EventsQuery = z.infer<typeof eventsQuerySchema>;

export const pollIdSchema = z.number();

export const pollSchema = z.object({
	id: pollIdSchema,
	eventId: eventIdSchema,
	title: z.string(),
	body: z.string(),
});
export type Poll = z.infer<typeof pollSchema>;

export const pollCreateSchema = pollSchema
	.pick({
		eventId: true,
	})
	.merge(
		pollSchema
			.omit({
				id: true,
				eventId: true,
			})
			.partial()
	);
export type PollCreate = z.infer<typeof pollCreateSchema>;

export const pollChangeSchema = pollSchema.omit({ id: true }).partial();

export const pollUpdateSchema = z.object({
	id: pollIdSchema,
	changes: pollChangeSchema,
});
export type PollUpdate = z.infer<typeof pollUpdateSchema>;

export const pollsQuerySchema = z
	.object({
		id: z.union([pollIdSchema, pollIdSchema.array()]),
		eventId: z.union([eventIdSchema, eventIdSchema.array()]),
	})
	.partial();
export type PollsQuery = z.infer<typeof pollsQuerySchema>;

export const pollOpenSchema = z.object({
	id: pollIdSchema,
});
export type PollOpened = z.infer<typeof pollOpenSchema>;

export const groupJoinSchema = z.object({
	groupId: groupIdSchema,
});
export const eventOpenSchema = z.object({
	eventId: eventIdSchema,
});
export type EventOpen = z.infer<typeof eventOpenSchema>;
export const eventOpenedSchema = z.object({
	eventId: eventIdSchema,
	polls: pollSchema.array(),
});
export type EventOpened = z.infer<typeof eventOpenedSchema>;
