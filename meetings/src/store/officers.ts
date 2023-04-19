import { createSlice, createEntityAdapter, createSelector } from '@reduxjs/toolkit';
import type { EntityId } from '@reduxjs/toolkit';

// @ts-ignore
import { v4 as uuid } from 'uuid';
import type { RootState, AppThunk } from '.';

import { fetcher, setError } from 'dot11-components';

export type OfficerId = string;
export type Officer = {
	id: OfficerId;
	sapin: number;
	position: string;
	group_id: string;
};

const dataAdapter = createEntityAdapter<Officer>({});
const initialState = dataAdapter.getInitialState({
	valid: false,
	loading: false,
});

export type OfficersState = typeof initialState;

export const dataSet = 'officers';

const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		getPending(state) {
			state.loading = true;
		},
  		getSuccess(state, action) {
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, action.payload);
		},
		getFailure(state) {
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
export const selectOfficersState = (state: RootState) => state[dataSet];

export function selectGroupOfficers(state: OfficersState, group_id: EntityId) {
	const {ids, entities} = state;
	return ids
		.filter(id => entities[id]!.group_id === group_id)
		.map(id => entities[id]!);
}

export const createGroupOfficersSelector = (state: RootState, group_id: EntityId) => createSelector(
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

export const loadOfficers = (): AppThunk => 
	(dispatch) => {
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

export const addOfficer = (officer: Officer): AppThunk => 
	(dispatch) => {
		if (!officer.id)
			officer = {...officer, id: uuid()};
		dispatch(addOne(officer));
		return fetcher.post(url, [officer])
			.then((entities: any) => {
				if (!Array.isArray(entities) || entities.length !== 1)
					throw new TypeError(`Unexpected response to POST ${url}`);
				const officer = entities[0];
				dispatch(updateOne({id: officer.id, changes: officer}));
				return officer;
			})
			.catch((error: any) => {
				dispatch(setError('Unable to add officer', error));
				dispatch(removeOne(officer.id));
			});
	}

interface Update<T> {
	id: number | string;
	changes: Partial<T>;
};

export const updateOfficer = (update: Update<Officer>): AppThunk => 
	(dispatch, getState) => {
		const {entities} = selectOfficersState(getState());
		const original = entities[update.id];
		dispatch(updateOne(update));
		return fetcher.patch(url, [update])
			.then((entities: any) => {
				if (!Array.isArray(entities) || entities.length !== 1)
					throw new TypeError(`Unexpected response to POST ${url}`);
				const officer = entities[0];
				dispatch(updateOne({id: update.id, changes: officer}));
			})
			.catch((error: any) => {
				dispatch(setError('Unable to update officer', error));
				if (original)
					dispatch(updateOne({id: update.id, changes: original}));
			});
	}

export const deleteOfficer = (id: EntityId): AppThunk =>
	(dispatch, getState) => {
		const {entities} = selectOfficersState(getState());
		const original = entities[id];
		dispatch(removeOne(id));
		return fetcher.delete(url, [id])
			.catch((error: any) => {
				dispatch(setError('Unable to delete officer', error));
				if (original)
					dispatch(addOne(original));
			});
	}
