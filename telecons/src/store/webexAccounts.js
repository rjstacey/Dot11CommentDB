import {createSlice, createEntityAdapter} from '@reduxjs/toolkit';

import fetcher from 'dot11-components/lib/fetcher';
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
		setOne(state, action) {
			dataAdapter.setOne(state, action.payload);
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
	setOne,
} = slice.actions;

const webexAuthUrl = '/api/webex/auth';
const webexAccountsUrl = '/api/webex/accounts';

export const loadWebexAccounts = () => 
	async (dispatch, getState) => {
		dispatch(getPending());
		let telecons;
		try {
			telecons = await fetcher.get(webexAccountsUrl);
			if (!Array.isArray(telecons))
				throw new TypeError(`Unexpected response to GET ${webexAccountsUrl}`);
		}
		catch(error) {
			await dispatch(getFailure());
			await dispatch(setError('Unable to get list of webex accounts', error));
			return;
		}
		await dispatch(getSuccess(telecons));
	}

export const updateWebexAccount = (id, changes) =>
	async (dispatch) => {
		await dispatch(updateOne({id, changes}));
		const url = `${webexAccountsUrl}/${id}`;
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
			newAccount = await fetcher.post(webexAccountsUrl, account);
			if (typeof newAccount !== 'object')
				throw new TypeError('Unexpected response to POST ' + webexAccountsUrl);
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
			const url = `${webexAccountsUrl}/${id}`;
			await fetcher.delete(url);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete webex account`, error));
		}
	}

export const completeAuthWebexAccount = (params) =>
	async (dispatch) => {
		let account;
		try {
			account = await fetcher.post(webexAuthUrl, params);
			if (typeof account !== 'object')
				throw new TypeError('Unexpected response to POST ' + webexAuthUrl);
		}
		catch(error) {
			await dispatch(setError(`Unable to authorize webex account`, error));
			return;
		}
		await dispatch(setOne(account));
	}
