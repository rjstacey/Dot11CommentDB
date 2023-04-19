import { createSlice, createEntityAdapter } from '@reduxjs/toolkit';

import type { RootState, AppThunk } from '.';

import {fetcher, setError} from 'dot11-components';

export type WebexTemplate = {
	id: string;
	isDefault: boolean;
}

export interface WebexAccount {
	id: number;
	name: string;
	groups: string[];
	templates: WebexTemplate[];
}

const dataAdapter = createEntityAdapter<WebexAccount>({});

export const dataSet = 'webexAccounts';


const initialState = dataAdapter.getInitialState({
	valid: false,
	loading: false,
});

export type WebexAccountsState = typeof initialState;

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
		updateOne(state, action) {
			dataAdapter.updateOne(state, action.payload);
		},
		addOne(state, action) {
			dataAdapter.addOne(state, action.payload);
		},
		removeOne(state, action) {
			dataAdapter.removeOne(state, action.payload);
		},
	},
});

export default slice;

/*
 * Selector
 */
export const selectWebexAccountsState = (state: RootState) => state[dataSet];
export const selectWebexAccountEntities = (state: RootState) => selectWebexAccountsState(state).entities;

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

const baseUrl = '/api/webex/accounts';

export const loadWebexAccounts = (): AppThunk => 
	async (dispatch) => {
		dispatch(getPending());
		let response;
		try {
			response = await fetcher.get(baseUrl);
			if (!Array.isArray(response))
				throw new TypeError(`Unexpected response to GET ${baseUrl}`);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get list of webex accounts', error));
			return;
		}
		await dispatch(getSuccess(response));
	}

export const updateWebexAccount = (id: number, changes: object): AppThunk =>
	async (dispatch) => {
		dispatch(updateOne({id, changes}));
		const url = `${baseUrl}/${id}`;
		let updates;
		try {
			updates = await fetcher.patch(url, changes);
			if (typeof updates !== 'object')
				throw new TypeError('Unexpected response to PATCH ' + url);
		}
		catch (error: any) {
			dispatch(setError(`Unable to update webex account`, error));
			return;
		}
		dispatch(updateOne({id, updates}));
	}

export const addWebexAccount = (account: WebexAccount): AppThunk =>
	async (dispatch) => {
		let newAccount;
		try {
			newAccount = await fetcher.post(baseUrl, account);
			if (typeof newAccount !== 'object')
				throw new TypeError('Unexpected response to POST ' + baseUrl);
		}
		catch (error: any) {
			await dispatch(setError('Unable to add webex account', error));
			return;
		}
		dispatch(addOne(newAccount));
	}

export const deleteWebexAccount = (id: number): AppThunk =>
	async (dispatch) => {
		dispatch(removeOne(id));
		try {
			const url = `${baseUrl}/${id}`;
			await fetcher.delete(url);
		}
		catch (error: any) {
			dispatch(setError(`Unable to delete webex account`, error));
		}
	}
