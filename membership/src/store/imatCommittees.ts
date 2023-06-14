import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import { fetcher, setError } from 'dot11-components';

import type { AppThunk, RootState } from '.';
import { selectWorkingGroup } from './groups';

export type ImatCommitteeType = "Working Group" | "Project";
export type Committee = {
	id: number;
	parent_id: number;
	type: ImatCommitteeType;
	symbol: string;
	shortName: string;
	name: string;
}

const selectId = (d: Committee) => d.symbol;
const dataAdapter = createEntityAdapter<Committee>({selectId});
const initialState = dataAdapter.getInitialState({
	valid: false,
	loading: false,
});
const dataSet = 'imatCommittees';
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		getPending(state) {
			state.loading = true;
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

/*
 * Selector
 */
export const selectImatCommitteesState = (state: RootState) => state[dataSet];

/*
 * Actions
 */
const {
	getPending,
	getSuccess,
	getFailure,
} = slice.actions;

export const loadCommittees = (): AppThunk =>
	async (dispatch, getState) => {
		const wg = selectWorkingGroup(getState());
		if (!wg) {
			console.error("Working group not set");
			return;
		}
		const url = `/api/${wg.name}/imat/committees`;
		dispatch(getPending());
		let committees: any;
		try {
			committees = await fetcher.get(url);
			if (!Array.isArray(committees))
				throw new TypeError(`Unexpected response to GET ${url}`);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get committees', error));
			return;
		}
		dispatch(getSuccess(committees));
	}

