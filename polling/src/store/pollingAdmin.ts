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
	PollShow,
	PollOpen,
	pollsGetResponseSchema,
	pollCreateResponseSchema,
	pollUpdateResponseSchema,
} from "../schemas/poll";
import { AppThunk, RootState } from ".";
import { handleError, pollingSocketEmit } from "./pollingSocket";

const eventsAdapter = createEntityAdapter<Event>();
const pollsAdapter = createEntityAdapter<Poll>();

/* Create slice */
const initialState = {
	eventId: null as number | null,
	shownPollId: null as number | null,
	openedPollId: null as number | null,
	events: eventsAdapter.getInitialState(),
	polls: pollsAdapter.getInitialState(),
};
const dataSet = "pollingAdmin";
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		setEventId(state, action: PayloadAction<number | null>) {
			state.eventId = action.payload;
		},
		showPoll(state, action: PayloadAction<number | null>) {
			state.shownPollId = action.payload;
		},
		openPoll(state, action: PayloadAction<number | null>) {
			state.openedPollId = action.payload;
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
		removePoll(state, action: PayloadAction<number>) {
			pollsAdapter.removeOne(state.polls, action.payload);
		},
	},
});

export default slice;

/** Slice actions */
const {
	setEventId,
	setEvents,
	setEvent,
	addEvent,
	updateEvent,
	removeEvent,
	setPolls,
	setPoll,
	addPoll,
	removePoll,
	showPoll,
	openPoll,
} = slice.actions;

/** Selectors */
const selectPollingAdminState = (state: RootState) => state[dataSet];
export const selectPollingAdminEventId = (state: RootState) =>
	selectPollingAdminState(state).eventId;
export const selectPollingAdminEventIds = (state: RootState) =>
	selectPollingAdminState(state).events.ids;
export const selectPollingAdminEventEntities = (state: RootState) =>
	selectPollingAdminState(state).events.ids;

export const selectPollAdminEvent = (state: RootState) => {
	const { eventId, events } = selectPollingAdminState(state);
	return eventId ? events.entities[eventId] : undefined;
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
		} catch (error: any) {
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
		} catch (error: any) {
			dispatch(handleError);
		}
	};

export const pollingAdminEventPublish =
	(eventId: number, isPublished: boolean): AppThunk =>
	async (dispatch) => {
		try {
			const msg = "event:" + (isPublished ? "publish" : "unpublish");
			await pollingSocketEmit(msg, { eventId } satisfies EventPublish);
			dispatch(updateEvent({ id: eventId, changes: { isPublished } }));
		} catch (error: any) {
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
		} catch (error: any) {
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
		} catch (error: any) {
			dispatch(handleError(error));
		}
	};

export const pollingAdminDeleteEvent =
	(id: number): AppThunk =>
	async (dispatch) => {
		try {
			await pollingSocketEmit("event:delete", id satisfies EventDelete);
			dispatch(removeEvent(id));
		} catch (error: any) {
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
		} catch (error: any) {
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
		} catch (error: any) {
			dispatch(handleError(error));
		}
	};

export const pollingAdminDeletePoll =
	(id: number): AppThunk =>
	async (dispatch) => {
		try {
			await pollingSocketEmit("poll:delete", id satisfies PollDelete);
			dispatch(removePoll(id));
		} catch (error: any) {
			dispatch(handleError(error));
		}
	};

export const pollingAdminShowPoll =
	(id: number): AppThunk =>
	async (dispatch) => {
		try {
			await pollingSocketEmit("poll:show", id satisfies PollShow);
			dispatch(showPoll(id));
		} catch (error: any) {
			dispatch(handleError(error));
		}
	};

export const pollingAdminOpenPoll =
	(id: number): AppThunk =>
	async (dispatch) => {
		try {
			await pollingSocketEmit("poll:open", id satisfies PollOpen);
			dispatch(openPoll(id));
		} catch (error: any) {
			dispatch(handleError(error));
		}
	};
