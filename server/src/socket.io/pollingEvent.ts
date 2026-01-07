import { Socket } from "socket.io";
import {
	eventCreateSchema,
	eventUpdateSchema,
	eventDeleteSchema,
	eventActionReqSchema,
	eventsQuerySchema,
	Event,
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
import { NotFoundError } from "../utils/index.js";
import {
	addPollEvent,
	getPollEvents,
	deletePollEvent,
	updatePollEvent,
	getPolls,
} from "../services/poll.js";

import { validCallback, okCallback, errorCallback } from "./pollingBasic.js";
import { socketGetGroupInfo } from "./pollingGroup.js";

function socketSetPublishedEventId(socket: Socket, eventId: number | null) {
	socket.data.publishedEventId = eventId;
}

export function socketGetPublishedEventId(socket: Socket) {
	const publishedEventId: number | null =
		socket.data.publishedEventId || null;
	return publishedEventId;
}

async function eventWasUpdated(socket: Socket, event: Event) {
	const groupId = socketGetGroupInfo(socket).groupId;
	const eventId = socketGetPublishedEventId(socket);
	if (event.id === eventId) {
		// Send updates to everyone
		if (!event.isPublished) {
			socket.nsp.to(groupId).emit("event:unpublished", {
				eventId: event.id,
			} satisfies EventUnpublishedInd);
		}
	}

	// Send updates to admins only
	const sockets = await socket.nsp.in(groupId).fetchSockets();
	for (const s of sockets) {
		if (s.data.access >= AccessLevel.rw)
			s.emit("event:updated", event satisfies EventUpdatedInd);
	}
}

async function eventWasDeleted(socket: Socket, eventId: number) {
	const groupId = socketGetGroupInfo(socket).groupId;
	const publishedEventId = socketGetPublishedEventId(socket);
	if (eventId === publishedEventId) {
		// Send updates to everyone
		socket.nsp.to(groupId).emit("event:unpublished", {
			eventId,
		} satisfies EventUnpublishedInd);
	}

	// Send updates to admins only
	const sockets = await socket.nsp.in(groupId).fetchSockets();
	for (const s of sockets) {
		if (s.data.access >= AccessLevel.rw)
			s.emit("event:deleted", eventId satisfies EventDeletedInd);
	}
}

async function eventWasAdded(socket: Socket, event: Event) {
	const groupId = socketGetGroupInfo(socket).groupId;

	// Send updates to admins only
	const sockets = await socket.nsp.in(groupId).fetchSockets();
	for (const s of sockets) {
		if (s.data.access >= AccessLevel.rw)
			s.emit("event:added", event satisfies EventAddedInd);
	}
}

/** event:get(query) - return a list of events for this group with the query constraints provided */
export async function onEventGet(
	this: Socket,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const groupId = socketGetGroupInfo(this).groupId;
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
	this: Socket,
	action: "publish" | "unpublish",
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const groupId = socketGetGroupInfo(this).groupId;
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
			const publishedEventId = socketGetPublishedEventId(this);
			if (publishedEventId !== eventId)
				socketSetPublishedEventId(this, eventId);
			const polls = await getPolls({ eventId });
			const params: EventPublishedInd = { event: updatedEvent, polls };
			this.nsp.to(groupId).emit("event:published", params);
		} else {
			const publishedEventId = socketGetPublishedEventId(this);
			if (publishedEventId === eventId) {
				socketSetPublishedEventId(this, null);
				const params: EventUnpublishedInd = { eventId };
				this.nsp.to(groupId).emit("event:unpublished", params);
			}
		}
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** event:create(event) - Create event */
export async function onEventCreate(
	this: Socket,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const groupId = socketGetGroupInfo(this).groupId;
		const addIn = eventCreateSchema.parse(payload);
		const add: EventAdd = {
			groupId,
			name: addIn.name,
			timeZone: addIn.timeZone || "America/New_York",
			datetime: addIn.datetime || new Date().toISOString(),
		};
		const event = await addPollEvent(add);
		await eventWasAdded(this, event);
		okCallback(callback, event satisfies EventCreateRes);
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** event:update({id, changes}) - Update event */
export async function onEventUpdate(
	this: Socket,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const update = eventUpdateSchema.parse(payload);
		const event = await updatePollEvent(update);
		await eventWasUpdated(this, event);
		okCallback(callback, event satisfies EventUpdateRes);
	} catch (error) {
		errorCallback(callback, error);
	}
}

/** event:delete(eventId) - Delete event */
export async function onEventDelete(
	this: Socket,
	payload: unknown,
	callback: unknown
) {
	if (!validCallback(callback)) return;
	try {
		const eventId = eventDeleteSchema.parse(payload);
		await deletePollEvent(eventId);
		eventWasDeleted(this, eventId);
		okCallback(callback);
	} catch (error) {
		errorCallback(callback, error);
	}
}
