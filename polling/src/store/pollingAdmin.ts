import {
	createSlice,
	createEntityAdapter,
	createSelector,
	PayloadAction,
} from "@reduxjs/toolkit";
import {
	Event,
	EventsQuery,
	EventCreate,
	EventUpdate,
	EventDelete,
	EventPublish,
	eventCreateResponseSchema,
	eventUpdateResponseSchema,
	eventsGetResponseSchema,
	Poll,
	PollsQuery,
	PollCreate,
	PollUpdate,
	PollDelete,
	PollAction,
	PollState,
	PollType,
	PollRecordType,
	PollChoice,
	pollsGetResponseSchema,
	pollCreateResponseSchema,
	pollUpdateResponseSchema,
} from "@schemas/poll";
import { AppThunk, RootState } from ".";
import { handleError, pollingSocketEmit } from "./pollingSocket";

export type { Event, EventCreate, Poll, PollType, PollCreate };
export { PollRecordType, PollChoice };

export const motionPollOptions: readonly string[] = ["Yes", "No", "Abstain"];

export function titlePrefix(type: PollType, index: number) {
	return (type === "m" ? "Motion " : "Strawpoll ") + (index + 1).toString();
}

const maxIndex = (polls: Poll[]) =>
	polls.reduce(
		(maxIndex, poll) => (maxIndex > poll.index ? maxIndex : poll.index),
		0
	);

export function defaultMotion(event: Event, polls: Poll[]) {
	const type = "m";
	const index = maxIndex(polls) + 1;
	return {
		eventId: event.id,
		index,
		title: titlePrefix(type, index),
		body: "",
		type,
		recordType: PollRecordType.ANONYMOUS,
		choice: PollChoice.SINGLE,
		options: [...motionPollOptions],
	} satisfies PollCreate;
}

export function defaultStrawpoll(event: Event, polls: Poll[]) {
	const type = "sp";
	const index = maxIndex(polls) + 1;
	return {
		eventId: event.id,
		index,
		title: titlePrefix(type, index),
		body: "",
		type,
		recordType: PollRecordType.ANONYMOUS,
		choice: PollChoice.SINGLE,
		options: [],
	} satisfies PollCreate;
}

const eventsAdapter = createEntityAdapter<Event>();
const sortComparer = (p1: Poll, p2: Poll) => p1.index - p2.index;
const pollsAdapter = createEntityAdapter<Poll>({ sortComparer });

/* Create slice */
const initialState = {
	isAdmin: false,
	eventId: null as number | null,
	activePollId: null as number | null,
	selectedPollId: null as number | null,
	events: eventsAdapter.getInitialState(),
	polls: pollsAdapter.getInitialState(),
};
const dataSet = "pollingAdmin";
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		setIsAdmin(state, action: PayloadAction<boolean>) {
			const isAdmin = action.payload;
			state.isAdmin = isAdmin;
			if (!isAdmin) {
				state.eventId = null;
				state.activePollId = null;
				eventsAdapter.removeAll(state.events);
				pollsAdapter.removeAll(state.polls);
			}
		},
		setEventId(state, action: PayloadAction<number | null>) {
			state.eventId = action.payload;
		},
		setActivePollId(state, action: PayloadAction<number | null>) {
			state.activePollId = action.payload;
		},
		setSelectedPollId(state, action: PayloadAction<number | null>) {
			state.selectedPollId = action.payload;
		},
		setEvents(state, action: PayloadAction<Event[]>) {
			eventsAdapter.setAll(state.events, action.payload);
		},
		setEvent(state, action: PayloadAction<Event>) {
			eventsAdapter.setOne(state.events, action.payload);
		},
		addEvent(state, action: PayloadAction<Event>) {
			eventsAdapter.addOne(state.events, action.payload);
		},
		updateEvent(state, action: PayloadAction<EventUpdate>) {
			eventsAdapter.updateOne(state.events, action.payload);
		},
		removeEvent(state, action: PayloadAction<number>) {
			eventsAdapter.removeOne(state.events, action.payload);
		},
		setPolls(state, action: PayloadAction<Poll[]>) {
			pollsAdapter.setAll(state.polls, action.payload);
		},
		setPoll(state, action: PayloadAction<Poll>) {
			pollsAdapter.setOne(state.polls, action.payload);
		},
		addPoll(state, action: PayloadAction<Poll>) {
			pollsAdapter.addOne(state.polls, action.payload);
		},
		updatePoll(state, action: PayloadAction<PollUpdate>) {
			pollsAdapter.updateOne(state.polls, action.payload);
		},
		removePoll(state, action: PayloadAction<number>) {
			pollsAdapter.removeOne(state.polls, action.payload);
		},
	},
});

export default slice;

/** Slice actions */
export const {
	setIsAdmin,
	setEventId,
	setEvents,
	setEvent,
	addEvent,
	updateEvent,
	removeEvent,
	setPolls,
	setPoll,
	addPoll,
	updatePoll,
	removePoll,
	setSelectedPollId,
	setActivePollId,
} = slice.actions;

/** Selectors */
export const selectPollingAdminState = (state: RootState) => state[dataSet];
export const selectPollingAdminEventId = (state: RootState) =>
	selectPollingAdminState(state).eventId;
export const selectPollingAdminSelectedPollId = (state: RootState) =>
	selectPollingAdminState(state).selectedPollId;
export const selectPollingAdminActivePollId = (state: RootState) =>
	selectPollingAdminState(state).activePollId;
export const selectPollingAdminEventIds = (state: RootState) =>
	selectPollingAdminState(state).events.ids;
export const selectPollingAdminEventEntities = (state: RootState) =>
	selectPollingAdminState(state).events.entities;

export const selectPollAdminEvent = (state: RootState) => {
	const { eventId, events } = selectPollingAdminState(state);
	return eventId ? events.entities[eventId] : undefined;
};

export const selectPollingAdminSelectedPoll = (state: RootState) => {
	const { selectedPollId: pollId, polls } = selectPollingAdminState(state);
	return pollId ? polls.entities[pollId] : undefined;
};

export const selectPollingAdminActivePoll = (state: RootState) => {
	const { activePollId: pollId, polls } = selectPollingAdminState(state);
	return pollId ? polls.entities[pollId] : undefined;
};

export const selectPollingAdminEvents = createSelector(
	(state: RootState) => selectPollingAdminState(state).events,
	(events) => eventsAdapter.getSelectors().selectAll(events)
);

export const selectPollingAdminPolls = createSelector(
	(state: RootState) => selectPollingAdminState(state).polls,
	(polls) => pollsAdapter.getSelectors().selectAll(polls)
);

/** Thunk actions */
export const pollingAdminEventsGet =
	(groupId: string): AppThunk =>
	async (dispatch) => {
		try {
			const { events } = await pollingSocketEmit(
				"events:get",
				{ groupId } satisfies EventsQuery,
				eventsGetResponseSchema
			);
			dispatch(setEvents(events));
		} catch (error) {
			dispatch(handleError(error));
		}
	};

export const pollingAdminSelectEvent =
	(eventId: number): AppThunk =>
	async (dispatch) => {
		dispatch(setEventId(eventId));
		try {
			const { polls } = await pollingSocketEmit(
				"polls:get",
				{ eventId } satisfies PollsQuery,
				pollsGetResponseSchema
			);
			dispatch(setPolls(polls));
		} catch (error) {
			dispatch(handleError(error));
		}
	};

export const pollingAdminEventPublish =
	(eventId: number, isPublished: boolean): AppThunk =>
	async (dispatch) => {
		try {
			const msg = "event:" + (isPublished ? "publish" : "unpublish");
			await pollingSocketEmit(msg, { eventId } satisfies EventPublish);
			dispatch(updateEvent({ id: eventId, changes: { isPublished } }));
		} catch (error) {
			dispatch(handleError(error));
		}
	};

export const pollingAdminCreateEvent =
	(eventIn: EventCreate): AppThunk =>
	async (dispatch) => {
		try {
			const { event } = await pollingSocketEmit(
				"event:create",
				eventIn,
				eventCreateResponseSchema
			);
			dispatch(addEvent(event));
		} catch (error) {
			dispatch(handleError(error));
		}
	};

export const pollingAdminUpdateEvent =
	(update: EventUpdate): AppThunk =>
	async (dispatch) => {
		try {
			const { event } = await pollingSocketEmit(
				"event:update",
				update,
				eventUpdateResponseSchema
			);
			dispatch(setEvent(event));
		} catch (error) {
			dispatch(handleError(error));
		}
	};

export const pollingAdminDeleteEvent =
	(id: number): AppThunk =>
	async (dispatch) => {
		try {
			await pollingSocketEmit("event:delete", id satisfies EventDelete);
			dispatch(removeEvent(id));
		} catch (error) {
			dispatch(handleError(error));
		}
	};

export const pollingAdminAddPoll =
	(pollIn: PollCreate): AppThunk =>
	async (dispatch) => {
		try {
			const { poll } = await pollingSocketEmit(
				"poll:create",
				pollIn,
				pollCreateResponseSchema
			);
			dispatch(addPoll(poll));
			dispatch(setSelectedPollId(poll.id));
		} catch (error) {
			dispatch(handleError(error));
		}
	};

export const pollingAdminUpdatePoll =
	(update: PollUpdate): AppThunk =>
	async (dispatch) => {
		try {
			const { poll } = await pollingSocketEmit(
				"poll:update",
				update,
				pollUpdateResponseSchema
			);
			dispatch(setPoll(poll));
		} catch (error) {
			dispatch(handleError(error));
		}
	};

export const pollingAdminDeletePoll =
	(id: number): AppThunk =>
	async (dispatch) => {
		try {
			await pollingSocketEmit("poll:delete", id satisfies PollDelete);
			dispatch(removePoll(id));
		} catch (error) {
			dispatch(handleError(error));
		}
	};

export const pollingAdminPollAction =
	(pollId: number, action: PollAction): AppThunk =>
	async (dispatch, getState) => {
		try {
			const activePoll = selectPollingAdminActivePoll(getState());
			if (activePoll && activePoll.state && pollId !== activePoll.id) {
				await pollingSocketEmit("poll:unshow", activePoll.id);
			}
			dispatch(setActivePollId(pollId));
			await pollingSocketEmit("poll:" + action, pollId);
			let state: PollState = null;
			if (action === "show") state = "shown";
			else if (action === "open") state = "opened";
			else if (action === "close") state = "closed";
			dispatch(updatePoll({ id: pollId, changes: { state } }));
		} catch (error) {
			dispatch(handleError(error));
		}
	};
