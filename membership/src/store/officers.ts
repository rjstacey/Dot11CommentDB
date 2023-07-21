import { createSlice, createEntityAdapter, createSelector } from '@reduxjs/toolkit';
import type { EntityId } from '@reduxjs/toolkit';

import { v4 as uuid } from 'uuid';
import type { RootState, AppThunk } from '.';

import { fetcher, setError } from 'dot11-components';
import { selectWorkingGroupName } from './groups';

export type OfficerId = string;
export type Officer = {
	id: OfficerId;
	sapin: number;
	position: string;
	group_id: string;
};
export type OfficerCreate = Omit<Officer, "id"> & Partial<Pick<Officer, "id">>;
export type OfficerUpdate = {
	id: OfficerId;
	changes: Partial<Officer>;
}

const dataAdapter = createEntityAdapter<Officer>({});
const initialState = dataAdapter.getInitialState({
	valid: false,
	loading: false,
});

export type OfficersState = typeof initialState;

const dataSet = 'officers';
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
		addMany: dataAdapter.addMany,
		updateMany: dataAdapter.updateMany,
		removeMany: dataAdapter.removeMany,
		setMany: dataAdapter.setMany
	},
});

export default slice;

/*
 * Selectors
 */
export const selectOfficersState = (state: RootState) => state[dataSet];
const selectOfficerEntities = (state: RootState) => selectOfficersState(state).entities;

export function selectGroupOfficers(state: OfficersState, group_id: EntityId) {
	const {ids, entities} = state;
	return ids
		.map(id => entities[id]!)
		.filter(g => g.group_id === group_id)
}

export const createGroupOfficersSelector = (state: RootState, group_id: EntityId) => createSelector(
	selectOfficersState,
	() => group_id,
	selectGroupOfficers
);

/*
 * Actions
 */
const {
	getPending,
	getSuccess,
	getFailure,
	addMany,
	updateMany,
	removeMany,
	setMany
} = slice.actions;

export const loadOfficers = (): AppThunk => 
	(dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/officers`;
		dispatch(getPending());
		return fetcher.get(url)
			.then((officers: any) => {
				if (!Array.isArray(officers))
					throw new TypeError(`Unexpected response to GET ${url}`);
				dispatch(getSuccess(officers));
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError('Unable to get groups', error));
			});
	}

export const addOfficers = (officers: OfficerCreate[]): AppThunk => 
	(dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/officers`;
		const newOfficers = officers.map<Officer>(officer => (officer.id? officer: {...officer, id: uuid()}) as Officer);
		dispatch(addMany(newOfficers));
		//dispatch(addGroupOfficer(officer.group_id, officer.sapin));
		return fetcher.post(url, newOfficers)
			.then((entities: any) => {
				if (!Array.isArray(entities) || entities.length !== newOfficers.length)
					throw new TypeError(`Unexpected response to POST ${url}`);
			})
			.catch((error: any) => {
				dispatch(setError('Unable to add officer', error));
				dispatch(removeMany(newOfficers.map(o => o.id)));
				//dispatch(removeGroupOfficer(officer.group_id, officer.sapin));
			});
	}

export const updateOfficers = (updates: OfficerUpdate[]): AppThunk => 
	(dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/officers`;
		const entities = selectOfficerEntities(getState());
		const originals = updates.map(u => entities[u.id]!);
		dispatch(updateMany(updates));
		return fetcher.patch(url, updates)
			.then((entities: any) => {
				if (!Array.isArray(entities) || entities.length !== updates.length)
					throw new TypeError(`Unexpected response to POST ${url}`);
			})
			.catch((error: any) => {
				dispatch(setError('Unable to update officer', error));
				dispatch(setMany(originals));
			});
	}

export const deleteOfficers = (ids: EntityId[]): AppThunk =>
	(dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/officers`;
		const entities = selectOfficerEntities(getState());
		const originals = ids.map(id => entities[id]!);
		dispatch(removeMany(ids));
		//dispatch(removeGroupOfficer(original.group_id, original.sapin));
		return fetcher.delete(url, ids)
			.catch((error: any) => {
				dispatch(setError('Unable to delete officer', error));
				dispatch(addMany(originals));
				//dispatch(addGroupOfficer(original.group_id, original.sapin));
			});
	}
