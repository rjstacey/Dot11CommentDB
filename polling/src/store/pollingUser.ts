import {
	createSlice,
	createEntityAdapter,
	createSelector,
	PayloadAction,
} from "@reduxjs/toolkit";
import {
	Event,
	Poll,
	PollAction,
	PollUpdate,
	PollVote,
	PollChoice,
} from "@schemas/poll";
import { RootState, AppThunk } from ".";
import { handleError, pollingSocketEmit } from "./pollingSocket";

export type { Event, Poll };
export { PollChoice };

const pollsAdapter = createEntityAdapter<Poll>();

/* Create slice */
const initialState = {
	event: null as Event | null,
	polls: pollsAdapter.getInitialState(),
	selectedPollId: null as number | null,
	pollId: null as number | null,
	pollAction: null as PollAction | null,
	pollVotes: [] as number[],
	submitMsg: "",
};
const dataSet = "pollingUser";
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		setEvent(state, action: PayloadAction<Event | null>) {
			state.event = action.payload;
		},
		setPollVotes(state, action: PayloadAction<number[]>) {
			let votes = action.payload;
			const poll = state.pollId
				? state.polls.entities[state.pollId]
				: undefined;
			if (poll) {
				votes = votes.filter((i) => i >= 0 && i < poll.options.length);
				if (state.pollVotes.join() !== votes.join()) {
					state.pollVotes = votes;
					state.submitMsg = "";
				}
			}
		},
		setSubmitMessage(state, action: PayloadAction<string>) {
			const msg = action.payload;
			state.submitMsg = msg;
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
		upsertPoll(state, action: PayloadAction<Poll>) {
			pollsAdapter.upsertOne(state.polls, action.payload);
		},
		removePoll(state, action: PayloadAction<number>) {
			pollsAdapter.removeOne(state.polls, action.payload);
		},
		setSelectedPollId(state, action: PayloadAction<number | null>) {
			state.selectedPollId = action.payload;
		},
		setActivePollId(state, action: PayloadAction<number | null>) {
			const pollId = action.payload;
			if (state.pollId !== pollId) {
				state.pollId = pollId;
				state.pollVotes = [];
				state.submitMsg = "";
			}
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
	updatePoll,
	upsertPoll,
	removePoll,
	setActivePollId,
	setSubmitMessage,
	setPollVotes,
	setSelectedPollId,
} = slice.actions;

/** Selectors */
export const selectPollingUserState = (state: RootState) => state[dataSet];
export const selectPollingUserEvent = (state: RootState) =>
	selectPollingUserState(state).event;
export const selectPollingUserPolls = createSelector(
	(state: RootState) => selectPollingUserState(state).polls,
	(polls) => pollsAdapter.getSelectors().selectAll(polls)
);

export const selectPollingUserSelectedPollId = (state: RootState) =>
	selectPollingUserState(state).selectedPollId;
export const selectPollingUserSelectedPoll = (state: RootState) => {
	const { selectedPollId: pollId, polls } = selectPollingUserState(state);
	return pollId ? polls.entities[pollId] : undefined;
};

export const selectPollingUserActivePoll = (state: RootState) => {
	const { ids, entities } = selectPollingUserState(state).polls;
	return ids.map((id) => entities[id]!).find((poll) => poll.state);
};

/** Thunk actions */
export const pollingUserSubmitVote =
	(): AppThunk => async (dispatch, getState) => {
		const { pollId, pollVotes } = selectPollingUserState(getState());
		if (!pollId) throw new Error("pollId not set");
		try {
			dispatch(setSubmitMessage("Submiting..."));
			await pollingSocketEmit("poll:vote", {
				id: pollId,
				votes: pollVotes,
			} satisfies PollVote);
			dispatch(setSubmitMessage("Submit successful"));
		} catch (error) {
			dispatch(setSubmitMessage("Submit error"));
			dispatch(handleError(error));
		}
	};
