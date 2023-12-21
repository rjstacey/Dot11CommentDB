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

function validUser(user: any): user is UserMember {
	return (
		isObject(user) &&
		typeof user.SAPIN === "number" &&
		typeof user.Name === "string" &&
		typeof user.Status === "string"
	);
}

/* Create slice */
const initialState: {
	valid: boolean;
	loading: boolean;
	groupName: string | null;
} = {
	valid: false,
	loading: false,
	groupName: null,
};
const selectId = (user: UserMember) => user.SAPIN;
const dataAdapter = createEntityAdapter({ selectId });
const dataSet = "members";
const slice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState(initialState),
	reducers: {
		getPending(state, action: PayloadAction<{ groupName: string }>) {
			const { groupName } = action.payload;
			state.loading = true;
			if (state.groupName !== groupName) {
				state.groupName = groupName;
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
			state.groupName = null;
			state.valid = false;
			dataAdapter.removeAll(state);
		},
	},
});

export default slice;

/* Slice actions */
const { getPending, getSuccess, getFailure, clearMembers } = slice.actions;

export { clearMembers };


/* Selectors */
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

/* Thunk actions */
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
