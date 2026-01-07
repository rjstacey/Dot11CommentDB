import { z } from "zod";
import { groupIdSchema } from "./groups.js";

/** Client/Server terminology
 * Client <-------------> Server
 * Initiated by client
 *    ----   Request    ---->
 *    <---   Response   ----
 *
 * Initiated by server
 *    <---  Indication  -----
 *    ---- Confirmation ---->
 */

export const pollingSocketName = "/polling";

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
export type EventsQuery = z.infer<typeof eventsQuerySchema>; // param for event:get request
export type EventCreate = z.infer<typeof eventCreateSchema>; // param for event:create request
export type EventAdd = z.infer<typeof eventAddSchema>; // param for event:add request
export type EventUpdate = z.infer<typeof eventUpdateSchema>; // param for event:update request
export type EventDelete = z.infer<typeof eventDeleteSchema>; // param for event:delete request
export const eventGetResSchema = z.object({
	events: eventsSchema,
});
export const eventCreateResSchema = z.object({ event: eventSchema });
export const eventUpdateResSchema = z.object({ event: eventSchema });
export type EventGetRes = z.infer<typeof eventGetResSchema>; // param for event:get response
export type EventCreateRes = z.infer<typeof eventCreateResSchema>; // param for event:create response
export type EventUpdateRes = z.infer<typeof eventUpdateResSchema>; // param for event:update response

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
export type PollAction = z.infer<typeof pollActionSchema>;

export const pollStateSchema = z.enum(["shown", "opened", "closed"]).nullable();
export type PollState = z.infer<typeof pollStateSchema>;

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

export type Poll = z.infer<typeof pollSchema>;
export type PollsQuery = z.infer<typeof pollsQuerySchema>; // param for poll:get request
export type PollCreate = z.infer<typeof pollCreateSchema>; // param for poll:create request
export type PollChange = z.infer<typeof pollChangeSchema>;
export type PollUpdate = z.infer<typeof pollUpdateSchema>; // param for poll:update request

export const pollGetResSchema = z.object({ polls: pollSchema.array() });
export type PollGetRes = z.infer<typeof pollGetResSchema>; // param for poll:get response

export const pollCreateResSchema = z.object({ poll: pollSchema });
export type PollCreateRes = z.infer<typeof pollCreateResSchema>; // param for poll:create response

export const pollUpdateResSchema = z.object({ poll: pollSchema });
export type PollUpdateRes = z.infer<typeof pollUpdateResSchema>; // param for poll:update response

export const pollAddedIndSchema = pollSchema;
export type PollAddedInd = z.infer<typeof pollAddedIndSchema>; // param for poll:added indication

export const pollUpdatedIndSchema = pollSchema;
export type PollUpdatedInd = z.infer<typeof pollUpdatedIndSchema>; // param for poll:updated indication

export const pollDeletedIndSchema = pollIdSchema;
export type PollDeletedInd = z.infer<typeof pollDeletedIndSchema>; // param for poll:deleted indication

export const pollActionedIndSchema = pollSchema;
export type PollActionedInd = z.infer<typeof pollActionedIndSchema>; // param for poll:actioned indication

export const pollVoteSchema = z.object({
	id: pollIdSchema,
	votes: z.number().array(),
});
export type PollVote = z.infer<typeof pollVoteSchema>;

export const pollResultReqSchema = z.object({
	id: pollIdSchema,
});
export type PollResultReq = z.infer<typeof pollResultReqSchema>; // param for result:get request

export const pollResultSchema = z.object({
	pollId: pollIdSchema,
	SAPIN: z.number(),
	votes: z.number().array(),
});
export type PollResult = z.infer<typeof pollResultSchema>;

export const pollResultResSchema = z.object({
	results: pollResultSchema.array(),
	resultsSummary: z.number().array(),
});
export type PollResultRes = z.infer<typeof pollResultResSchema>; // param for result:get response

export const pollVotedIndSchema = z.object({
	pollId: pollIdSchema.nullable(),
	numMembers: z.number(),
	numVoters: z.number(),
	numVotes: z.number(),
});
export type PollVotedInd = z.infer<typeof pollVotedIndSchema>; // param for poll:voted indication

export const eventActionReqSchema = z.object({
	eventId: eventIdSchema,
});
export type EventActionReq = z.infer<typeof eventActionReqSchema>; // param for event:publish and event:unpublish requests

export const eventPublishedIndSchema = z.object({
	event: eventSchema,
	polls: pollsSchema,
});
export const eventUnpublishedIndSchema = z.object({
	eventId: eventIdSchema,
});
export type EventPublishedInd = z.infer<typeof eventPublishedIndSchema>; // param for event:published indication
export type EventUnpublishedInd = z.infer<typeof eventUnpublishedIndSchema>; // param for event:unpublished indication

export const groupJoinReqSchema = z.object({
	groupId: groupIdSchema,
});
export type GroupJoinReq = z.infer<typeof groupJoinReqSchema>; // param for group:join request

export const groupJoinResSchema = z.object({
	groupId: groupIdSchema,
	events: eventsSchema,
	polls: pollsSchema,
});
export type GroupJoinRes = z.infer<typeof groupJoinResSchema>; // param for group:join response
