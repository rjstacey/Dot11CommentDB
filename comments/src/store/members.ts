import {createSlice, createEntityAdapter, createSelector} from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { fetcher, isObject, setError } from 'dot11-components';
import type { RootState, AppThunk } from '.';
import { selectWorkingGroupName } from './groups';

export type UserMember = {
	SAPIN: number;
	Name: string;
	Status: string;
	Email?: string;
}

const selectId = (user: UserMember) => user.SAPIN;
const dataAdapter = createEntityAdapter({selectId});
const dataSet = 'members';
const slice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		valid: false,
		loading: false,
	}),
	reducers: {
		getPending(state) {
			state.loading = true;
		},
  		getSuccess(state, action: PayloadAction<UserMember[]>) {
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, action.payload);
		},
		getFailure(state) {
			state.loading = false;
		},
		clear(state) {
			dataAdapter.removeAll(state);
			state.valid = false;
		}
	},
});

export default slice;

/*
 * Selectors
 */
export const selectMembersState = (state: RootState) => state[dataSet];
export const selectMemberIds = (state: RootState) => selectMembersState(state).ids;
export const selectMemberEntities = (state: RootState) => selectMembersState(state).entities;
export const selectMembers = createSelector(
	selectMemberIds,
	selectMemberEntities,
	(ids, entities) => ids.map(id => entities[id]!)
)

 /*
  * Actions
  */
const {getPending, getSuccess, getFailure, clear} = slice.actions;

function validUser(user: any): user is UserMember {
	return isObject(user) &&
		typeof user.SAPIN === 'number' &&
		typeof user.Name === 'string' &&
		typeof user.Status === 'string';
}

function validResponse(response: any): response is UserMember[] {
	return Array.isArray(response) && response.every(validUser);
}

let loadPromise: Promise<void> | null = null;
export const loadMembers = (): AppThunk =>
	async (dispatch, getState) => {
		if (loadPromise)
			return loadPromise;
		dispatch(getPending());
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/users`;
		loadPromise = (fetcher.get(url) as Promise<void>)
			.then((response: any) => {
				if (!validResponse(response))
					throw new TypeError("Unexpected response");
				dispatch(getSuccess(response));
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError('Unable to get users list', error));
			})
			.finally(() => {
				loadPromise = null;
			});
		return loadPromise;
	}

export const getMembers = (): AppThunk =>
	async (dispatch, getState) => {
		const {valid, loading} = selectMembersState(getState());
		if (!valid || loading)
			return dispatch(loadMembers());
		return Promise.resolve();
	}

export const clearMembers = (): AppThunk =>
	async (dispatch) => {
		dispatch(clear())
	}

export const initMembers = loadMembers;
