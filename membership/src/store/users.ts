import { createAction, createSelector } from "@reduxjs/toolkit";
import type { Action } from "@reduxjs/toolkit";

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	FieldType,
	isObject,
} from "dot11-components";

import type { RootState, AppThunk } from ".";
import type { MemberContactEmail, MemberContactInfo } from "./members";

export type UserMember = {
	SAPIN: number;
	Name: string;
	FirstName: string;
	LastName: string;
	MI: string;
	Email: string;
	Employer: string;
	ContactEmails: MemberContactEmail[];
	ContactInfo: MemberContactInfo;
};

export const fields = {
	SAPIN: { label: "SA PIN", type: FieldType.NUMERIC },
	Name: { label: "Name" },
	Email: { label: "Email" },
	Employer: { label: "Employer" },
};

/* Slice */
const dataSet = "users";
const selectId = (m: UserMember) => m.SAPIN;
const sortComparer = (m1: UserMember, m2: UserMember) => m1.SAPIN - m2.SAPIN;
const initialState: { groupName: string | null } = { groupName: null };
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState,
	selectId,
	sortComparer,
	reducers: {},
	extraReducers: (builder, dataAdapter) => {
		builder
			.addMatcher(
				(action: Action) => action.type === getPending.toString(),
				(state, action: ReturnType<typeof getPending>) => {
					const { groupName } = action.payload;
					if (groupName !== state.groupName) {
						state.groupName = groupName;
						state.valid = false;
						dataAdapter.removeAll(state);
					}
				}
			)
			.addMatcher(
				(action: Action) => action.type === clearUsers.toString(),
				(state) => {
					state.groupName = null;
					state.valid = false;
					dataAdapter.removeAll(state);
				}
			);
	},
});

export default slice;

/* Slice actions */
export const usersActions = slice.actions;

const { getSuccess, getFailure, setUiProperties, setSelected } = slice.actions;

// Overload getPending() with one that sets groupName
const getPending = createAction<{ groupName: string }>(dataSet + "/getPending");
export const clearUsers = createAction(dataSet + "/clear");

export { setSelected, setUiProperties };

/* Selectors */
export const selectUsersState = (state: RootState) => state[dataSet];
export const selectUserIds = (state: RootState) => selectUsersState(state).ids;
export function selectUserEntities(state: RootState) {
	return selectUsersState(state).entities;
}
export const selectUsers = createSelector(
	selectUserIds,
	selectUserEntities,
	(ids, entities) =>
		ids
			.map((id) => entities[id]!)
			.sort((m1, m2) => m1.Name.localeCompare(m2.Name))
);

/* Thunk actions */
function validUserMember(member: any): member is UserMember {
	return isObject(member) && typeof member.SAPIN === "number";
}

function validResponse(members: unknown): members is UserMember[] {
	return Array.isArray(members) && members.every(validUserMember);
}

let loadingPromise: Promise<UserMember[]>;
export const loadUsers =
	(groupName: string): AppThunk<UserMember[]> =>
	(dispatch, getState) => {
		const { loading, groupName: currentGroupName } = selectUsersState(
			getState()
		);
		if (loading && currentGroupName === groupName) {
			return loadingPromise;
		}
		dispatch(getPending({ groupName }));
		loadingPromise = fetcher
			.get(`/api/${groupName}/members/user`)
			.then((response: any) => {
				if (!validResponse(response))
					throw new TypeError("Unexpected response to GET");
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
