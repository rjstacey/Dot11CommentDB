import {
	createSlice,
	createEntityAdapter,
	PayloadAction,
} from "@reduxjs/toolkit";
import { setError } from "dot11-components";
import {
	Event,
	EventCreate,
	EventUpdate,
	EventDelete,
	EventOpen,
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
	pollAddedSchema,
	pollUpdatedSchema,
	pollsGetResponseSchema,
	pollCreateResponseSchema,
	pollUpdateResponseSchema,
} from "../schemas/poll";
import { AppThunk, RootState } from ".";
import { getSocket, okResponse } from "./pollingSocket";

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
const selectPollingAdminEventId = (state: RootState) =>
	selectPollingAdminState(state).eventId;

/** Thunk actions */
function handleError(error: any) {
	let name = "Error";
	let message = "Unknown";
	if (error instanceof Error) {
		name = error.name;
		message = error.message;
	}
	return setError(name, message);
}

export const pollingAdminSelectEvent =
	(eventId: number): AppThunk =>
	async (dispatch, getState) => {
		const socket = getSocket();
		dispatch(setEventId(eventId));
		const params: PollsQuery = { eventId };
		socket.emit("polls:get", params, (response: any) => {
			try {
				const { polls } = okResponse(response, pollsGetResponseSchema);
				dispatch(setPolls(polls));
			} catch (error: any) {
				dispatch(handleError(error));
			}
		});
	};

export const pollingAdminOpenEvent =
	(eventId: number): AppThunk =>
	async (dispatch, getState) => {
		const socket = getSocket();
		const params: EventOpen = { eventId };
		socket.emit("event:open", params, (response: any) => {
			console.log("event:open");
			try {
				okResponse(response);
			} catch (error: any) {
				dispatch(handleError(error));
			}
		});
	};

export const pollingAdminCreateEvent =
	(event: EventCreate): AppThunk =>
	async (dispatch, getState) => {
		const socket = getSocket();
		socket.emit("event:create", event, (response: any) => {
			console.log("event:create response");
			try {
				const { event } = okResponse(
					response,
					eventCreateResponseSchema
				);
				dispatch(addEvent(event));
			} catch (error: any) {
				dispatch(handleError(error));
			}
		});
	};

export const pollingAdminUpdateEvent =
	(update: EventUpdate): AppThunk =>
	async (dispatch, getState) => {
		const socket = getSocket();
		socket.emit("event:update", update, (response: any) => {
			console.log("event:update response");
			try {
				const { event } = okResponse(
					response,
					eventUpdateResponseSchema
				);
				dispatch(setEvent(event));
			} catch (error: any) {
				dispatch(handleError(error));
			}
		});
	};

export const pollingAdminDeleteEvent =
	(id: number): AppThunk =>
	async (dispatch, getState) => {
		const socket = getSocket();
		socket.emit(
			"event:delete",
			id satisfies EventDelete,
			(response: any) => {
				console.log("event:delete response");
				try {
					okResponse(response);
					dispatch(removeEvent(id));
				} catch (error: any) {
					dispatch(handleError(error));
				}
			}
		);
	};

export const pollingAdminAddPoll =
	(poll: PollCreate): AppThunk =>
	async (dispatch, getState) => {
		const socket = getSocket();
		socket.emit("poll:create", poll, (response: any) => {
			console.log("poll:create");
			try {
				const { poll } = okResponse(response, pollCreateResponseSchema);
				dispatch(addPoll(poll));
			} catch (error) {
				dispatch(handleError(error));
			}
		});
	};

export const pollingAdminUpdatePoll =
	(update: PollUpdate): AppThunk =>
	async (dispatch, getState) => {
		const socket = getSocket();
		socket.emit("poll:update", update, (response: any) => {
			console.log("poll:update");
			try {
				const { poll } = okResponse(response, pollUpdateResponseSchema);
				dispatch(setPoll(poll));
			} catch (error) {
				dispatch(handleError(error));
			}
		});
	};

export const pollingAdminDeletePoll =
	(id: number): AppThunk =>
	async (dispatch, getState) => {
		const socket = getSocket();
		socket.emit("poll:delete", id satisfies PollDelete, (response: any) => {
			console.log("poll:delete");
			try {
				okResponse(response);
				dispatch(removePoll(id));
			} catch (error) {
				dispatch(handleError(error));
			}
		});
	};

export const pollingAdminShowPoll =
	(id: number): AppThunk =>
	async (dispatch, getState) => {
		const socket = getSocket();
		socket.emit("poll:show", id satisfies PollShow, (response: any) => {
			console.log("poll:show");
			try {
				okResponse(response);
				dispatch(showPoll(id));
			} catch (error) {
				dispatch(handleError(error));
			}
		});
	};

export const pollingAdminOpenPoll =
	(id: number): AppThunk =>
	async (dispatch, getState) => {
		const socket = getSocket();
		socket.emit("poll:open", id satisfies PollOpen, (response: any) => {
			console.log("poll:show");
			try {
				okResponse(response);
				dispatch(showPoll(id));
			} catch (error) {
				dispatch(handleError(error));
			}
		});
	};
