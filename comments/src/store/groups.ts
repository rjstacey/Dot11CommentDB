import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import { fetcher, isObject, setError } from 'dot11-components';

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
	permissions: Record<string, number>;
};

export const dataSet = 'groups';

const dataAdapter = createEntityAdapter<Group>();

type ExtraState = {
	workingGroupId: string | null;
	loading: boolean;
	valid: boolean;
}

const initialState: ExtraState = {
	workingGroupId: null,
	loading: false,
	valid: false
}

const slice = createSlice({
    name: dataSet,
    initialState: dataAdapter.getInitialState(initialState),
    reducers: {
        getPending(state) {
            state.loading = true;
        },
        getSuccess(state, action: PayloadAction<Group[]>) {
            state.loading = false;
            state.valid = true;
            dataAdapter.setMany(state, action);
        },
        getFailure(state) {
            state.loading = false;
            state.valid = false;
        },
		setWorkingGroupId(state, action: PayloadAction<string | null>) {
			state.workingGroupId = action.payload;
		},
		setAll: dataAdapter.setAll,
		setMany: dataAdapter.setMany,
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
export const selectWorkingGroups = (state: RootState) => selectGroups(state).filter(g => g.type === 'wg');
export const selectWorkingGroupId = (state: RootState) => selectGroupsState(state).workingGroupId;
export const selectWorkingGroup = (state: RootState) => {
	const {workingGroupId, entities} = selectGroupsState(state);
	return (workingGroupId && entities[workingGroupId]) || undefined;
}
export const selectWorkingGroupPermissions = (state: RootState) => selectWorkingGroup(state)?.permissions || {};

/*
 * Actions
 */
const {
	getPending,
	getSuccess,
	getFailure,
	setWorkingGroupId: setWorkingGroupIdLocal
} = slice.actions;

const baseUrl = '/api/groups';

function validGroup(group: any): group is Group {
	return isObject(group) &&
		group.id && typeof group.id === 'string';
}

function validResponse(response: any): response is Group[] {
	return Array.isArray(response) && response.every(validGroup);
}

type LoadGroupContstraints = {
	type?: "c" | "wg" | "tg";
	parent_id?: string;
}

export const loadGroups = (constraints?: LoadGroupContstraints): AppThunk => 
	(dispatch) => {
		dispatch(getPending());
		//const url = baseUrl + '/802.11';
		return fetcher.get(baseUrl, constraints)
			.then((response: any) => {
				if (!validResponse(response))
					throw new TypeError('Unexpected response');
				dispatch(getSuccess(response));
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError('Unable to get groups', error));
			});
	}

export const setWorkingGroupId = (workingGroupId: string | null): AppThunk<Group | undefined> =>
	async (dispatch, getState) => {
			dispatch(setWorkingGroupIdLocal(workingGroupId));
			return selectWorkingGroup(getState());
	}
