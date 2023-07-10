import { createSlice, createEntityAdapter, createSelector } from '@reduxjs/toolkit';
import type { EntityId } from '@reduxjs/toolkit';

import { fetcher, setError } from 'dot11-components';

import type { RootState, AppThunk } from '.';
import { selectWorkingGroupName } from './groups';

export type OfficerId = string;
export type Officer = {
	id: OfficerId;
	sapin: number;
	position: string;
	group_id: string;
};

const dataAdapter = createEntityAdapter<Officer>({});
const initialState = dataAdapter.getInitialState({
	valid: false,
	loading: false,
});

export type OfficersState = typeof initialState;

const dataSet = 'officers';
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		getPending(state) {
			state.loading = true;
		},
  		getSuccess(state, action) {
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
 * Selectors
 */
export const selectOfficersState = (state: RootState) => state[dataSet];

export function selectGroupOfficers(state: OfficersState, group_id: EntityId) {
	const {ids, entities} = state;
	return ids
		.filter(id => entities[id]!.group_id === group_id)
		.map(id => entities[id]!);
}

export const createGroupOfficersSelector = (state: RootState, group_id: EntityId) => createSelector(
	selectOfficersState,
	() => group_id,
	selectGroupOfficers
);

/*
 * Actions
 */
const {
	getPending,
	getSuccess,
	getFailure,
} = slice.actions;

export const loadOfficers = (): AppThunk => 
	(dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		if (!groupName)
			return;
		const url = `/api/${groupName}/officers`;
		dispatch(getPending());
		return fetcher.get(url)
			.then((officers: any) => {
				if (!Array.isArray(officers))
					throw new TypeError(`Unexpected response to GET ${url}`);
				dispatch(getSuccess(officers));
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError('Unable to get groups', error));
			});
	}
