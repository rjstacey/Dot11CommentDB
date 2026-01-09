import {
	createSlice,
	createEntityAdapter,
	createSelector,
	PayloadAction,
} from "@reduxjs/toolkit";
import {
	Event,
	Poll,
	PollUpdate,
	PollVote,
	PollChoice,
	PollResult,
} from "@schemas/poll";
import { RootState, AppThunk, selectUser } from ".";
import { handleError, pollingSocketEmit } from "./pollingSocket";

export type { Event, Poll };
export { PollChoice };

const pollsAdapter = createEntityAdapter<Poll>();
const pollVotesAdapter = createEntityAdapter<PollResult>({
	selectId: (r) => r.pollId,
});

/* Create slice */
const initialState = {
	polls: pollsAdapter.getInitialState(),
	pollsVotes: pollVotesAdapter.getInitialState(),
	selectedPollId: null as number | null,
};
const dataSet = "pollingUser";
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
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
		removePolls(state, action: PayloadAction<number[]>) {
			pollsAdapter.removeMany(state.polls, action.payload);
		},
		setSelectedPollId(state, action: PayloadAction<number | null>) {
			state.selectedPollId = action.payload;
		},
		setPollsVotes(state, action: PayloadAction<PollResult[]>) {
			pollVotesAdapter.setAll(state.pollsVotes, action.payload);
		},
		removePollsVotes(state, action: PayloadAction<number[]>) {
			pollVotesAdapter.removeMany(state.pollsVotes, action.payload);
		},
		upsertPollsVotes(state, action: PayloadAction<PollResult>) {
			pollVotesAdapter.upsertOne(state.pollsVotes, action.payload);
		},
	},
});

export default slice;

/** Slice actions */
export const {
	setPolls,
	setPoll,
	addPoll,
	updatePoll,
	upsertPoll,
	removePoll,
	removePolls,
	setPollsVotes,
	removePollsVotes,
	upsertPollsVotes,
	setSelectedPollId,
} = slice.actions;

/** Selectors */
export const selectPollingUserState = (state: RootState) => state[dataSet];

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

export const selectPollingUserPollVotes = (state: RootState) => {
	const poll = selectPollingUserActivePoll(state);
	if (!poll) return null;
	const { entities } = selectPollingUserState(state).pollsVotes;
	return entities[poll.id] || null;
};

/** Thunk actions */
export const pollingUserSubmitVote =
	(pollId: number, votes: number[]): AppThunk<boolean> =>
	async (dispatch, getState) => {
		const user = selectUser(getState());
		dispatch(
			upsertPollsVotes({
				SAPIN: user.SAPIN,
				pollId,
				votes,
			})
		);
		try {
			await pollingSocketEmit("poll:vote", {
				pollId,
				votes: votes,
			} satisfies PollVote);
			return true;
		} catch (error) {
			dispatch(handleError(error));
			return false;
		}
	};
