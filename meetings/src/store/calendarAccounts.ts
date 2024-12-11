import {
	createSlice,
	createEntityAdapter,
	createSelector,
} from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

import { fetcher, setError } from "dot11-components";
import type { AppThunk, RootState } from ".";
import {
	CalendarAccount,
	CalendarAccountCreate,
	calendarAccountSchema,
	calendarAccountsSchema,
} from "@schemas/calendar";

export type { CalendarAccount, CalendarAccountCreate };

type ExtraState = {
	valid: boolean;
	loading: boolean;
	groupName: string | null;
	defaultId: number | null;
};

const dataAdapter = createEntityAdapter<CalendarAccount>({});
const initialState = dataAdapter.getInitialState<ExtraState>({
	valid: false,
	loading: false,
	groupName: null,
	defaultId: null,
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
				state.defaultId = null;
			}
		},
		getSuccess(state, action: PayloadAction<CalendarAccount[]>) {
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, action.payload);
			if (state.defaultId && !state.ids.includes(state.defaultId))
				state.defaultId = null;
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
		setDefaultId(state, action: PayloadAction<number | null>) {
			const defaultId = action.payload;
			if (defaultId && state.ids.includes(defaultId))
				state.defaultId = defaultId;
			else state.defaultId = null;
		},
	},
});

export default slice;

/* Slice actions */
const {
	getPending,
	getSuccess,
	getFailure,
	updateOne,
	setOne,
	removeOne,
	addOne,
} = slice.actions;

export const setCalendarAccountDefaultId = slice.actions.setDefaultId;

/* Selectors */
export const selectCalendarAccountsState = (state: RootState) => state[dataSet];
export const selectCalendarAccountIds = (state: RootState) =>
	selectCalendarAccountsState(state).ids;
export const selectCalendarAccountEntities = (state: RootState) =>
	selectCalendarAccountsState(state).entities;
const selectCalendarAccountsGroupName = (state: RootState) =>
	selectCalendarAccountsState(state).groupName;
export const selectCalendarAccountDefaultId = (state: RootState) =>
	selectCalendarAccountsState(state).defaultId;
export const selectCalendarAccounts = createSelector(
	selectCalendarAccountIds,
	selectCalendarAccountEntities,
	(ids, entities) => ids.map((id) => entities[id]!)
);

/* Thunk actions */
let loadingPromise: Promise<void>;
export const loadCalendarAccounts =
	(groupName: string): AppThunk<void> =>
	(dispatch, getState) => {
		const { loading, groupName: currentGroupName } =
			selectCalendarAccountsState(getState());
		if (loading && groupName === currentGroupName) {
			return loadingPromise;
		}
		dispatch(getPending({ groupName }));
		const url = `/api/${groupName}/calendar/accounts`;
		loadingPromise = fetcher
			.get(url)
			.then((response: any) => {
				const calendar = calendarAccountsSchema.parse(response);
				dispatch(getSuccess(calendar));
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("GET " + url, error));
			});
		return loadingPromise;
	};

export const addCalendarAccount =
	(account: CalendarAccountCreate): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectCalendarAccountsGroupName(getState());
		const url = `/api/${groupName}/calendar/accounts`;
		let calendar: CalendarAccount;
		try {
			const response = await fetcher.post(url, account);
			calendar = calendarAccountSchema.parse(response);
		} catch (error) {
			dispatch(setError("POST " + url, error));
			return;
		}
		dispatch(addOne(calendar));
	};

export const updateCalendarAccount =
	(id: number, changes: Partial<CalendarAccount>): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectCalendarAccountsGroupName(getState());
		const url = `/api/${groupName}/calendar/accounts/${id}`;
		dispatch(updateOne({ id, changes }));
		let calendar: CalendarAccount;
		try {
			const response = await fetcher.patch(url, changes);
			calendar = calendarAccountSchema.parse(response);
		} catch (error) {
			dispatch(setError("PATCH " + url, error));
			return;
		}
		dispatch(setOne(calendar));
	};

export const revokeAuthCalendarAccount =
	(id: number): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectCalendarAccountsGroupName(getState());
		const url = `/api/${groupName}/calendar/accounts/${id}/revoke`;
		let calendar: CalendarAccount;
		try {
			const response = await fetcher.patch(url);
			calendar = calendarAccountSchema.parse(response);
		} catch (error) {
			dispatch(setError("PATCH " + url, error));
			return;
		}
		dispatch(setOne(calendar));
	};

export const deleteCalendarAccount =
	(id: number): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectCalendarAccountsGroupName(getState());
		const url = `/api/${groupName}/calendar/accounts/${id}`;
		try {
			await fetcher.delete(url);
		} catch (error) {
			dispatch(setError("DELETE " + url, error));
			return;
		}
		dispatch(removeOne(id));
	};
