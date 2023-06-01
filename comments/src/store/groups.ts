import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import {
	fetcher,
	setError,
} from 'dot11-components';

import type { RootState, AppThunk } from '.';

const GroupTypeLabels = {
	c: 'Committee',
	wg: 'Working Group',
	sg: 'Study Group',
	tg: 'Task Group',
	sc: 'Standing Committee',
	ah: 'Ad-hoc Group'
};

export type GroupType = keyof typeof GroupTypeLabels;

export const GroupTypeOptions = Object.entries(GroupTypeLabels).map(([value, label]) => ({value, label} as {value: GroupType; label: string}));

export const GroupStatusOptions = [
	{value: 0, label: 'Inactive'},
	{value: 1, label: 'Active'}
];

export type Group = {
	id: string;
	parent_id: string | null;
	name: string;
	status: number;
	symbol: string | null;
	color: string;
	type: GroupType | null;
	project: string | null;
};

export const dataSet = 'groups';

const dataAdapter = createEntityAdapter<Group>();

const slice = createSlice({
    name: dataSet,
    initialState: dataAdapter.getInitialState({
        loading: false,
        valid: false
    }),
    reducers: {
        getPending(state) {
            state.loading = true;
        },
        getSuccess(state, action: PayloadAction<Group[]>) {
            state.loading = false;
            state.valid = true;
            dataAdapter.setAll(state, action);
        },
        getFailure(state) {
            state.loading = false;
            state.valid = false;
        },
    },
});


export default slice;

/*
 * Selectors
 */
export const selectGroupsState = (state: RootState) => state[dataSet];
export const selectGroupEntities = (state: RootState) => selectGroupsState(state).entities;
export const selectGroupIds = (state: RootState) => selectGroupsState(state).ids;
export const selectGroups = (state: RootState) => {
	const {ids, entities} = selectGroupsState(state);
	return ids.map(id => entities[id]!);
}

/*
 * Actions
 */
const {
	getPending,
	getSuccess,
	getFailure,
} = slice.actions;

const baseUrl = '/api/groups';

export const loadGroups = (): AppThunk => 
	(dispatch) => {
		dispatch(getPending());
		const url = baseUrl + '/802.11';
		return fetcher.get(url)
			.then((response: any) => {
				if (!Array.isArray(response))
					throw new TypeError(`Unexpected response to GET ${url}`);
				dispatch(getSuccess(response));
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError('Unable to get groups', error));
			});
	}

