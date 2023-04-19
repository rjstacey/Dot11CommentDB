import {createSlice, createEntityAdapter} from '@reduxjs/toolkit';

import {fetcher, setError, isObject} from 'dot11-components';
import { AppThunk, RootState } from '.';

/* Google Calendar Schema: https://developers.google.com/calendar/api/v3/reference/calendars */
type GoogleCalendarSchema = {
	/** Type of the resource ("calendar#calendar"). */
	kind: "calendar#calendar";
	/** ETag of the resource. */
	etag: string;
	/** Identifier of the calendar. */
	id: string;
	/** Title of the calendar. */
	summary: string;
	/** Description of the calendar. */
	description: string;
	/** Geographic location of the calendar as free-form text. */
	location: string;
	/** The time zone of the calendar. (Formatted as an IANA Time Zone Database name, e.g. "Europe/Zurich".) */
	timeZone: string; 
}

export type CalendarAccount = {
	id: number;
	name: string;
	groups: string[];
	details: GoogleCalendarSchema;
}

const dataAdapter = createEntityAdapter<CalendarAccount>({});

export const dataSet = 'calendarAccounts';

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
		setOne(state, action) {
			dataAdapter.setOne(state, action.payload);
		},
	},
});

export default slice;

/*
 * Selector
 */
export const selectCalendarAccountsState = (state: RootState) => state[dataSet];
export const selectCalendarAccountEntities = (state: RootState) => selectCalendarAccountsState(state).entities;

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

export const loadCalendarAccounts = (): AppThunk => 
	async (dispatch) => {
		dispatch(getPending());
		let accounts;
		try {
			accounts = await fetcher.get(baseUrl);
			if (!Array.isArray(accounts))
				throw new TypeError(`Unexpected response to GET ${baseUrl}`);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get list of Google calendar accounts', error));
			return;
		}
		dispatch(getSuccess(accounts));
	}
	
export const addCalendarAccount = (account: CalendarAccount): AppThunk =>
	async (dispatch) => {
		let newAccount;
		try {
			newAccount = await fetcher.post(baseUrl, account);
			if (!isObject(newAccount))
				throw new TypeError('Unexpected response to POST: ' + baseUrl);
		}
		catch(error) {
			await dispatch(setError('Unable to add Google calendar account', error));
			return;
		}
		dispatch(addOne(newAccount));
	}

export const updateCalendarAccount = (id: number, changes: Partial<CalendarAccount>): AppThunk =>
	async (dispatch) => {
		dispatch(updateOne({id, changes}));
		const url = `${baseUrl}/${id}`;
		let updates;
		try {
			updates = await fetcher.patch(url, changes);
			if (!isObject(updates))
				throw new TypeError('Unexpected response to PATCH: ' + url);
		}
		catch(error) {
			dispatch(setError(`Unable to update Google calendar account`, error));
			return;
		}
		dispatch(updateOne({id, updates}));
	}

export const revokeAuthCalendarAccount = (id: number): AppThunk =>
	async (dispatch) => {
		const url = `${baseUrl}/${id}/revoke`;
		let account;
		try {
			account = await fetcher.patch(url);
			if (!isObject(account))
				throw new TypeError('Unexpected response to DELETE: ' + url);
		}
		catch(error) {
			await dispatch(setError(`Unable to deauthorize google calendar account`, error));
			return;
		}
		await dispatch(setOne(account));
	}

export const deleteCalendarAccount = (id: number): AppThunk =>
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
