import {createSlice, createEntityAdapter, createSelector} from '@reduxjs/toolkit';
import { v4 as uuid } from 'uuid';

import fetcher from 'dot11-components/lib/fetcher';
import {setError} from 'dot11-components/store/error';

const dataAdapter = createEntityAdapter({});

export const dataSet = 'groups';

const slice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		valid: false,
		loading: false,
	}),
	reducers: {
		getPending(state, action) {
			state.loading = true;
		},
  		getSuccess(state, action) {
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, action.payload);
		},
		getFailure(state, action) {
			state.loading = false;
		},
		updateOne: dataAdapter.updateOne,
		addOne: dataAdapter.addOne,
		removeOne: dataAdapter.removeOne
	},
});

/*
 * Reducer
 */
export default slice.reducer;

/*
 * Selectors
 */
export const selectGroupsState = (state) => state[dataSet];

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
const {getPending, getSuccess, getFailure, addOne, updateOne, removeOne} = slice.actions;

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

export const updateGroup = (update) => 
	(dispatch, getState) => {
		const {entities} = selectGroupsState(getState());
		const original = entities[update.id];
		dispatch(updateOne(update));
		fetcher.put(url, [update])
			.then(entities => {
				if (!Array.isArray(entities) || entities.length !== 1)
					throw new TypeError(`Unexpected response to POST ${url}`);
				const group = entities[0];
				dispatch(updateOne({id: group.id, changes: group}));
			})
			.catch(error => {
				dispatch(setError('Unable to update group', error));
				if (original)
					dispatch(updateOne({id: update.id, changes: original}));
			});
	}

export const deleteGroup = (id) =>
	(dispatch, getState) => {
		const {entities} = selectGroupsState(getState());
		const original = entities[id];
		dispatch(removeOne(id));
		fetcher.delete(url, [id])
			.catch(error => {
				dispatch(setError('Unable to delete group', error));
				if (original)
					dispatch(addOne(original));
			});
	}