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
					nodes.push({node, children: findChildren(id)});
			}
			return nodes;
		}

		return findChildren(null);
	}
);

/*
 * Actions
 */
const {getPending, getSuccess, getFailure, addOne} = slice.actions;

export const loadGroups1 = () => 
	async (dispatch, getState) => {
		dispatch(getPending());
		const url = '/api/groups';
		let entities;
		try {
			entities = await fetcher.get(url);
			if (!Array.isArray(entities))
				throw new TypeError(`Unexpected response to GET ${url}`);
		}
		catch(error) {
			await dispatch(getFailure());
			await dispatch(setError('Unable to get groups', error));
			return;
		}
		await dispatch(getSuccess(entities));
	}

export const loadGroups = () => {
	const groups = [
		{id: 1, name: '802', parent_id: null},
		{id: 2, name: '802.1', parent_id: 1},
		{id: 3, name: '802.11', parent_id: 1},
		{id: 4, name: 'TGbb', parent_id: 3},
		{id: 5, name: 'TGbc', parent_id: 3},
		{id: 6, name: 'TGbd', parent_id: 3}
	];
	return {type: slice.actions.getSuccess.toString(), payload: groups};
}

export const addGroup = (group) => {
	if (!group.id)
		group = {...group, id: uuid()};
	return addOne(group);
}
