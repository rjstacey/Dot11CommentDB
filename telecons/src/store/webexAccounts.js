import {createSlice, createEntityAdapter} from '@reduxjs/toolkit';

import {fetcher} from 'dot11-components/lib';
import {setError} from 'dot11-components/store/error';

const dataAdapter = createEntityAdapter({});

export const dataSet = 'webexAccounts';

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
export const selectWebexAccountsState = state => state[dataSet];
export const selectWebexAccountEntities = state => selectWebexAccountsState(state).entities;

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

export const loadWebexAccounts = () => 
	async (dispatch, getState) => {
		dispatch(getPending());
		let response;
		try {
			response = await fetcher.get(baseUrl);
			if (!Array.isArray(response))
				throw new TypeError(`Unexpected response to GET ${baseUrl}`);
		}
		catch(error) {
			await dispatch(getFailure());
			await dispatch(setError('Unable to get list of webex accounts', error));
			return;
		}
		await dispatch(getSuccess(response));
	}

export const updateWebexAccount = (id, changes) =>
	async (dispatch) => {
		await dispatch(updateOne({id, changes}));
		const url = `${baseUrl}/${id}`;
		let updates;
		try {
			updates = await fetcher.patch(url, changes);
			if (typeof updates !== 'object')
				throw new TypeError('Unexpected response to PATCH ' + url);
		}
		catch(error) {
			await dispatch(setError(`Unable to update webex account`, error));
			return;
		}
		await dispatch(updateOne({id, updates}));
	}

export const addWebexAccount = (account) =>
	async (dispatch) => {
		let newAccount;
		try {
			newAccount = await fetcher.post(baseUrl, account);
			if (typeof newAccount !== 'object')
				throw new TypeError('Unexpected response to POST ' + baseUrl);
		}
		catch(error) {
			await dispatch(setError('Unable to add webex account', error));
			return;
		}
		dispatch(addOne(newAccount));
	}

export const deleteWebexAccount = (id) =>
	async (dispatch) => {
		await dispatch(removeOne(id));
		try {
			const url = `${baseUrl}/${id}`;
			await fetcher.delete(url);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete webex account`, error));
		}
	}
