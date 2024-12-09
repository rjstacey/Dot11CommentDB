import { createAction, createSelector, Action } from "@reduxjs/toolkit";

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	FieldType,
	isObject,
} from "dot11-components";

import type { RootState, AppThunk } from ".";
import type { ContactEmail, ContactInfo } from "./members";

export type IeeeMember = {
	SAPIN: number;
	Name: string;
	FirstName: string;
	LastName: string;
	MI: string;
	Email: string;
	Employer: string;
	ContactEmails: ContactEmail[];
	ContactInfo: ContactInfo;
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
const initialState: { lastLoad: string | null } = { lastLoad: null };
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState,
	selectId,
	sortComparer,
	reducers: {},
	extraReducers: (builder, dataAdapter) => {
		builder.addMatcher(
			(action: Action) => action.type === dataSet + "/getPending",
			(state) => {
				state.lastLoad = new Date().toISOString();
			}
		);
		builder.addMatcher(
			(action: Action) => action.type === clearUsers.toString(),
			(state) => {
				state.lastLoad = null;
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
const selectIeeeMembersAge = (state: RootState) => {
	let lastLoad = selectIeeeMembersState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
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
			.sort((m1, m2) => {
				let n = m1.LastName.localeCompare(m2.LastName);
				if (n === 0) n = m1.FirstName.localeCompare(m2.FirstName);
				return n;
			})
);

/* Thunk actions */
function validIeeeMember(member: any): member is IeeeMember {
	return isObject(member) && typeof member.SAPIN === "number";
}

function validResponse(members: unknown): members is IeeeMember[] {
	return Array.isArray(members) && members.every(validIeeeMember);
}

const url = "/api/root/members";

const AGE_STALE = 60 * 60 * 1000; // 1 hour

let loading = false;
let loadingPromise: Promise<void> = Promise.resolve();
export const loadIeeeMembers =
	(force = false): AppThunk<void> =>
	(dispatch, getState) => {
		const age = selectIeeeMembersAge(getState());
		if (loading || (!force && age && age < AGE_STALE))
			return loadingPromise;

		dispatch(getPending());
		loading = true;
		loadingPromise = fetcher
			.get(url)
			.then((response: any) => {
				if (!validResponse(response))
					throw new TypeError("Unexpected response to GET");
				dispatch(getSuccess(response));
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("Unable to get users list", error));
			})
			.finally(() => {
				loading = false;
			});
		return loadingPromise;
	};
