import {
	createSlice,
	createEntityAdapter,
	createSelector,
} from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

import { fetcher, isObject, setError } from "dot11-components";

import type { RootState, AppThunk } from ".";

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

type ExtraState = {
	valid: boolean;
	loading: boolean;
	groupName: string | null;
};

const dataAdapter = createEntityAdapter<WebexAccount>({});
const initialState = dataAdapter.getInitialState<ExtraState>({
	valid: false,
	loading: false,
	groupName: null,
});

const dataSet = "webexAccounts";
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
		getSuccess(state, action: PayloadAction<WebexAccount[]>) {
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

/* Selectors */
export const selectWebexAccountsState = (state: RootState) => state[dataSet];
export const selectWebexAccountIds = (state: RootState) =>
	selectWebexAccountsState(state).ids;
export const selectWebexAccountEntities = (state: RootState) =>
	selectWebexAccountsState(state).entities;
export const selectWebexAccountsGroupName = (state: RootState) =>
	selectWebexAccountsState(state).groupName;
export const selectWebexAccounts = createSelector(
	selectWebexAccountIds,
	selectWebexAccountEntities,
	(ids, entities) => ids.map((id) => entities[id]!)
);

/* Thunk actions */

function validGetResponse(response: any): response is WebexAccount[] {
	return Array.isArray(response) && response.every(validWebexAccount);
}

let loadingPromise: Promise<WebexAccount[]>;
export const loadWebexAccounts =
	(groupName: string): AppThunk<WebexAccount[]> =>
	(dispatch, getState) => {
		const { loading, groupName: currentGroupName } =
			selectWebexAccountsState(getState());
		if (loading && groupName === currentGroupName) {
			return loadingPromise;
		}
		dispatch(getPending({ groupName }));
		loadingPromise = fetcher
			.get(`/api/${groupName}/webex/accounts`)
			.then((response: any) => {
				if (!validGetResponse(response))
					throw new TypeError("Unexpected response to GET");
				dispatch(getSuccess(response));
				return response;
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(
					setError("Unable to get list of webex accounts", error)
				);
				return [];
			});
		return loadingPromise;
	};

export const refreshWebexAccounts =
	(): AppThunk => async (dispatch, getState) => {
		const groupName = selectWebexAccountsGroupName(getState());
		dispatch(
			groupName ? loadWebexAccounts(groupName) : clearWebexAccounts()
		);
	};

export const updateWebexAccount =
	(id: number, changes: Partial<WebexAccount>): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWebexAccountsGroupName(getState());
		const url = `/api/${groupName}/webex/accounts/${id}`;
		dispatch(updateOne({ id, changes }));
		let response: any;
		try {
			response = await fetcher.patch(url, changes);
			if (!validWebexAccount(response))
				throw new TypeError("Unexpected response to PATCH");
		} catch (error: any) {
			dispatch(setError("Unable to update webex account", error));
			return;
		}
		dispatch(updateOne({ id, changes: response }));
	};

export const addWebexAccount =
	(account: WebexAccountCreate): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWebexAccountsGroupName(getState());
		const url = `/api/${groupName}/webex/accounts`;
		let response;
		try {
			response = await fetcher.post(url, account);
			if (!validWebexAccount(response))
				throw new TypeError("Unexpected response to POST");
		} catch (error: any) {
			dispatch(setError("Unable to add webex account", error));
			return;
		}
		dispatch(addOne(response));
	};

export const deleteWebexAccount =
	(id: number): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWebexAccountsGroupName(getState());
		const url = `/api/${groupName}/webex/accounts/${id}`;
		dispatch(removeOne(id));
		try {
			await fetcher.delete(url);
		} catch (error: any) {
			dispatch(setError("Unable to delete webex account", error));
		}
	};

export const revokeAuthWebexAccount =
	(id: number): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectWebexAccountsGroupName(getState());
		const url = `/api/${groupName}/webex/accounts/${id}/revoke`;
		let response: any;
		try {
			response = await fetcher.patch(url);
			if (!validWebexAccount(response))
				throw new TypeError("Unexpected response to PATCH");
		} catch (error) {
			dispatch(setError(`Unable to deauthorize webex account`, error));
			return;
		}
		dispatch(setOne(response));
	};
