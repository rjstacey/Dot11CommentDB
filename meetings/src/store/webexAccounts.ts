import { createSlice, createEntityAdapter, createSelector } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { fetcher, isObject, setError } from 'dot11-components';

import type { RootState, AppThunk } from '.';
import { selectWorkingGroupName } from './groups';

export type WebexTemplate = {
	id: string;
	isDefault: boolean;
}

export interface WebexAccount {
	id: number;
	name: string;
	groupId: string;
	authDate?: string;
	authUrl: string;
	authUserId?: number;
	displayName?: string;
	userName?: string;
	templates: WebexTemplate[];
}

export type WebexAccountCreate = {
	name: string;
	groups: string[];
}

const dataAdapter = createEntityAdapter<WebexAccount>({});

const initialState = dataAdapter.getInitialState({
	valid: false,
	loading: false,
});

export type WebexAccountsState = typeof initialState;

const dataSet = 'webexAccounts';
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		getPending(state) {
			state.loading = true;
		},
  		getSuccess(state, action: PayloadAction<WebexAccount[]>) {
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, action.payload);
		},
		getFailure(state) {
			state.loading = false;
		},
		updateOne: dataAdapter.updateOne,
		addOne: dataAdapter.addOne,
		removeOne: dataAdapter.removeOne,
	},
});

export default slice;

/*
 * Selector
 */
export const selectWebexAccountsState = (state: RootState) => state[dataSet];
export const selectWebexAccountIds = (state: RootState) => selectWebexAccountsState(state).ids;
export const selectWebexAccountEntities = (state: RootState) => selectWebexAccountsState(state).entities;
export const selectWebexAccounts = createSelector(
	selectWebexAccountIds,
	selectWebexAccountEntities,
	(ids, entities) => ids.map(id => entities[id]!)
);

/*
 * Actions
 */
const {
	getPending,
	getSuccess,
	getFailure,
	updateOne,
	addOne,
	removeOne,
} = slice.actions;

function validWebexAccount(account: any): account is WebexAccount {
	return isObject(account) &&
		typeof account.id === 'number' &&
		typeof account.name === 'string' &&
		typeof account.groupId === 'string';
}

function validGetResponse(response: any): response is WebexAccount[] {
	return Array.isArray(response) && response.every(validWebexAccount);
}

export const loadWebexAccounts = (): AppThunk => 
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		if (!groupName)
			return;
		const url = `/api/${groupName}/webex/accounts`;
		dispatch(getPending());
		let response: any;
		try {
			response = await fetcher.get(url);
			if (!validGetResponse(response))
				throw new TypeError("Unexpected response to GET");
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get list of webex accounts', error));
			return;
		}
		dispatch(getSuccess(response));
	}

export const updateWebexAccount = (id: number, changes: Partial<WebexAccount>): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/webex/accounts/${id}`;
		dispatch(updateOne({id, changes}));
		let response: any;
		try {
			response = await fetcher.patch(url, changes);
			if (!validWebexAccount(response))
				throw new TypeError('Unexpected response to PATCH');
		}
		catch (error: any) {
			dispatch(setError('Unable to update webex account', error));
			return;
		}
		dispatch(updateOne({id, changes: response}));
	}

export const addWebexAccount = (account: WebexAccountCreate): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/webex/accounts`;
		let response;
		try {
			response = await fetcher.post(url, account);
			if (!validWebexAccount(response))
				throw new TypeError('Unexpected response to POST');
		}
		catch (error: any) {
			dispatch(setError('Unable to add webex account', error));
			return;
		}
		dispatch(addOne(response));
	}

export const deleteWebexAccount = (id: number): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWorkingGroupName(getState());
		const url = `/api/${groupName}/webex/accounts/${id}`;
		dispatch(removeOne(id));
		try {
			await fetcher.delete(url);
		}
		catch (error: any) {
			dispatch(setError('Unable to delete webex account', error));
		}
	}
