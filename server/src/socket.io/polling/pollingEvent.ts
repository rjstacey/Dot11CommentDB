import { Socket } from "socket.io";
import {
	eventCreateSchema,
	eventUpdateSchema,
	eventDeleteSchema,
	eventActionReqSchema,
	eventsQuerySchema,
	EventGetRes,
	EventCreateRes,
	EventUpdateRes,
	EventAdd,
	EventPublishedInd,
	EventUnpublishedInd,
	EventUpdatedInd,
	EventDeletedInd,
	EventAddedInd,
} from "@schemas/poll.js";
import { AccessLevel } from "@schemas/access.js";
import { Member } from "@schemas/members.js";
import { NotFoundError } from "../../utils/index.js";
import {
	addPollEvent,
	getPollEvents,
	deletePollEvent,
	updatePollEvent,
	getPolls,
} from "../../services/poll.js";

import {
	validCallback,
	okCallback,
	errorCallback,
	forbiddenEvent,
} from "./pollingBasic.js";
import { GroupContext } from "./pollingGroup.js";

/** event:get(query) - return a list of events for this group with the query constraints provided */
export async function onEventGet(
	gc: GroupContext,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const groupId = gc.id;
		const query = eventsQuerySchema.parse(payload);
		const events = await getPollEvents({ ...query, groupId });
		okCallback(callback, events satisfies EventGetRes);
	} catch (error) {
		errorCallback(callback, error);
	}
}

/**
 * event:publish({eventId}) - distribute polls to the group and provide updates
 *
 * event:unpublish({eventId}) - stop distributing poll updates to the group
 */
export async function onEventAction(
	gc: GroupContext,
	action: "publish" | "unpublish",
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const groupId = gc.id;
		const { eventId } = eventActionReqSchema.parse(payload);
		const [event] = await getPollEvents({ id: eventId });
		if (!event) throw new NotFoundError("No such event id=" + eventId);
		const [activeEvent] = await getPollEvents({
			groupId,
			isPublished: true,
		});
		if (activeEvent && activeEvent.id !== eventId && action === "publish") {
			throw new TypeError("Another event is already published");
		}
		const isPublished = action === "publish";
		const updatedEvent = await updatePollEvent({
			id: eventId,
			changes: { isPublished },
		});
		okCallback(callback);
		if (isPublished) {
			const publishedEventId = gc.publishedEventId;
			if (publishedEventId !== eventId) gc.setPublishedEventId(eventId);
			const polls = await getPolls({ eventId });
			const params: EventPublishedInd = { event: updatedEvent, polls };
			gc.userEmit("event:published", params);
		} else {
			const publishedEventId = gc.publishedEventId;
			if (publishedEventId === eventId) {
				gc.setPublishedEventId(null);
				const params: EventUnpublishedInd = { eventId };
				gc.userEmit("event:unpublished", params);
			}
		}
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** event:create(event) - Create event */
export async function onEventCreate(
	gc: GroupContext,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const groupId = gc.id;
		const addIn = eventCreateSchema.parse(payload);
		const add: EventAdd = {
			groupId,
			name: addIn.name,
			timeZone: addIn.timeZone || "America/New_York",
			datetime: addIn.datetime || new Date().toISOString(),
		};
		const event = await addPollEvent(add);
		gc.adminEmit("event:added", event satisfies EventAddedInd);
		okCallback(callback, event satisfies EventCreateRes);
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** event:update({id, changes}) - Update event */
export async function onEventUpdate(
	gc: GroupContext,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const update = eventUpdateSchema.parse(payload);
		const event = await updatePollEvent(update);
		if (event.id === gc.publishedEventId) {
			// Send updates to everyone
			if (!event.isPublished) {
				gc.userEmit("event:unpublished", {
					eventId: event.id,
				} satisfies EventUnpublishedInd);
			}
		}
		// Send updates to admins only
		gc.adminEmit("event:updated", event satisfies EventUpdatedInd);
		okCallback(callback, event satisfies EventUpdateRes);
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** event:delete(eventId) - Delete event */
export async function onEventDelete(
	gc: GroupContext,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const eventId = eventDeleteSchema.parse(payload);
		await deletePollEvent(eventId);
		if (eventId === gc.publishedEventId) {
			// Send updates to everyone
			gc.userEmit("event:unpublished", {
				eventId,
			} satisfies EventUnpublishedInd);
		}

		// Send updates to admins only
		gc.adminEmit("event:deleted", eventId satisfies EventDeletedInd);
		okCallback(callback);
	} catch (error) {
		errorCallback(callback, error);
	}
}

export function pollingEventRegister(
	socket: Socket,
	gc: GroupContext,
	member: Member
) {
	const access = gc.getMemberAccess(member.SAPIN);
	if (access < AccessLevel.rw) {
		socket
			.on("event:get", forbiddenEvent)
			.on("event:create", forbiddenEvent)
			.on("event:delete", forbiddenEvent)
			.on("event:update", forbiddenEvent)
			.on("event:publish", forbiddenEvent)
			.on("event:unpublish", forbiddenEvent);
		return;
	}

	socket
		.on("event:get", (params, cb) => onEventGet(gc, params, cb))
		.on("event:create", (params, cb) => onEventCreate(gc, params, cb))
		.on("event:delete", (params, cb) => onEventDelete(gc, params, cb))
		.on("event:update", (params, cb) => onEventUpdate(gc, params, cb))
		.on("event:publish", (params, cb) =>
			onEventAction(gc, "publish", params, cb)
		)
		.on("event:unpublish", (params, cb) =>
			onEventAction(gc, "unpublish", params, cb)
		);
}

export function pollingEventUnregister(socket: Socket) {
	socket.removeAllListeners("event:get");
	socket.removeAllListeners("event:create");
	socket.removeAllListeners("event:delete");
	socket.removeAllListeners("event:update");
	socket.removeAllListeners("event:publish");
	socket.removeAllListeners("event:unpublish");
}
