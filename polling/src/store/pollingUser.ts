import {
	createSlice,
	createEntityAdapter,
	createSelector,
	PayloadAction,
} from "@reduxjs/toolkit";
import { Event, Poll, PollAction } from "@schemas/poll";
import { RootState } from ".";

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
		setActivePollId(state, action: PayloadAction<number | null>) {
			state.pollId = action.payload;
		},
	},
});

export default slice;

/** Slice actions */
export const {
	setEvent,
	setPolls,
	setPoll,
	addPoll,
	removePoll,
	setActivePollId,
} = slice.actions;

/** Selectors */
const selectPollingUserState = (state: RootState) => state[dataSet];
export const selectPollingUserEvent = (state: RootState) =>
	selectPollingUserState(state).event;
export const selectPollingUserPolls = createSelector(
	(state: RootState) => selectPollingUserState(state).polls,
	(polls) => pollsAdapter.getSelectors().selectAll(polls)
);

export const selectPollingUserActivePoll = (state: RootState) => {
	const { pollId, polls } = selectPollingUserState(state);
	return pollId ? polls.entities[pollId] : undefined;
};

/** Thunk actions */
