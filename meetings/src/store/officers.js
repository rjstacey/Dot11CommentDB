import {createSlice, createEntityAdapter, createSelector} from '@reduxjs/toolkit';
import {v4 as uuid} from 'uuid';

import {fetcher} from 'dot11-components/lib';
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

export default slice;

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
const url = '/api/officers';

const {
	getPending,
	getSuccess,
	getFailure,
	addOne,
	updateOne,
	removeOne
} = slice.actions;

export const loadOfficers = () => 
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

export const addOfficer = (officer) => 
	(dispatch, getState) => {
		if (!officer.id)
			officer = {...officer, id: uuid()};
		dispatch(addOne(officer));
		fetcher.post(url, [officer])
			.then(entities => {
				if (!Array.isArray(entities) || entities.length !== 1)
					throw new TypeError(`Unexpected response to POST ${url}`);
				const officer = entities[0];
				dispatch(updateOne({id: officer.id, changes: officer}));
			})
			.catch(error => {
				dispatch(setError('Unable to add officer', error));
				dispatch(removeOne(officer.id));
			});
		return officer;
	}

export const updateOfficer = (update) => 
	(dispatch, getState) => {
		const {entities} = selectOfficersState(getState());
		const original = entities[update.id];
		dispatch(updateOne(update));
		fetcher.patch(url, [update])
			.then(entities => {
				if (!Array.isArray(entities) || entities.length !== 1)
					throw new TypeError(`Unexpected response to POST ${url}`);
				const officer = entities[0];
				dispatch(updateOne({id: update.id, changes: officer}));
			})
			.catch(error => {
				dispatch(setError('Unable to update officer', error));
				if (original)
					dispatch(updateOne({id: update.id, changes: original}));
			});
	}

export const deleteOfficer = (id) =>
	(dispatch, getState) => {
		const {entities} = selectOfficersState(getState());
		const original = entities[id];
		dispatch(removeOne(id));
		fetcher.delete(url, [id])
			.catch(error => {
				dispatch(setError('Unable to delete officer', error));
				if (original)
					dispatch(addOne(original));
			});
	}
