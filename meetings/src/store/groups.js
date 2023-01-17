import {createSelector} from '@reduxjs/toolkit';
import { v4 as uuid } from 'uuid';

import {createAppTableDataSlice, setPanelIsSplit, selectCurrentPanelConfig} from 'dot11-components/store/appTableData';

import {fetcher} from 'dot11-components/lib';
import {setError} from 'dot11-components/store/error';

import {selectCurrentGroupId} from './current';

const GroupType = {
	c: 'Committee',
	wg: 'Working Group',
	sg: 'Study Group',
	tg: 'Task Group',
	sc: 'Standing Committee',
	ah: 'Ad-hoc Group'
};

export const GroupTypeOptions = Object.entries(GroupType).map(([value, label]) => ({value, label}));

export const GroupStatusOptions = [
	{value: 0, label: 'Inactive'},
	{value: 1, label: 'Active'}
];

export const fields = {
	id: {},
	parent_id: {},
	name: {label: 'Group'},
	type: {label: 'Type', dataRenderer: v => GroupType[v]},
	status: {label: 'Status', dataRenderer: v => v? 'Active': 'Inactive'},
	symbol: {label: 'Committee'},
};


function treeSortedIds(ids, entities) {

	function compare(n1, n2) {
		const g1 = entities[n1.id];
		const g2 = entities[n2.id];
		const keys = Object.keys(GroupType);
		let cmp = keys.indexOf(g1.type) - keys.indexOf(g2.type);
		if (cmp === 0)
			cmp = g1.name.localeCompare(g2.name);
		return cmp;
	}

	function findChildren(parent_id) {
		const nodes = [];
		for (const id of ids) {
			if (entities[id].parent_id === parent_id) {
				const children = findChildren(id).sort(compare);
				nodes.push({id, children});
			}
		}
		return nodes;
	}

	const nodes = findChildren(null);

	function concat(nodes) {
		let ids = [];
		for (const node of nodes)
			ids = [...ids, node.id, ...concat(node.children)];
		return ids;
	}
	const sortedIds = concat(nodes);

	return sortedIds;
}

export const dataSet = 'groups';

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	extraReducers: (builder, dataAdapter) => {
		builder
		.addMatcher(
			(action) => action.type === (dataSet + '/getSuccess'),
			(state, action) => {
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
export const selectGroupsPanelConfig = (state) => selectCurrentPanelConfig(state, dataSet);
export const selectGroupsState = (state) => state[dataSet];
export const selectGroupEntities = (state) => selectGroupsState(state).entities;

export const selectCurrentGroup = createSelector(
	selectCurrentGroupId,
	selectGroupEntities,
	(groupId, entities) => entities[groupId]
);

export const selectGroupName = (state) => {
	const group = selectCurrentGroup(state);
	return group? group.name: '';
}

/* Produces an array of {node: {}, children: array of <node>} */
export const selectGroupHierarchy = createSelector(
	selectGroupsState,
	state => {
		const {ids, entities} = state;

		function findChildren(parent_id) {
			const nodes = [];
			for (const id of ids) {
				const node = entities[id];
				if (node.parent_id === parent_id)
					nodes.push({...node, children: findChildren(id)});
			}
			return nodes;
		}

		return findChildren(null);
	}
);

/*
 * Actions
 */
export const setGroupsPanelIsSplit = (value) => setPanelIsSplit(dataSet, undefined, value);

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
} = slice.actions;

export {setSelected};

const url = '/api/groups';

export const loadGroups = () => 
	(dispatch, getState) => {
		dispatch(getPending());
		fetcher.get(url)
			.then(entities => {
				if (!Array.isArray(entities))
					throw new TypeError(`Unexpected response to GET ${url}`);
				dispatch(getSuccess(entities));
			})
			.catch(error => {
				dispatch(getFailure());
				dispatch(setError('Unable to get groups', error));
			});
	}

export const addGroup = (group) => 
	(dispatch, getState) => {
		if (!group.id)
			group = {...group, id: uuid()};
		dispatch(addOne(group));
		fetcher.post(url, [group])
			.then(entities => {
				if (!Array.isArray(entities) || entities.length !== 1)
					throw new TypeError(`Unexpected response to POST ${url}`);
				const group = entities[0];
				dispatch(updateOne({id: group.id, changes: group}));
			})
			.catch(error => {
				dispatch(setError('Unable to add group', error));
				dispatch(removeOne(group.id));
			});
		return group;
	}

export const updateGroups = (updates) => 
	(dispatch, getState) => {
		const {entities} = selectGroupsState(getState());
		const originals = updates.map(u => entities[u.id]);
		dispatch(updateMany(updates));
		fetcher.put(url, updates)
			.then(entities => {
				if (!Array.isArray(entities))
					throw new TypeError(`Unexpected response to POST ${url}`);
				dispatch(updateMany(entities.map(e => ({id: e.id, changes: e}))));
			})
			.catch(error => {
				dispatch(setError('Unable to update groups', error));
				dispatch(updateMany(originals.map(e => ({id: e.id, changes: e}))));
			});
	}

export const deleteGroups = (ids) =>
	(dispatch, getState) => {
		const {entities} = selectGroupsState(getState());
		const originals = ids.map(id => entities[id]);
		dispatch(removeMany(ids));
		fetcher.delete(url, ids)
			.catch(error => {
				dispatch(setError('Unable to delete group', error));
				dispatch(addMany(originals));
			});
	}