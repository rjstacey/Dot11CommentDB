import { createSlice, createEntityAdapter } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import type { RootState, AppThunk } from '.';
import { fetcher, isObject, setError } from 'dot11-components';

export type WebexTemplate = {
	id: string;
	isDefault: boolean;
}

export interface WebexAccount {
	id: number;
	name: string;
	groups: string[];
	templates: WebexTemplate[];
	authDate?: string;
	authUrl: string;
}

export type WebexAccountCreate = {
	name: string;
	groups: string[];
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

function validateWebexAccount(account: any): account is WebexAccount {
	return isObject(account) &&
		typeof account.id === 'number' &&
		typeof account.name === 'string' &&
		Array.isArray(account.groups);
}

function validateGetResponse(response: any): response is WebexAccount[] {
	return Array.isArray(response) &&
		response.every(validateWebexAccount);
}

export const loadWebexAccounts = (): AppThunk => 
	async (dispatch) => {
		dispatch(getPending());
		let response: any;
		try {
			response = await fetcher.get(baseUrl);
			if (!validateGetResponse(response))
				throw new TypeError(`Unexpected response to GET ${baseUrl}`);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get list of webex accounts', error));
			return;
		}
		dispatch(getSuccess(response));
	}

export const updateWebexAccount = (id: number, changes: Partial<WebexAccount>): AppThunk =>
	async (dispatch) => {
		dispatch(updateOne({id, changes}));
		const url = `${baseUrl}/${id}`;
		let response: any;
		try {
			response = await fetcher.patch(url, changes);
			if (!validateWebexAccount(response))
				throw new TypeError('Unexpected response to PATCH ' + url);
		}
		catch (error: any) {
			dispatch(setError(`Unable to update webex account`, error));
			return;
		}
		dispatch(updateOne({id, changes: response}));
	}

export const addWebexAccount = (account: WebexAccountCreate): AppThunk =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.post(baseUrl, account);
			if (!validateWebexAccount(response))
				throw new TypeError('Unexpected response to POST ' + baseUrl);
		}
		catch (error: any) {
			dispatch(setError('Unable to add webex account', error));
			return;
		}
		dispatch(addOne(response));
	}

export const deleteWebexAccount = (id: number): AppThunk =>
	async (dispatch) => {
		dispatch(removeOne(id));
		const url = `${baseUrl}/${id}`;
		try {
			await fetcher.delete(url);
		}
		catch (error: any) {
			dispatch(setError(`Unable to delete webex account`, error));
		}
	}
