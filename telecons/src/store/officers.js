import {createSlice, createEntityAdapter, createSelector} from '@reduxjs/toolkit';
import { v4 as uuid } from 'uuid';

import fetcher from 'dot11-components/lib/fetcher';
import {setError} from 'dot11-components/store/error';

const dataAdapter = createEntityAdapter({});

export const dataSet = 'officers';

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
export const selectOfficersState = (state) => state[dataSet];

export function selectGroupOfficers(state, group_id) {
	const {ids, entities} = state;
	return ids
		.filter(id => entities[id].group_id === group_id)
		.map(id => entities[id]);
}

export const createGroupOfficersSelector = (state, group_id) => createSelector(
	selectOfficersState,
	() => group_id,
	selectGroupOfficers
);

/*
 * Actions
 */
const {getPending, getSuccess, getFailure, addOne} = slice.actions;

export const loadOfficers2 = () => 
	async (dispatch, getState) => {
		dispatch(getPending());
		const url = '/api/officers';
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

export const loadOfficers = () => {
	const entities = [
		{id: 1, sapin: 5073, group_id: 3, position: 'Chair'},
		{id: 2, sapin: 2044, group_id: 3, position: 'Vice chair'},
		{id: 3, sapin: 2044, group_id: 3, position: 'Vice chair'},
		{id: 4, sapin: 2044, group_id: 4, position: 'Chair'},
		{id: 5, sapin: 2044, group_id: 4, position: 'Vice chair'},
	];
	return {type: slice.actions.getSuccess.toString(), payload: entities};
}

export const addOfficer = (officer) => {
	if (!officer.id)
		officer = {...officer, id: uuid()};
	return addOne(officer);
}
