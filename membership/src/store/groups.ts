import { Action, EntityId, PayloadAction, createAction, createSelector, Dictionary } from '@reduxjs/toolkit';

import { v4 as uuid } from 'uuid';

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	getAppTableDataSelectors,
	isObject,
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
	color: string | null;
	type: GroupType | null;
	project: string | null;
	permissions: Record<string, number>;
};

export type GroupCreate = Omit<Group, "id" | "permissions"> & { id?: string };

export const fields = {
	id: {},
	parent_id: {},
	name: {label: 'Group'},
	type: {label: 'Type', dataRenderer: (v: GroupType) => GroupTypeLabels[v]},
	status: {label: 'Status', dataRenderer: (v: number) => v? 'Active': 'Inactive'},
	symbol: {label: 'Committee'},
};

interface Node {
	id: EntityId;
	children: Node[];
}

function treeSortedIds(ids: EntityId[], entities: Dictionary<Group>) {

	function compare(n1: Node, n2: Node) {
		const g1 = entities[n1.id]!;
		const g2 = entities[n2.id]!;
		const keys = Object.keys(GroupTypeLabels);
		let cmp = keys.indexOf(g1.type || '') - keys.indexOf(g2.type || '');
		if (cmp === 0)
			cmp = g1.name.localeCompare(g2.name);
		return cmp;
	}
	
	function findChildren(parent_id: EntityId | null) {
		const nodes: Node[] = [];
		for (const id of ids) {
			if (entities[id]!.parent_id === parent_id) {
				const children = findChildren(id).sort(compare);
				nodes.push({id, children});
			}
		}
		return nodes;
	}

	const nodes = findChildren(null);

	function concat(nodes: Node[]) {
		let ids: EntityId[] = [];
		for (const node of nodes)
			ids = [...ids, node.id, ...concat(node.children)];
		return ids;
	}

	const sortedIds = concat(nodes);

	return sortedIds;
}

const dataSet = 'groups';
const getSuccess2 = createAction<Group[]>(dataSet + "/getSuccess2");

const initialState: {
	workingGroupId: string | null;
} = {
	workingGroupId: null,
}

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState,
	reducers: {
		setWorkingGroupId(state, action: PayloadAction<string | null>) {
			state.workingGroupId = action.payload;
		},
	},
	extraReducers: (builder, dataAdapter) => {
		builder
		.addMatcher(
			(action: Action) => action.type === getSuccess2,
			(state, action: PayloadAction<Group[]>) => {
				dataAdapter.addMany(state, action.payload);
				state.loading = false;
				state.valid = true;
				const {ids, entities} = state;
				const sortedIds = treeSortedIds(ids, entities);
				if (sortedIds.join() !== ids.join())
					state.ids = sortedIds;
			}
		)
	}
});

export default slice;

/*
 * Selectors
 */
export const selectGroupsState = (state: RootState) => state[dataSet];
export const selectGroupEntities = (state: RootState) => selectGroupsState(state).entities;
export const selectGroupIds = (state: RootState) => selectGroupsState(state).ids;

export const selectWorkingGroups = (state: RootState) => {
	const {ids, entities} = selectGroupsState(state);
	return ids.map(id => entities[id]!).filter(g => ["c", "wg"].includes(g.type));
}
export const selectWorkingGroupId = (state: RootState) => selectGroupsState(state).workingGroupId;
export const selectWorkingGroup = (state: RootState) => {
	const {workingGroupId, entities} = selectGroupsState(state);
	return (workingGroupId && entities[workingGroupId]) || undefined;
}
export const selectWorkingGroupName = (state: RootState) => selectWorkingGroup(state)?.name || '*';

export const selectGroups = createSelector(
	selectGroupIds,
	selectGroupEntities,
	selectWorkingGroupId,
	(ids, entities, workingGroupId) => {
		const groups = ids.map(id => entities[id]!).filter(group => group.id === workingGroupId || group.parent_id === workingGroupId);
		console.log(workingGroupId, ids.length)
		return groups;
	}
);

export const groupsSelectors = getAppTableDataSelectors(selectGroupsState);

/*
 * Actions
 */
export const groupsActions = slice.actions;

const {
	getPending,
	getFailure,
	addOne,
	addMany,
	updateOne,
	updateMany,
	removeOne,
	removeMany,
	setSelected,
	setFilter,
	clearFilter,
	setWorkingGroupId: setWorkingGroupIdLocal
} = slice.actions;

export {setSelected, setFilter, clearFilter};

const baseUrl = '/api/groups';

export const setWorkingGroupId = (workingGroupId: string | null): AppThunk<Group | undefined> =>
	async (dispatch, getState) => {
			dispatch(setWorkingGroupIdLocal(workingGroupId));
			return selectWorkingGroup(getState());
	}

function validGroup(group: any): group is Group {
	const isGood = isObject(group) &&
		group.id && typeof group.id === 'string' &&
		(group.parent_id === null || typeof group.parent_id === 'string') &&
		typeof group.name === 'string' &&
		(group.symbol === null || typeof group.symbol === 'string') &&
		(group.color === null || typeof group.color === 'string');
	if (!isGood)
		console.log(group)
	return isGood;
}

function validResponse(response: any): response is Group[] {
	return Array.isArray(response) && response.every(validGroup);
}

type LoadGroupContstraints = {
	type?: GroupType | GroupType[];
	parent_id?: string;
}

export const loadGroups = (constraints?: LoadGroupContstraints): AppThunk => 
	(dispatch) => {
		dispatch(getPending());
		return fetcher.get(baseUrl, constraints)
			.then((response: any) => {
				if (!validResponse(response))
					throw new TypeError("Unexpected response");
				dispatch(getSuccess2(response));
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError('Unable to get groups', error));
			});
	}

export const initGroups = (): AppThunk =>
	(dispatch, getState) => {
		dispatch(loadGroups({type: ["c", "wg"]}));
		const workingGroupId = selectWorkingGroupId(getState());
		if (workingGroupId)
			dispatch(loadGroups({parent_id: workingGroupId}));
		return Promise.resolve();
	}

export const addGroup = (group: GroupCreate): AppThunk<Group> => 
	(dispatch) => {
		if (!group.id)
			group = {...group, id: uuid()};
		dispatch(addOne(group as Group));
		return fetcher.post(baseUrl, [group])
			.then((response: any) => {
				if (!validResponse(response) || response.length !== 1)
					throw new TypeError(`Unexpected response to POST ${baseUrl}`);
				const group: Group = response[0];
				dispatch(updateOne({id: group.id, changes: group}));
				return group;
			})
			.catch((error: any) => {
				dispatch(setError('Unable to add group', error));
				dispatch(removeOne(group.id!));
			});
	}

interface Update<T> {
	id: EntityId;
	changes: Partial<T>;
}

export const updateGroups = (updates: Update<Group>[]): AppThunk => 
	(dispatch, getState) => {
		const {entities} = selectGroupsState(getState());
		const originals = updates.map(u => entities[u.id]!);
		dispatch(updateMany(updates));
		return fetcher.patch(baseUrl, updates)
			.then((response: any) => {
				if (!validResponse(response))
					throw new TypeError("Unexpected response");
				dispatch(updateMany(response.map(e => ({id: e.id, changes: e}))));
			})
			.catch((error: any) => {
				dispatch(setError('Unable to update groups', error));
				dispatch(updateMany(originals.map(e => ({id: e.id, changes: e}))));
			});
	}

export const deleteGroups = (ids: EntityId[]): AppThunk =>
	(dispatch, getState) => {
		const {entities} = selectGroupsState(getState());
		const originals = ids.map(id => entities[id]!);
		dispatch(removeMany(ids));
		return fetcher.delete(baseUrl, ids)
			.catch((error: any) => {
				dispatch(setError('Unable to delete group', error));
				dispatch(addMany(originals));
			});
	}