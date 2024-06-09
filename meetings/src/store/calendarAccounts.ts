import {
	createSlice,
	createEntityAdapter,
	createSelector,
} from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

import { fetcher, setError, isObject } from "dot11-components";
import type { AppThunk, RootState } from ".";

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
};

export type CalendarAccount = {
	id: number;
	name: string;
	groupId: string;
	details?: GoogleCalendarSchema;
	authDate?: string;
	authUrl?: string;
	authUserId: number | null;
	displayName?: string;
	userName?: string;
	lastAccessed: string | null;
};

export type CalendarAccountCreate = {
	name: string;
	groups: string[];
};

type ExtraState = {
	valid: boolean;
	loading: boolean;
	groupName: string | null;
};

const dataAdapter = createEntityAdapter<CalendarAccount>({});
const initialState = dataAdapter.getInitialState<ExtraState>({
	valid: false,
	loading: false,
	groupName: null,
});
const dataSet = "calendarAccounts";
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		getPending(state, action: PayloadAction<{ groupName: string | null }>) {
			const { groupName } = action.payload;
			state.loading = true;
			if (state.groupName !== groupName) {
				state.groupName = groupName;
				state.valid = false;
				dataAdapter.removeAll(state);
			}
		},
		getSuccess(state, action: PayloadAction<CalendarAccount[]>) {
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, action.payload);
		},
		getFailure(state) {
			state.loading = false;
		},
		clear(state) {
			state.groupName = null;
			state.valid = false;
			dataAdapter.removeAll(state);
		},
		updateOne: dataAdapter.updateOne,
		addOne: dataAdapter.addOne,
		removeOne: dataAdapter.removeOne,
		setOne: dataAdapter.setOne,
	},
});

export default slice;

/* Basic actions */
const {
	getPending,
	getSuccess,
	getFailure,
	clear: clearCalendarAccounts,
	updateOne,
	setOne,
	removeOne,
	addOne,
} = slice.actions;

/* Selectors */
export const selectCalendarAccountsState = (state: RootState) => state[dataSet];
export const selectCalendarAccountIds = (state: RootState) =>
	selectCalendarAccountsState(state).ids;
export const selectCalendarAccountEntities = (state: RootState) =>
	selectCalendarAccountsState(state).entities;
const selectCalendarAccountsGroupName = (state: RootState) =>
	selectCalendarAccountsState(state).groupName;
export const selectCalendarAccounts = createSelector(
	selectCalendarAccountIds,
	selectCalendarAccountEntities,
	(ids, entities) => ids.map((id) => entities[id]!)
);

/* Thunk actions */
function validCalendarAccount(account: any): account is CalendarAccount {
	return (
		isObject(account) &&
		typeof account.id === "number" &&
		typeof account.name === "string" &&
		typeof account.groupId === "string"
	);
}

function validGetResponse(response: any): response is CalendarAccount[] {
	return Array.isArray(response) && response.every(validCalendarAccount);
}

let loadingPromise: Promise<CalendarAccount[]>;
export const loadCalendarAccounts =
	(groupName: string): AppThunk<CalendarAccount[]> =>
	(dispatch, getState) => {
		const { loading, groupName: currentGroupName } =
			selectCalendarAccountsState(getState());
		if (loading && groupName === currentGroupName) {
			return loadingPromise;
		}
		dispatch(getPending({ groupName }));
		loadingPromise = fetcher
			.get(`/api/${groupName}/calendar/accounts`)
			.then((response: any) => {
				if (!validGetResponse(response))
					throw new TypeError("Unexpected response to GET");
				dispatch(getSuccess(response));
				return response;
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(
					setError(
						"Unable to get list of Google calendar accounts",
						error
					)
				);
				return [];
			});
		return loadingPromise;
	};

export const refreshCalendarAccounts =
	(): AppThunk => async (dispatch, getState) => {
		const groupName = selectCalendarAccountsGroupName(getState());
		dispatch(
			groupName
				? loadCalendarAccounts(groupName)
				: clearCalendarAccounts()
		);
	};

export const addCalendarAccount =
	(account: CalendarAccountCreate): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectCalendarAccountsGroupName(getState());
		const url = `/api/${groupName}/calendar/accounts`;
		let response: any;
		try {
			response = await fetcher.post(url, account);
			if (!validCalendarAccount(response))
				throw new TypeError("Unexpected response to POST");
		} catch (error) {
			dispatch(setError("Unable to add Google calendar account", error));
			return;
		}
		dispatch(addOne(response));
	};

export const updateCalendarAccount =
	(id: number, changes: Partial<CalendarAccount>): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectCalendarAccountsGroupName(getState());
		const url = `/api/${groupName}/calendar/accounts/${id}`;
		dispatch(updateOne({ id, changes }));
		let response: any;
		try {
			response = await fetcher.patch(url, changes);
			if (!validCalendarAccount(response))
				throw new TypeError("Unexpected response to PATCH");
		} catch (error) {
			dispatch(
				setError(`Unable to update Google calendar account`, error)
			);
			return;
		}
		dispatch(updateOne({ id, changes: response }));
	};

export const revokeAuthCalendarAccount =
	(id: number): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectCalendarAccountsGroupName(getState());
		const url = `/api/${groupName}/calendar/accounts/${id}/revoke`;
		let response: any;
		try {
			response = await fetcher.patch(url);
			if (!validCalendarAccount(response))
				throw new TypeError("Unexpected response to PATCH");
		} catch (error) {
			dispatch(
				setError(`Unable to deauthorize google calendar account`, error)
			);
			return;
		}
		dispatch(setOne(response));
	};

export const deleteCalendarAccount =
	(id: number): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectCalendarAccountsGroupName(getState());
		const url = `/api/${groupName}/calendar/accounts/${id}`;
		try {
			await fetcher.delete(url);
		} catch (error) {
			dispatch(
				setError(`Unable to delete Google calendar account`, error)
			);
			return;
		}
		dispatch(removeOne(id));
	};
