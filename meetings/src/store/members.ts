import {
	createSlice,
	createEntityAdapter,
	PayloadAction,
	createSelector,
} from "@reduxjs/toolkit";
import { fetcher, isObject, setError } from "dot11-components";

import type { RootState, AppThunk } from ".";

export interface Member {
	SAPIN: number;
	Name: string;
	Email: string;
	Status: string;
}

type ExtraState = {
	valid: boolean;
	loading: boolean;
	groupName: string | null;
	lastLoad: string | null;
};

const selectId = (user: Member) => user.SAPIN;
const dataAdapter = createEntityAdapter<Member>({ selectId });
const initialState = dataAdapter.getInitialState<ExtraState>({
	valid: false,
	loading: false,
	groupName: null,
	lastLoad: null,
});

const dataSet = "members";
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
			}
		},
		getSuccess(state, action) {
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, action.payload);
		},
		getFailure(state) {
			state.loading = false;
			state.lastLoad = null;
		},
	},
});

export default slice;

/* Slice actions */
const { getPending, getSuccess, getFailure } = slice.actions;

/* Selectors */
export const selectMembersState = (state: RootState) => state[dataSet];
export const selectMemberIds = (state: RootState) =>
	selectMembersState(state).ids;
export const selectMemberEntities = (state: RootState) =>
	selectMembersState(state).entities;
export const selectMember = (state: RootState, sapin: number) =>
	selectMembersState(state).entities[sapin];
const selectMembersAge = (state: RootState) => {
	let lastLoad = selectMembersState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
const selectMembers = createSelector(
	selectMemberIds,
	selectMemberEntities,
	(ids, entities) => ids.map((id) => entities[id]!)
);

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

const AGE_STALE = 60 * 60 * 1000; // 1 hour

let loadingPromise: Promise<Member[]>;
export const loadMembers =
	(groupName: string): AppThunk<Member[]> =>
	(dispatch, getState) => {
		const state = getState();
		const { loading, groupName: currentGroupName } =
			selectMembersState(state);
		if (loading && currentGroupName === groupName) {
			return loadingPromise;
		}
		const age = selectMembersAge(state);
		if (age && age < AGE_STALE) {
			return Promise.resolve(selectMembers(state));
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
