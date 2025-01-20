import {
	createSlice,
	createEntityAdapter,
	PayloadAction,
	createSelector,
} from "@reduxjs/toolkit";
import { fetcher, setError } from "dot11-components";

import type { RootState, AppThunk } from ".";
import { UserMember, userMembersSchema } from "@schemas/members";

export type { UserMember };

type ExtraState = {
	valid: boolean;
	loading: boolean;
	groupName: string | null;
	lastLoad: string | null;
};

const selectId = (user: UserMember) => user.SAPIN;
const dataAdapter = createEntityAdapter<UserMember>({ selectId });
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
	const lastLoad = selectMembersState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
export const selectMembers = createSelector(
	selectMemberIds,
	selectMemberEntities,
	(ids, entities) => ids.map((id) => entities[id]!)
);

export const selectMemberName = (state: RootState, sapin: number) => {
	const m = selectMember(state, sapin);
	return m ? m.Name : "Unknown";
};

/* Thunk actions */
const AGE_STALE = 60 * 60 * 1000; // 1 hour
let loading = false;
let loadingPromise: Promise<UserMember[]>;
export const loadMembers =
	(groupName: string): AppThunk<UserMember[]> =>
	(dispatch, getState) => {
		const state = getState();
		const currentGroupName = selectMembersState(state).groupName;
		if (currentGroupName === groupName) {
			if (loading) return loadingPromise;
			const age = selectMembersAge(state);
			if (age && age < AGE_STALE)
				return Promise.resolve(selectMembers(state));
		}
		dispatch(getPending({ groupName }));
		const url = `/api/${groupName}/members/user`;
		loading = true;
		loadingPromise = fetcher
			.get(url)
			.then((response: unknown) => {
				const userMembers = userMembersSchema.parse(response);
				dispatch(getSuccess(userMembers));
				return selectMembers(getState());
			})
			.catch((error: unknown) => {
				dispatch(getFailure());
				dispatch(setError("GET " + url, error));
				return selectMembers(getState());
			})
			.finally(() => {
				loading = false;
			});
		return loadingPromise;
	};
