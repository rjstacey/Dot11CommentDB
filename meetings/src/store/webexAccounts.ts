import {
	createSlice,
	createEntityAdapter,
	createSelector,
} from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

import { fetcher, setError } from "dot11-components";

import type { RootState, AppThunk } from ".";
import {
	WebexAccount,
	WebexAccountCreate,
	webexAccountSchema,
	webexAccountsSchema,
} from "@schemas/webex";

export type { WebexAccount, WebexAccountCreate };

/*
export type WebexTemplate = {
	id: string;
	isDefault: boolean;
};
export interface WebexAccount {
	id: number;
	name: string;
	groupId: string;
	authDate?: string;
	authUrl: string;
	authUserId?: number;
	displayName?: string;
	userName?: string;
	templates: WebexTemplate[];
	lastAccessed: string | null;
}

function validWebexAccount(account: any): account is WebexAccount {
	return (
		isObject(account) &&
		typeof account.id === "number" &&
		typeof account.name === "string" &&
		typeof account.groupId === "string"
	);
}

export type WebexAccountCreate = {
	name: string;
	groups: string[];
};
*/
type ExtraState = {
	valid: boolean;
	loading: boolean;
	groupName: string | null;
	lastLoad: string | null;
	defaultId: number | null;
};

const dataAdapter = createEntityAdapter<WebexAccount>({});
const initialState = dataAdapter.getInitialState<ExtraState>({
	valid: false,
	loading: false,
	groupName: null,
	lastLoad: null,
	defaultId: null,
});

const dataSet = "webexAccounts";
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		getPending(state, action: PayloadAction<{ groupName: string | null }>) {
			const { groupName } = action.payload;
			state.loading = true;
			state.lastLoad = new Date().toISOString();
			if (state.groupName !== groupName) {
				state.groupName = groupName;
				state.valid = false;
				dataAdapter.removeAll(state);
				state.defaultId = null;
			}
		},
		getSuccess(state, action: PayloadAction<WebexAccount[]>) {
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
	clear: clearWebexAccounts,
	updateOne,
	addOne,
	removeOne,
	setOne,
} = slice.actions;

export const setWebexAccountDefaultId = slice.actions.setDefaultId;

/* Selectors */
export const selectWebexAccountsState = (state: RootState) => state[dataSet];
const selectWebexAccountsAge = (state: RootState) => {
	const lastLoad = selectWebexAccountsState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
export const selectWebexAccountIds = (state: RootState) =>
	selectWebexAccountsState(state).ids;
export const selectWebexAccountEntities = (state: RootState) =>
	selectWebexAccountsState(state).entities;
export const selectWebexAccountsGroupName = (state: RootState) =>
	selectWebexAccountsState(state).groupName;
export const selectWebexAccountDefaultId = (state: RootState) =>
	selectWebexAccountsState(state).defaultId;

export const selectWebexAccounts = createSelector(
	selectWebexAccountIds,
	selectWebexAccountEntities,
	(ids, entities) => ids.map((id) => entities[id]!)
);

/* Thunk actions */
const AGE_STALE = 60 * 60 * 1000; // 1 hour
let loading = false;
let loadingPromise: Promise<void>;
export const loadWebexAccounts =
	(groupName: string, force = false): AppThunk<void> =>
	(dispatch, getState) => {
		const state = getState();
		const currentGroupName = selectWebexAccountsState(state).groupName;
		if (groupName === currentGroupName) {
			if (loading) return loadingPromise;
			const age = selectWebexAccountsAge(state);
			if (!force && age && age < AGE_STALE) return Promise.resolve();
		}
		dispatch(getPending({ groupName }));
		loading = true;
		const url = `/api/${groupName}/webex/accounts`;
		loadingPromise = fetcher
			.get(url)
			.then((response: unknown) => {
				const accounts = webexAccountsSchema.parse(response);
				dispatch(getSuccess(accounts));
			})
			.catch((error: unknown) => {
				dispatch(getFailure());
				dispatch(setError("GET " + url, error));
			})
			.finally(() => {
				loading = false;
			});
		return loadingPromise;
	};

export const refreshWebexAccounts =
	(): AppThunk => async (dispatch, getState) => {
		const groupName = selectWebexAccountsGroupName(getState());
		dispatch(
			groupName
				? loadWebexAccounts(groupName, true)
				: clearWebexAccounts()
		);
	};

export const updateWebexAccount =
	(id: number, changes: Partial<WebexAccount>): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWebexAccountsGroupName(getState());
		dispatch(updateOne({ id, changes }));
		const url = `/api/${groupName}/webex/accounts/${id}`;
		let account: WebexAccount;
		try {
			const response = await fetcher.patch(url, changes);
			account = webexAccountSchema.parse(response);
		} catch (error) {
			dispatch(setError("Unable to update webex account", error));
			return;
		}
		dispatch(setOne(account));
	};

export const addWebexAccount =
	(accountIn: WebexAccountCreate): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWebexAccountsGroupName(getState());
		const url = `/api/${groupName}/webex/accounts`;
		let account: WebexAccount;
		try {
			const response = await fetcher.post(url, accountIn);
			account = webexAccountSchema.parse(response);
		} catch (error) {
			dispatch(setError("POST " + url, error));
			return;
		}
		dispatch(addOne(account));
	};

export const deleteWebexAccount =
	(id: number): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWebexAccountsGroupName(getState());
		const url = `/api/${groupName}/webex/accounts/${id}`;
		dispatch(removeOne(id));
		try {
			await fetcher.delete(url);
		} catch (error) {
			dispatch(setError("DELETE " + url, error));
		}
	};

export const revokeAuthWebexAccount =
	(id: number): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWebexAccountsGroupName(getState());
		const url = `/api/${groupName}/webex/accounts/${id}/revoke`;
		let account: WebexAccount;
		try {
			const response = await fetcher.patch(url);
			account = webexAccountSchema.parse(response);
		} catch (error) {
			dispatch(setError("PATCH " + url, error));
			return;
		}
		dispatch(setOne(account));
	};
