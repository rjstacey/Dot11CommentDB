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

/*
 * Selector
 */
export const selectCalendarAccountsState = state => state[dataSet];
export const selectCalendarAccountEntities = state => selectCalendarAccountsState(state).entities;

/*
 * Reducer
 */
export default slice.reducer;

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

const calendarAuthUrl = '/api/calendar/auth';
const calendarAccountUrl = '/api/calendar/accounts';

export const loadCalendarAccounts = () => 
	async (dispatch, getState) => {
		dispatch(getPending());
		let accounts;
		try {
			accounts = await fetcher.get(calendarAccountUrl);
			if (!Array.isArray(accounts))
				throw new TypeError(`Unexpected response to GET ${calendarAccountUrl}`);
		}
		catch(error) {
			await dispatch(getFailure());
			await dispatch(setError('Unable to get list of Google calendar accounts', error));
			return;
		}
		await dispatch(getSuccess(accounts));
	}

export const updateCalendarAccount = (id, changes) =>
	async (dispatch) => {
		await dispatch(updateOne({id, changes}));
		const url = `${calendarAccountUrl}/${id}`;
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

export const addCalendarAccount = (account) =>
	async (dispatch) => {
		let newAccount;
		try {
			newAccount = await fetcher.post(calendarAccountUrl, account);
			if (typeof newAccount !== 'object')
				throw new TypeError('Unexpected response to POST: ' + calendarAccountUrl);
		}
		catch(error) {
			await dispatch(setError('Unable to add Google calendar account', error));
			return;
		}
		dispatch(addOne(newAccount));
	}

export const deleteCalendarAccount = (id) =>
	async (dispatch) => {
		await dispatch(removeOne(id));
		const url = `${calendarAccountUrl}/${id}`;
		try {
			await fetcher.delete(url);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete Google calendar account`, error));
		}
	}

export const completeAuthCalendarAccount = (params) =>
	async (dispatch) => {
		let account;
		try {
			account = await fetcher.post(calendarAuthUrl, params);
			if (typeof account !== 'object')
				throw new TypeError('Unexpected response to POST: ' + calendarAuthUrl);
		}
		catch(error) {
			await dispatch(setError(`Unable to authorize google calendar account`, error));
			return;
		}
		await dispatch(setOne(account));
	}

export const revokeAuthCalendarAccount = (id) =>
	async (dispatch) => {
		const url = `${calendarAuthUrl}/${id}`;
		let account;
		try {
			account = await fetcher.delete(url);
			if (typeof account !== 'object')
				throw new TypeError('Unexpected response to DELETE: ' + url);
		}
		catch(error) {
			await dispatch(setError(`Unable to deauthorize google calendar account`, error));
			return;
		}
		await dispatch(setOne(account));
	}
