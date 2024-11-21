import {
	createSlice,
	createEntityAdapter,
	PayloadAction,
	createSelector,
} from "@reduxjs/toolkit";
import { fetcher, setError } from "dot11-components";

import type { AppThunk, RootState } from ".";

export type ImatCommitteeType = "Working Group" | "Project";
export type Committee = {
	id: number;
	parent_id: number;
	type: ImatCommitteeType;
	symbol: string;
	shortName: string;
	name: string;
};

type ExtraState = {
	valid: boolean;
	loading: boolean;
	groupName: string | null;
	lastLoad: string | null;
};

/* Create slice */
const selectId = (d: Committee) => d.symbol;
const dataAdapter = createEntityAdapter<Committee>({ selectId });
const initialState = dataAdapter.getInitialState<ExtraState>({
	valid: false,
	loading: false,
	groupName: null,
	lastLoad: null,
});
const dataSet = "imatCommittees";
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		getPending(state, action: PayloadAction<{ groupName: string }>) {
			const { groupName } = action.payload;
			state.loading = true;
			state.lastLoad = new Date().toISOString();
			if (state.groupName !== groupName) {
				state.groupName = groupName;
				state.valid = false;
				dataAdapter.removeAll(state);
			}
		},
		getSuccess(state, action: PayloadAction<Committee[]>) {
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, action.payload);
		},
		getFailure(state) {
			state.loading = false;
		},
	},
});

export default slice;

/* Slice actions */
const { getPending, getSuccess, getFailure } = slice.actions;

/* Selectors */
export const selectImatCommitteesState = (state: RootState) => state[dataSet];
const selectImatCommitteesAge = (state: RootState) => {
	let lastLoad = selectImatCommitteesState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
export const selectImatCommittees = createSelector(
	selectImatCommitteesState,
	({ ids, entities }) => ids.map((id) => entities[id]!)
);

/* Thunk actions */
const AGE_STALE = 60 * 60 * 1000; // 1 hour

let loading = false;
let loadingPromise: Promise<void> = Promise.resolve();
export const loadCommittees =
	(groupName: string, force = false): AppThunk<void> =>
	async (dispatch, getState) => {
		const state = getState();
		const currentGroupName = selectImatCommitteesState(state).groupName;
		if (currentGroupName === groupName) {
			if (loading) return loadingPromise;
			const age = selectImatCommitteesAge(state);
			if (!force && age && age < AGE_STALE) return loadingPromise;
		}
		dispatch(getPending({ groupName }));
		const url = `/api/${groupName}/imat/committees`;
		loading = true;
		loadingPromise = fetcher
			.get(url)
			.then((response: any) => {
				if (!Array.isArray(response))
					throw new TypeError(`Unexpected response to GET ${url}`);
				dispatch(getSuccess(response));
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("Unable to get committees", error));
			})
			.finally(() => {
				loading = false;
			});
		return loadingPromise;
	};
