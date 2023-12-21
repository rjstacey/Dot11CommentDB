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
};

/* Create slice */
const selectId = (d: Committee) => d.symbol;
const dataAdapter = createEntityAdapter<Committee>({ selectId });
const initialState = dataAdapter.getInitialState<ExtraState>({
	valid: false,
	loading: false,
	groupName: null,
});
const dataSet = "imatCommittees";
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		getPending(state, action: PayloadAction<{ groupName: string }>) {
			const { groupName } = action.payload;
			state.loading = true;
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
export const selectImatCommittees = createSelector(
	selectImatCommitteesState,
	({ids, entities}) => ids.map(id => entities[id]!)
);

/* Thunk actions */
let loadingPromise: Promise<ImatCommitteeType[]>
export const loadCommittees =
	(groupName: string): AppThunk<ImatCommitteeType[]> =>
	async (dispatch, getState) => {
		const {loading, groupName: currentGroupName} = selectImatCommitteesState(getState());
		if (loading && currentGroupName === groupName) {
			return loadingPromise;
		}
		dispatch(getPending({ groupName }));
		const url = `/api/${groupName}/imat/committees`;
		loadingPromise = fetcher.get(url)
			.then((response: any) => {
				if (!Array.isArray(response))
					throw new TypeError(`Unexpected response to GET ${url}`);
				dispatch(getSuccess(response));
				return response;
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("Unable to get committees", error));
				return [];
			});
		return loadingPromise;
	};
