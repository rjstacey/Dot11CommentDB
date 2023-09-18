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
export function selectGroupEntities(state: RootState) {return selectGroupsState(state).entities};
export const selectGroupIds = (state: RootState) => selectGroupsState(state).ids;

export function selectGroups(state: RootState) {
	const {ids, entities, workingGroupId} = selectGroupsState(state);
	function getChildren(parent_ids: string[]) {
		let childIds = (ids as string[]).filter(id => {
			const group = entities[id]!;
			return group.parent_id && parent_ids.includes(group.parent_id);
		});
		if (childIds.length > 0)
			childIds = childIds.concat(getChildren(childIds));
		return childIds;
	}
	let subgroupIds: string[] = [];
	if (workingGroupId)
		subgroupIds = [workingGroupId].concat(getChildren([workingGroupId]));
	return subgroupIds.map(id => entities[id]!);
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
export const selectWorkingGroupName = (state: RootState) => selectWorkingGroup(state)?.name || '';

export const selectWorkingGroupPermissions = (state: RootState) => selectWorkingGroup(state)?.permissions || {};

/** 
 * Select group permissions.
 * If the group has a parent group, then return permissions that provide the highest access from either the group or
 * the parent group. This is recursive; the parent group permissions are the highest of the parent group and its parent group.
 */
export const selectGroupPermissions = (state: RootState, groupId: string): Record<string, number> => {
	const group = selectGroup(state, groupId);
	if (!group)
		return {};
	const parentPermissions = group.parent_id? selectGroupPermissions(state, group.parent_id): {};
	const permissions = {...parentPermissions};
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

export const loadGroups = (groupName?: string): AppThunk<Group[]> => 
	(dispatch) => {
		dispatch(getPending());
		const url = groupName? `${baseUrl}/${groupName}`: `${baseUrl}?type=wg`;
		return fetcher.get(url)
			.then((response: any) => {
				if (!validResponse(response))
					throw new TypeError('Unexpected response to GET ' + url);
				dispatch(getSuccess(response));
				return response;
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError('Unable to get groups', error));
				return [];
			});
	}

export const loadSubgroups = (): AppThunk =>
	async (dispatch, getState) => {
		const workingGroup = selectWorkingGroup(getState());
		if (workingGroup)
			dispatch(loadGroups(workingGroup.name));
	}

export const getGroups = (): AppThunk<Group[]> =>
	async (dispatch, getState) => {
		const state = getState();
		const {valid, ids, entities} = selectGroupsState(state);
		if (!valid)
			return dispatch(loadGroups());
		return ids.map(id => entities[id]!).filter(group => group.type === "wg");
	}

export const initGroups = (): AppThunk =>
	async (dispatch) => {
		dispatch(loadGroups());
		dispatch(loadSubgroups());
	}

export const setWorkingGroupId = (workingGroupId: string | null): AppThunk<Group | undefined> =>
	async (dispatch, getState) => {
		const currentWorkingGroupId = selectWorkingGroupId(getState());
		if (currentWorkingGroupId !== workingGroupId) {
			dispatch(clearMembers());
			dispatch(clearBallots());
			dispatch(clearEpolls());
			dispatch(setWorkingGroupIdLocal(workingGroupId));
			if (workingGroupId) {
				const groupName = selectWorkingGroupName(getState());
				dispatch(loadGroups(groupName));
				dispatch(loadMembers());
				dispatch(loadBallots());
			}
		}
		return workingGroupId? selectGroup(getState(), workingGroupId): undefined;
	}
