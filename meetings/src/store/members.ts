import {
	createSlice,
	createEntityAdapter,
	PayloadAction,
} from "@reduxjs/toolkit";
import { fetcher, isObject, setError } from "dot11-components";

import type { RootState, AppThunk } from ".";

export interface Member {
	SAPIN: number;
	Name: string;
	Email: string;
	//Permissions: Array<string>;
	Status: string;
}

type ExtraState = {
	valid: boolean;
	loading: boolean;
	groupName: string | null;
};

const selectId = (user: Member) => user.SAPIN;
const dataAdapter = createEntityAdapter<Member>({ selectId });
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
				state.groupName = groupName;
				state.valid = false;
				dataAdapter.removeAll(state);
			}
		},
		getSuccess(state, action) {
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, action.payload);
		},
		getFailure(state) {
			state.loading = false;
		},
	},
});

export default slice;

/* Slice actions */
const { getPending, getSuccess, getFailure } = slice.actions;

/* Selectors */
export const selectMembersState = (state: RootState) => state[dataSet];
export const selectMemberEntities = (state: RootState) =>
	state[dataSet].entities;
export const selectMember = (state: RootState, sapin: number) =>
	selectMembersState(state).entities[sapin];

export const selectMemberName = (state: RootState, sapin: number) => {
	const m = selectMember(state, sapin);
	return m ? m.Name : "Unknown";
};

/* Thunk actions */
function validUser(user: any): user is Member {
	return isObject(user);
}

function validUsers(users: any): users is Member[] {
	return Array.isArray(users) && users.every(validUser);
}

let loadingPromise: Promise<Member[]>;
export const loadMembers =
	(groupName: string): AppThunk<Member[]> =>
	(dispatch, getState) => {
		const { loading, groupName: currentGroupName } = selectMembersState(
			getState()
		);
		if (loading && currentGroupName === groupName) {
			return loadingPromise;
		}
		const url = `/api/${groupName}/members/user`;
		dispatch(getPending({ groupName }));
		loadingPromise = fetcher
			.get(url)
			.then((response: any) => {
				if (!validUsers(response))
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
