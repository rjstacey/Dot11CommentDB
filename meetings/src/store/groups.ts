import { EntityId, createSelector } from '@reduxjs/toolkit';
import type { Action } from '@reduxjs/toolkit';

import { v4 as uuid } from 'uuid';

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	AppTableDataState,
	getAppTableDataSelectors
} from 'dot11-components';

import type { RootState, AppThunk } from '.';

import {selectCurrentGroupId} from './current';

const GroupType = {
	c: 'Committee',
	wg: 'Working Group',
	sg: 'Study Group',
	tg: 'Task Group',
	sc: 'Standing Committee',
	ah: 'Ad-hoc Group'
};

export type GroupType = keyof typeof GroupType;

export const GroupTypeOptions = Object.entries(GroupType).map(([value, label]) => ({value, label} as {value: GroupType; label: string}));

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
	children?: Group[];
};

export type GroupCreate = Omit<Group, "id" | "children"> & { id?: string };

export const fields = {
	id: {},
	parent_id: {},
	name: {label: 'Group'},
	type: {label: 'Type', dataRenderer: (v: keyof typeof GroupType) => GroupType[v]},
	status: {label: 'Status', dataRenderer: (v: number) => v? 'Active': 'Inactive'},
	symbol: {label: 'Committee'},
};

interface Node {
	id: string;
	children: Array<Node>;
}

function treeSortedIds(ids: Array<string>, entities: { [index: string]: Group }) {

	function compare(n1: Node, n2: Node) {
		const g1 = entities[n1.id];
		const g2 = entities[n2.id];
		const keys = Object.keys(GroupType);
		let cmp = keys.indexOf(g1.type || '') - keys.indexOf(g2.type || '');
		if (cmp === 0)
			cmp = g1.name.localeCompare(g2.name);
		return cmp;
	}
	
	function findChildren(parent_id: string | null): Array<Node> {
		const nodes: Array<Node> = [];
		for (const id of ids) {
			if (entities[id].parent_id === parent_id) {
				const children = findChildren(id).sort(compare);
				nodes.push({id, children});
			}
		}
		return nodes;
	}

	const nodes = findChildren(null);

	function concat(nodes: Array<Node>) {
		let ids: string[] = [];
		for (const node of nodes)
			ids = [...ids, node.id, ...concat(node.children)];
		return ids;
	}
	const sortedIds = concat(nodes);

	return sortedIds;
}

export const dataSet = 'groups';

type GroupsState = AppTableDataState<Group>;

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState: {},
	reducers: {},
	extraReducers: (builder: any) => {
		builder
		.addMatcher(
			(action: Action) => action.type === (dataSet + '/getSuccess'),
			(state: any) => {
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
//export const selectGroupsPanelConfig = (state: RootState) => selectCurrentPanelConfig(state, dataSet);
export const selectGroupsState = (state: RootState) => state[dataSet] as GroupsState;
export const selectGroupEntities = (state: RootState) => selectGroupsState(state).entities;

export const selectCurrentGroup = createSelector(
	selectCurrentGroupId,
	selectGroupEntities,
	(groupId, entities) => groupId? entities[groupId]: undefined
);

export const selectGroupName = (state: RootState) => {
	const group = selectCurrentGroup(state);
	return group? group.name: '';
}

/* Produces an array of {node: {}, children: array of <node>} */
export const selectGroupHierarchy = createSelector(
	selectGroupsState,
	state => {
		const {ids, entities} = state;

		function findChildren(parent_id: EntityId | null): Array<Node> {
			const nodes: Array<Node> = [];
			for (const id of ids) {
				const node = entities[id]!;
				if (node.parent_id === parent_id)
					nodes.push({...node, children: findChildren(id)});
			}
			return nodes;
		}

		return findChildren(null);
	}
);

export const groupsSelectors = getAppTableDataSelectors(selectGroupsState);

/*
 * Actions
 */
//export const setGroupsPanelIsSplit = (value: boolean) => setPanelIsSplit(dataSet, undefined, value);

export const groupsActions = slice.actions;

const {
	getPending,
	getSuccess,
	getFailure,
	addOne,
	addMany,
	updateOne,
	updateMany,
	removeOne,
	removeMany,
	setSelected,
	setFilter,
	clearFilter
} = slice.actions;

export {setSelected, setFilter, clearFilter};

const url = '/api/groups';

export const loadGroups = (): AppThunk => 
	(dispatch, getState) => {
		dispatch(getPending());
		return fetcher.get(url)
			.then((entities: any) => {
				if (!Array.isArray(entities))
					throw new TypeError(`Unexpected response to GET ${url}`);
				dispatch(getSuccess(entities));
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError('Unable to get groups', error));
			});
	}

export const addGroup = (group: GroupCreate): AppThunk<Group> => 
	(dispatch, getState) => {
		if (!group.id)
			group = {...group, id: uuid()};
		dispatch(addOne(group));
		return fetcher.post(url, [group])
			.then((entities: unknown) => {
				if (!Array.isArray(entities) || entities.length !== 1)
					throw new TypeError(`Unexpected response to POST ${url}`);
				const group: Group = entities[0];
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
		return fetcher.put(url, updates)
			.then((entities: Group[]) => {
				if (!Array.isArray(entities))
					throw new TypeError(`Unexpected response to POST ${url}`);
				dispatch(updateMany(entities.map(e => ({id: e.id, changes: e}))));
			})
			.catch((error: any) => {
				dispatch(setError('Unable to update groups', error));
				dispatch(updateMany(originals.map(e => ({id: e.id, changes: e}))));
			});
	}

export const deleteGroups = (ids: EntityId[]): AppThunk =>
	(dispatch, getState) => {
		const {entities} = selectGroupsState(getState());
		const originals = ids.map(id => entities[id]);
		dispatch(removeMany(ids));
		return fetcher.delete(url, ids)
			.catch((error: any) => {
				dispatch(setError('Unable to delete group', error));
				dispatch(addMany(originals));
			});
	}