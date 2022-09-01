import {createSlice, createEntityAdapter} from '@reduxjs/toolkit';

import fetcher from 'dot11-components/lib/fetcher';
import {setError} from 'dot11-components/store/error';

const dataAdapter = createEntityAdapter({});

export const dataSet = 'calendarAccounts';

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
export const selectCalendarAccountsState = state => state[dataSet];
export const selectCalendarAccountEntities = state => selectCalendarAccountsState(state).entities;

/*
 * Actions
 */
const {
	getPending,
	getSuccess,
	getFailure,
	updateOne,
	setOne,
	removeOne,
	addOne,
} = slice.actions;

const baseUrl = '/api/calendar/accounts';

export const loadCalendarAccounts = () => 
	async (dispatch, getState) => {
		dispatch(getPending());
		let accounts;
		try {
			accounts = await fetcher.get(baseUrl);
			if (!Array.isArray(accounts))
				throw new TypeError(`Unexpected response to GET ${baseUrl}`);
		}
		catch(error) {
			await dispatch(getFailure());
			await dispatch(setError('Unable to get list of Google calendar accounts', error));
			return;
		}
		await dispatch(getSuccess(accounts));
	}
	
export const addCalendarAccount = (account) =>
	async (dispatch) => {
		let newAccount;
		try {
			newAccount = await fetcher.post(baseUrl, account);
			if (typeof newAccount !== 'object')
				throw new TypeError('Unexpected response to POST: ' + baseUrl);
		}
		catch(error) {
			await dispatch(setError('Unable to add Google calendar account', error));
			return;
		}
		dispatch(addOne(newAccount));
	}

export const updateCalendarAccount = (id, changes) =>
	async (dispatch) => {
		await dispatch(updateOne({id, changes}));
		const url = `${baseUrl}/${id}`;
		let updates;
		try {
			updates = await fetcher.patch(url, changes);
			if (typeof updates !== 'object')
				throw new TypeError('Unexpected response to PATCH: ' + url);
		}
		catch(error) {
			await dispatch(setError(`Unable to update Google calendar account`, error));
			return;
		}
		await dispatch(updateOne({id, updates}));
	}

export const revokeAuthCalendarAccount = (id) =>
	async (dispatch) => {
		const url = `${baseUrl}/${id}/revoke`;
		let account;
		try {
			account = await fetcher.patch(url);
			if (typeof account !== 'object')
				throw new TypeError('Unexpected response to DELETE: ' + url);
		}
		catch(error) {
			await dispatch(setError(`Unable to deauthorize google calendar account`, error));
			return;
		}
		await dispatch(setOne(account));
	}

export const deleteCalendarAccount = (id) =>
	async (dispatch) => {
		const url = `${baseUrl}/${id}`;
		try {
			await fetcher.delete(url);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete Google calendar account`, error));
		}
		await dispatch(removeOne(id));
	}
