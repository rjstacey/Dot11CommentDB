import { createSlice, createEntityAdapter } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { fetcher, setError, isObject } from 'dot11-components';
import type { AppThunk, RootState } from '.';

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
	authDate?: string;
	authUrl?: string;
}

export type CalendarAccountCreate = {
	name: string;
	groups: string[];
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
  		getSuccess(state, action: PayloadAction<CalendarAccount[]>) {
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
		setOne: dataAdapter.setOne,
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

function validateCalendarAccount(account: any): account is CalendarAccount {
	return isObject(account) &&
		typeof account.id === 'number' &&
		typeof account.name === 'string' &&
		Array.isArray(account.groups);
}

function validateGetResponse(response: any): response is CalendarAccount[] {
	return Array.isArray(response) &&
		response.every(validateCalendarAccount);
}

export const loadCalendarAccounts = (): AppThunk => 
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
			dispatch(setError('Unable to get list of Google calendar accounts', error));
			return;
		}
		dispatch(getSuccess(response));
	}
	
export const addCalendarAccount = (account: CalendarAccountCreate): AppThunk =>
	async (dispatch) => {
		let response: any;
		try {
			response = await fetcher.post(baseUrl, account);
			if (!validateCalendarAccount(response))
				throw new TypeError('Unexpected response to POST: ' + baseUrl);
		}
		catch(error) {
			dispatch(setError('Unable to add Google calendar account', error));
			return;
		}
		dispatch(addOne(response));
	}

export const updateCalendarAccount = (id: number, changes: Partial<CalendarAccount>): AppThunk =>
	async (dispatch) => {
		dispatch(updateOne({id, changes}));
		const url = `${baseUrl}/${id}`;
		let response: any;
		try {
			response = await fetcher.patch(url, changes);
			if (!validateCalendarAccount(response))
				throw new TypeError('Unexpected response to PATCH ' + url);
		}
		catch(error) {
			dispatch(setError(`Unable to update Google calendar account`, error));
			return;
		}
		dispatch(updateOne({id, changes: response}));
	}

export const revokeAuthCalendarAccount = (id: number): AppThunk =>
	async (dispatch) => {
		const url = `${baseUrl}/${id}/revoke`;
		let response: any;
		try {
			response = await fetcher.patch(url);
			if (!validateCalendarAccount(response))
				throw new TypeError('Unexpected response to DELETE ' + url);
		}
		catch(error) {
			dispatch(setError(`Unable to deauthorize google calendar account`, error));
			return;
		}
		dispatch(setOne(response));
	}

export const deleteCalendarAccount = (id: number): AppThunk =>
	async (dispatch) => {
		const url = `${baseUrl}/${id}`;
		try {
			await fetcher.delete(url);
		}
		catch(error) {
			dispatch(setError(`Unable to delete Google calendar account`, error));
			return;
		}
		dispatch(removeOne(id));
	}
