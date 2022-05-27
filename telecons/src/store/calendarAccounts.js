import {createSlice, createEntityAdapter} from '@reduxjs/toolkit'

import fetcher from 'dot11-components/lib/fetcher'
import {setError} from 'dot11-components/store/error'

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
	},
});

/*
 * Selector
 */
export const selectCalendarAccountsState = state => state[dataSet];

/*
 * Reducer
 */
export default slice.reducer;

/*
 * Actions
 */
const {getPending, getSuccess, getFailure} = slice.actions;

export const loadCalendarAccounts = () => 
	async (dispatch, getState) => {
		dispatch(getPending());
		const url = '/api/calendar/accounts';
		let accounts;
		try {
			accounts = await fetcher.get(url);
			if (!Array.isArray(accounts))
				throw new TypeError(`Unexpected response to GET ${url}`);
		}
		catch(error) {
			await dispatch(getFailure());
			await dispatch(setError('Unable to get list of Google calendar accounts', error));
			return;
		}
		await dispatch(getSuccess(accounts));
	}

const {updateOne} = slice.actions;

export const updateCalendarAccount = (id, changes) =>
	async (dispatch) => {
		await dispatch(updateOne({id, changes}));
		const url = `/api/calendar/account/${id}`;
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

const {addOne} = slice.actions;

export const addCalendarAccount = (account) =>
	async (dispatch) => {
		const url = `/api/calendar/account`;
		let newAccount;
		try {
			newAccount = await fetcher.post(url, account);
			if (typeof newAccount !== 'object')
				throw new TypeError('Unexpected response to POST: ' + url);
		}
		catch(error) {
			await dispatch(setError('Unable to add Google calendar account', error));
			return;
		}
		dispatch(addOne(newAccount));
	}

const {removeOne} = slice.actions;

export const deleteCalendarAccount = (id) =>
	async (dispatch) => {
		await dispatch(removeOne(id));
		try {
			const url = `/api/calendar/account/${id}`;
			await fetcher.delete(url);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete Google calendar account`, error));
		}
	}

export const authCalendarAccount = (id, code, redirect_uri) =>
	async (dispatch) => {
		let updates;
		try {
			const url = `/api/calendar/auth/${id}`;
			updates = await fetcher.post(url, {code, redirect_uri});
			if (typeof updates !== 'object')
				throw new TypeError('Unexpected response to GET: ' + url);
		}
		catch(error) {
			await dispatch(setError(`Unable to authorize google calendar account`, error));
			return;
		}
		await dispatch(updateOne({id, updates}));
	}

export const getCalendars = (id) =>
	async (dispatch) => {
		let response;
		try {
			const url = `/api/calendar/list/${id}`;
			response = await fetcher.get(url);
			console.log(response);
		}
		catch(error) {
			await dispatch(setError(`Unable to authorize google calendar account`, error));
			return;
		}
	}