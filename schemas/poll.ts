import { z } from "zod";
import { groupIdSchema } from "./groups.js";

export type PollingError = {
	status: "Error";
	error: {
		name: string;
		message: string;
	};
};

export type PollingOK = {
	status: "OK";
	[K: string]: any;
};

const datetimeSchema = z.iso.datetime({ offset: true });

export const eventIdSchema = z.number();

export const eventSchema = z.object({
	id: eventIdSchema,
	groupId: groupIdSchema,
	name: z.string(),
	timeZone: z.string(),
	datetime: datetimeSchema,
	isPublished: z.boolean(),
	autoNumber: z.boolean(),
});
export const eventsSchema = eventSchema.array();

export const eventCreateSchema = eventSchema
	.pick({
		groupId: true,
		name: true,
	})
	.extend(
		eventSchema.pick({ timeZone: true, datetime: true }).partial().shape
	);

export const eventAddSchema = eventCreateSchema.required();

export const eventChangeSchema = eventSchema
	.omit({
		id: true,
	})
	.partial();

export const eventUpdateSchema = z.object({
	id: eventIdSchema,
	changes: eventChangeSchema,
});

export const eventsQuerySchema = z
	.object({
		id: z.union([eventIdSchema, eventIdSchema.array()]),
		groupId: z.union([groupIdSchema, groupIdSchema.array()]),
		name: z.union([z.string(), z.string().array()]),
		isPublished: z.boolean(),
	})
	.partial();

export const eventDeleteSchema = eventIdSchema;

export type Event = z.infer<typeof eventSchema>;
export type EventsQuery = z.infer<typeof eventsQuerySchema>; // argument for events:get -> server
export type EventCreate = z.infer<typeof eventCreateSchema>; // argument for event:create -> server
export type EventAdd = z.infer<typeof eventAddSchema>;
export type EventUpdate = z.infer<typeof eventUpdateSchema>; // argument for event:update -> server
export type EventDelete = z.infer<typeof eventDeleteSchema>; // argument for event:delete -> server

export const eventsGetResponseSchema = z.object({
	events: eventsSchema,
});
export const eventCreateResponseSchema = z.object({ event: eventSchema });
export const eventUpdateResponseSchema = z.object({ event: eventSchema });
export type EventsGetResponse = z.infer<typeof eventsGetResponseSchema>; // response to events:get
export type EventCreateResponse = z.infer<typeof eventCreateResponseSchema>; // response to event:create
export type EventUpdateResponse = z.infer<typeof eventUpdateResponseSchema>; // response to event:update

export const pollIdSchema = z.number();
export const pollTypeSchema = z.enum(["m", "sp"]);
export type PollType = z.infer<typeof pollTypeSchema>;

export enum PollVotersType {
	ANYONE = 0,
	VOTER,
	VOTER_POTENTIAL_VOTER,
}
export const pollVotersTypeSchema = z.enum(PollVotersType);

export enum PollRecordType {
	ANONYMOUS = 0,
	ADMIN_VIEW,
	RECORDED,
}
export const pollRecordTypeSchema = z.enum(PollRecordType);

export const pollActionSchema = z.enum(["show", "unshow", "open", "close"]);
export const pollStateSchema = z.enum(["shown", "opened", "closed"]).nullable();

export const pollOptionsSchema = z.string().array();

export enum PollChoice {
	SINGLE = 1,
	MULTIPLE = 0,
}
export const pollChoiceSchema = z.enum(PollChoice);

export const pollSchema = z.object({
	id: pollIdSchema,
	eventId: eventIdSchema,
	index: z.number(),
	state: pollStateSchema,
	type: pollTypeSchema,
	votersType: pollVotersTypeSchema,
	recordType: pollRecordTypeSchema,
	title: z.string(),
	body: z.string(),
	options: pollOptionsSchema,
	choice: pollChoiceSchema,
	movedSAPIN: z.number().nullable(),
	secondedSAPIN: z.number().nullable(),
});
export const pollsSchema = pollSchema.array();

export const pollCreateSchema = pollSchema
	.pick({
		eventId: true,
	})
	.extend(
		pollSchema
			.omit({
				id: true,
				eventId: true,
			})
			.partial().shape
	);

export const pollChangeSchema = pollSchema.omit({ id: true }).partial();

export const pollUpdateSchema = z.object({
	id: pollIdSchema,
	changes: pollChangeSchema,
});

export const pollsQuerySchema = z
	.object({
		id: z.union([pollIdSchema, pollIdSchema.array()]),
		eventId: z.union([eventIdSchema, eventIdSchema.array()]),
		state: z.union([pollStateSchema, pollStateSchema.array()]),
		groupId: z.union([groupIdSchema, groupIdSchema.array()]),
	})
	.partial();

export const pollDeleteSchema = pollIdSchema;

export const pollVoteSchema = z.object({
	id: pollIdSchema,
	votes: z.number().array(),
});

export type Poll = z.infer<typeof pollSchema>;
export type PollsQuery = z.infer<typeof pollsQuerySchema>; // argument for polls:get -> server
export type PollCreate = z.infer<typeof pollCreateSchema>; // argument for poll:create -> server
export type PollChange = z.infer<typeof pollChangeSchema>;
export type PollUpdate = z.infer<typeof pollUpdateSchema>; // argument for poll:update -> server
export type PollDelete = z.infer<typeof pollDeleteSchema>; // argument for poll:delete -> server
export type PollAction = z.infer<typeof pollActionSchema>;
export type PollState = z.infer<typeof pollStateSchema>;
export type PollVote = z.infer<typeof pollVoteSchema>;

export const pollsGetResponseSchema = z.object({ polls: pollSchema.array() });
export const pollCreateResponseSchema = z.object({ poll: pollSchema });
export const pollUpdateResponseSchema = z.object({ poll: pollSchema });
export type PollsGetResponse = z.infer<typeof pollsGetResponseSchema>; // response to polls:get
export type PollCreateResponse = z.infer<typeof pollCreateResponseSchema>; // response to poll:create
export type PollUpdateResponse = z.infer<typeof pollUpdateResponseSchema>; // response to poll:update

export const pollAddedParamSchema = pollSchema;
export const pollUpdatedParamSchema = pollSchema;
export const pollDeletedParamSchema = pollIdSchema;
export const pollActionedParamSchema = pollSchema;

export type PollAddedParam = z.infer<typeof pollAddedParamSchema>; // argument for poll:added -> client
export type PollUpdatedParam = z.infer<typeof pollUpdatedParamSchema>; // argument for poll:update -> client
export type PollDeletedParam = z.infer<typeof pollDeletedParamSchema>; // argument for poll:deleted -> client
export type PollActionedParam = z.infer<typeof pollActionedParamSchema>; // argument for poll:actioned -> client

export const eventActionParamSchema = z.object({
	eventId: eventIdSchema,
});
export type EventActionParam = z.infer<typeof eventActionParamSchema>; // argument for event:publish and event:unpublish -> server

export const eventPublishedParamSchema = z.object({
	event: eventSchema,
	polls: pollsSchema,
});
export const eventUnpublishedParamSchema = z.object({
	eventId: eventIdSchema,
});
export type EventPublishedParam = z.infer<typeof eventPublishedParamSchema>; // argument for event:published -> client
export type EventUnpublishedParam = z.infer<typeof eventUnpublishedParamSchema>; // argument for event:unpublished -> client

export const pollResultsGetSchema = z.object({
	id: pollIdSchema,
});

export const pollResultSchema = z.object({
	pollId: pollIdSchema,
	SAPIN: z.number(),
	votes: z.number().array(),
});
export const pollResultsSchema = pollResultSchema.array();

export type PollResult = z.infer<typeof pollResultSchema>;

export const groupJoinSchema = z.object({
	groupId: groupIdSchema,
});
export const groupJoinResponseSchema = z.object({
	groupId: groupIdSchema,
	eventId: eventIdSchema.optional(),
	events: eventsSchema,
	polls: pollsSchema,
	pollId: pollIdSchema.optional(),
});
export type GroupJoin = z.infer<typeof groupJoinSchema>;
export type GroupJoinResponse = z.infer<typeof groupJoinResponseSchema>;
