import {
	createSlice,
	createEntityAdapter,
	PayloadAction,
} from "@reduxjs/toolkit";
import { Socket } from "socket.io-client";
import {
	eventOpenedSchema,
	pollAddedSchema,
	pollUpdatedSchema,
	pollDeletedSchema,
	Poll,
} from "@schemas/poll";
import { RootState, store } from ".";

const pollsAdapter = createEntityAdapter<Poll>();

/* Create slice */
const initialState = {
	eventId: null as number | null,
	polls: pollsAdapter.getInitialState(),
};
const dataSet = "pollingUser";
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		setEventId(state, action: PayloadAction<number | null>) {
			state.eventId = action.payload;
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
const { setEventId, setPolls, setPoll, addPoll, removePoll } = slice.actions;

/** Selectors */
const selectPollingUserState = (state: RootState) => state[dataSet];
export const selectPollingUserEventId = (state: RootState) =>
	selectPollingUserState(state).eventId;

/** Thunk actions */
function pollingUserPollsSet(params: any, cb: Function) {
	const { dispatch } = store;
	try {
		const p = eventOpenedSchema.parse(params);
		dispatch(setEventId(p.eventId));
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

export function pollingUserSocketRegister(socket: Socket) {
	socket
		.on("polls:set", pollingUserPollsSet)
		.on("poll:added", pollingUserPollAdded)
		.on("poll:updated", pollingUserPollUpdated)
		.on("poll:removed", pollingUserPollRemoved);
}
