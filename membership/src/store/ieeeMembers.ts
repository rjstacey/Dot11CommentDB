import { createAction, createSelector, Action } from "@reduxjs/toolkit";

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	FieldType,
	isObject,
} from "dot11-components";

import type { RootState, AppThunk } from ".";
import type { MemberContactEmail, MemberContactInfo } from "./members";

export type IeeeMember = {
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
const dataSet = "ieeeMembers";
const selectId = (m: IeeeMember) => m.SAPIN;
const sortComparer = (m1: IeeeMember, m2: IeeeMember) => m1.SAPIN - m2.SAPIN;
const initialState: { groupName: string | null } = { groupName: null };
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState,
	selectId,
	sortComparer,
	reducers: {},
	extraReducers: (builder, dataAdapter) => {
		builder.addMatcher(
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

const { getPending, getSuccess, getFailure, setUiProperties, setSelected } =
	slice.actions;

export const clearUsers = createAction(dataSet + "/clear");

export { setSelected, setUiProperties };

/* Selectors */
export const selectIeeeMembersState = (state: RootState) => state[dataSet];
export const selectIeeeMemberIds = (state: RootState) =>
	selectIeeeMembersState(state).ids;
export function selectIeeeMemberEntities(state: RootState) {
	return selectIeeeMembersState(state).entities;
}
export const selectIeeeMembers = createSelector(
	selectIeeeMemberIds,
	selectIeeeMemberEntities,
	(ids, entities) =>
		ids
			.map((id) => entities[id]!)
			.sort((m1, m2) => m1.Name.localeCompare(m2.Name))
);

/* Thunk actions */
function validIeeeMember(member: any): member is IeeeMember {
	return isObject(member) && typeof member.SAPIN === "number";
}

function validResponse(members: unknown): members is IeeeMember[] {
	return Array.isArray(members) && members.every(validIeeeMember);
}

let loadingPromise: Promise<IeeeMember[]>;
export const loadIeeeMembers =
	(): AppThunk<IeeeMember[]> => (dispatch, getState) => {
		const { loading } = selectIeeeMembersState(getState());
		if (loading) {
			return loadingPromise;
		}
		dispatch(getPending());
		loadingPromise = fetcher
			.get(`/api/root/members`)
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
