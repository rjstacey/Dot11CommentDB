import {
	createSlice,
	createEntityAdapter,
	createSelector,
} from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

import { fetcher, isObject, setError } from "dot11-components";
import type { RootState, AppThunk } from ".";

export type UserMember = {
	SAPIN: number;
	Name: string;
	Status: string;
	Email?: string;
};

type ExtraState = {
	valid: boolean;
	loading: boolean;
	groupName: string | null;
};

const selectId = (user: UserMember) => user.SAPIN;
const dataAdapter = createEntityAdapter({ selectId });
const initialState = dataAdapter.getInitialState<ExtraState>({
	valid: false,
	loading: false,
	groupName: null,
});
const dataSet = "members";
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		getPending(state, action: PayloadAction<{ groupName: string | null }>) {
			const { groupName } = action.payload;
			state.loading = true;
			if (state.groupName !== groupName) {
				state.groupName = action.payload.groupName;
				state.valid = false;
				dataAdapter.removeAll(state);
			}
		},
		getSuccess(state, action: PayloadAction<UserMember[]>) {
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, action.payload);
		},
		getFailure(state) {
			state.loading = false;
		},
		clearMembers(state) {
			dataAdapter.removeAll(state);
			state.valid = false;
		},
	},
});

export default slice;

/*
 * Selectors
 */
export const selectMembersState = (state: RootState) => state[dataSet];
export const selectMemberIds = (state: RootState) =>
	selectMembersState(state).ids;
export const selectMemberEntities = (state: RootState) =>
	selectMembersState(state).entities;
export const selectMembers = createSelector(
	selectMemberIds,
	selectMemberEntities,
	(ids, entities) => ids.map((id) => entities[id]!)
);

/*
 * Actions
 */
const { getPending, getSuccess, getFailure, clearMembers } = slice.actions;

export { clearMembers };

function validUser(user: any): user is UserMember {
	return (
		isObject(user) &&
		typeof user.SAPIN === "number" &&
		typeof user.Name === "string" &&
		typeof user.Status === "string"
	);
}

function validResponse(response: any): response is UserMember[] {
	return Array.isArray(response) && response.every(validUser);
}

let loadingPromise: Promise<UserMember[]>;
export const loadMembers =
	(groupName: string): AppThunk<UserMember[]> =>
	(dispatch, getState) => {
		const {loading, groupName: currentGroupName} = selectMembersState(getState());
		if (loading && currentGroupName === groupName) {
			return loadingPromise;
		}
		dispatch(getPending({ groupName }));
		const url = `/api/${groupName}/users`;
		loadingPromise = fetcher.get(url)
			.then((response: any) => {
				if (!validResponse(response))
					throw new TypeError("Unexpected response");
				dispatch(getSuccess(response));
				return response;
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("Unable to get users list", error));
				return [];
			});
		return loadingPromise;
	};
