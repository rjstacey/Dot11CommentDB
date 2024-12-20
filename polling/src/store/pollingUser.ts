import {
	createSlice,
	createEntityAdapter,
	createSelector,
	PayloadAction,
} from "@reduxjs/toolkit";
import { Socket } from "socket.io-client";
import {
	eventOpenedSchema,
	pollAddedSchema,
	pollUpdatedSchema,
	pollDeletedSchema,
	pollIdSchema,
	Event,
	Poll,
	PollAction,
} from "@schemas/poll";
import { RootState, store } from ".";

export type { Event, Poll };

const pollsAdapter = createEntityAdapter<Poll>();

/* Create slice */
const initialState = {
	event: null as Event | null,
	polls: pollsAdapter.getInitialState(),
	pollId: null as number | null,
	pollAction: null as PollAction | null,
};
const dataSet = "pollingUser";
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		setEvent(state, action: PayloadAction<Event | null>) {
			state.event = action.payload;
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
		setPollAction(
			state,
			action: PayloadAction<{
				pollId: number;
				pollAction: PollAction | null;
			}>
		) {
			const { pollId, pollAction } = action.payload;
			state.pollId = pollId;
			state.pollAction = pollAction;
		},
	},
});

export default slice;

/** Slice actions */
const { setEvent, setPolls, setPoll, addPoll, removePoll, setPollAction } =
	slice.actions;

/** Selectors */
const selectPollingUserState = (state: RootState) => state[dataSet];
export const selectPollingUserEvent = (state: RootState) =>
	selectPollingUserState(state).event;
export const selectPollingUserPolls = createSelector(
	(state: RootState) => selectPollingUserState(state).polls,
	(polls) => pollsAdapter.getSelectors().selectAll(polls)
);

/** Thunk actions */
function pollingUserEventOpened(params: any, cb: Function) {
	const { dispatch } = store;
	try {
		const p = eventOpenedSchema.parse(params);
		console.log("event opened", p.event);
		dispatch(setEvent(p.event));
		dispatch(setPolls(p.polls));
	} catch (error) {
		console.log("event opened", error);
	}
}

function pollingUserPollAdded(params: any, cb: Function) {
	const { dispatch } = store;
	try {
		const poll = pollAddedSchema.parse(params);
		dispatch(addPoll(poll));
	} catch (error) {
		console.log("poll added", error);
	}
}

function pollingUserPollUpdated(params: any, cb: Function) {
	const { dispatch } = store;
	try {
		const poll = pollUpdatedSchema.parse(params);
		dispatch(setPoll(poll));
	} catch (error) {
		console.log("poll updated", error);
	}
}

function pollingUserPollRemoved(params: any, cb: Function) {
	const { dispatch } = store;
	try {
		const id = pollDeletedSchema.parse(params);
		dispatch(removePoll(id));
	} catch (error) {
		console.log("poll removed", error);
	}
}

function pollingUserPollAction(
	pollAction: PollAction,
	params: any,
	cb: Function
) {
	const { dispatch } = store;
	try {
		const pollId = pollIdSchema.parse(params);
		dispatch(setPollAction({ pollId, pollAction }));
	} catch (error) {
		console.log("poll " + pollAction, error);
	}
}

export function pollingUserSocketRegister(socket: Socket) {
	socket
		.on("event:opened", pollingUserEventOpened)
		.on("poll:added", pollingUserPollAdded)
		.on("poll:updated", pollingUserPollUpdated)
		.on("poll:removed", pollingUserPollRemoved)
		.on("poll:shown", (params: any, cb: Function) =>
			pollingUserPollAction("show", params, cb)
		)
		.on("poll:opened", (params: any, cb: Function) =>
			pollingUserPollAction("open", params, cb)
		)
		.on("poll:closed", (params: any, cb: Function) =>
			pollingUserPollAction("close", params, cb)
		);
}
