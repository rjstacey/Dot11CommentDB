import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';
import { fetcher, isObject, setError } from 'dot11-components';

import type { RootState, AppThunk } from '.';
import { clearBallots, loadBallots } from './ballots';
import { clearMembers, loadMembers } from './members';
import { clearEpolls } from './epolls';

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

const dataAdapter = createEntityAdapter<Group>();
const dataSet = 'groups';
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
export function selectGroups(state: RootState) {
	const {ids, entities, workingGroupId} = selectGroupsState(state);
	return ids.map(id => entities[id]!)
		.filter(group => group.id === workingGroupId || group.parent_id === workingGroupId);
}
export const selectGroup = (state: RootState, groupId: string) => selectGroupEntities(state)[groupId];
export const selectWorkingGroups = (state: RootState) => {
	const {ids, entities} = selectGroupsState(state);
	return ids.map(id => entities[id]!).filter(g => g.type === 'wg');
}
export const selectWorkingGroupId = (state: RootState) => selectGroupsState(state).workingGroupId;
export const selectWorkingGroup = (state: RootState) => {
	const {workingGroupId, entities} = selectGroupsState(state);
	return (workingGroupId && entities[workingGroupId]) || undefined;
}
export const selectWorkingGroupName = (state: RootState) => selectWorkingGroup(state)?.name || '*';

export const selectWorkingGroupPermissions = (state: RootState) => selectWorkingGroup(state)?.permissions || {};

/** 
 * Select group permissions.
 * If the group is the subgroup of a working group, then return permissions that provide the highest access from either the group or
 * the working group. If the group is not a subgroup of a working group, then return the group permissions.
 */
export const selectGroupPermissions = (state: RootState, groupId: string) => {
	const group = selectGroup(state, groupId);
	if (!group?.type)
		return {};
	if ([!'tg', 'sg', 'sc', 'ah'].includes(group.type))
		return group.permissions;
	const workingGroup = group.parent_id? selectGroup(state, group.parent_id): undefined;
	if (!workingGroup)
		return group.permissions;
	// We have a group and a working group; coalesce permissions
	const permissions = {...workingGroup.permissions};
	Object.entries(group.permissions).forEach(([scope, access]) => {
		if (!permissions[scope] || permissions[scope] < access)
			permissions[scope] = access;
	});
	return permissions;
}

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
	type?: GroupType;
	parent_id?: string;
}

export const loadGroups = (constraints?: LoadGroupContstraints): AppThunk => 
	(dispatch) => {
		dispatch(getPending());
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
		const state = getState();
		const currentWorkingGroupId = selectWorkingGroupId(state);
		if (currentWorkingGroupId !== workingGroupId) {
			dispatch(clearMembers());
			dispatch(clearBallots());
			dispatch(clearEpolls());
			dispatch(setWorkingGroupIdLocal(workingGroupId));
			dispatch(loadMembers());
			dispatch(loadBallots());
		}
		return selectWorkingGroup(getState());
	}

export const initGroups = (): AppThunk =>
	(dispatch, getState) => {
		const workingGroup = selectWorkingGroup(getState());
		if (workingGroup)
			dispatch(loadGroups({parent_id: workingGroup.id}));
		dispatch(loadGroups({type: "wg"}));
		return Promise.resolve();
	}