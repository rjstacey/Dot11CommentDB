import {
	createAction,
	createSelector,
	isPlainObject,
	Action,
	Dictionary,
} from "@reduxjs/toolkit";

import { fetcher } from "@common";
import {
	setError,
	createAppTableDataSlice,
	Fields,
	FieldType,
	getAppTableDataSelectors,
} from "@common";

import type { RootState, AppThunk } from ".";
import { selectMembersState, selectMemberEntities, Member } from "./members";

export const fields: Fields = {
	SAPIN: { label: "SA PIN", type: FieldType.NUMERIC },
	Name: { label: "Name" },
	LastName: { label: "Last name" },
	FirstName: { label: "First name" },
	MI: { label: "MI" },
	Email: { label: "Email" },
	Status: { label: "Status" },
};

export type MyProjectRosterEntry = {
	id: number;
	SAPIN: number | null;
	Name: string;
	LastName: string;
	FirstName: string;
	MI: string;
	Email: string;
	Employer: string;
	Affiliation: string;
	OfficerRole: string;
	Status: string;
};

export type SyncedMyProjectRosterEntry = MyProjectRosterEntry & {
	m_Name?: string;
	m_LastName?: string;
	m_FirstName?: string;
	m_MI?: string;
	m_Email?: string;
	m_Employer?: string;
	m_Affiliation?: string;
	m_Status?: string;
};

/*
 * Slice
 */
const selectId = (registrant: MyProjectRosterEntry) => registrant.id;
const sortComparer = (r1: MyProjectRosterEntry, r2: MyProjectRosterEntry) =>
	r1.SAPIN && r2.SAPIN ? r1.SAPIN - r2.SAPIN : 0;

const initialState: {
	groupName: string | null;
} = {
	groupName: null,
};

const dataSet = "myProjectRoster";
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	sortComparer,
	initialState,
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
				(action: Action) =>
					action.type === clearMyProjectRoster.toString(),
				(state) => {
					state.groupName = null;
					state.valid = false;
					dataAdapter.removeAll(state);
				}
			);
	},
});

export default slice;

/** Slice actions */
export const myProjectRosterActions = slice.actions;
export const { setSelected } = slice.actions;
export const clearMyProjectRoster = createAction(dataSet + "/clear");

const { getSuccess, getFailure } = slice.actions;

// Overload getPending() with one that sets groupName
const getPending = createAction<{
	groupName: string;
}>(dataSet + "/getPending");

/** Selectors */
export const selectMyProjectRosterState = (state: RootState) => state[dataSet];
export const selectMyProjectRosterIds = (state: RootState) =>
	selectMyProjectRosterState(state).ids;
export const selectMyProjectRosterEntities = (state: RootState) =>
	selectMyProjectRosterState(state).entities;

const selectSyncedMyProjectRosterEntities = createSelector(
	selectMyProjectRosterIds,
	selectMyProjectRosterEntities,
	selectMemberEntities,
	(ids, entities, memberEntities) => {
		const syncedEntities: Dictionary<SyncedMyProjectRosterEntry> = {};
		const members = Object.values(memberEntities) as Member[];
		for (const id of ids) {
			const r = entities[id]!;
			const email = r.Email.toLowerCase();
			let sapin = r.SAPIN || 0;
			let m = memberEntities[sapin];
			if (!m) m = members.find((m) => m.Email.toLowerCase() === email);
			if (m) sapin = m.SAPIN;
			syncedEntities[id] = {
				...r,
				m_Name: m?.Name,
				m_LastName: m?.LastName,
				m_FirstName: m?.FirstName,
				m_MI: m?.MI,
				m_Employer: m?.Employer,
				m_Affiliation: m?.Affiliation,
				m_Status: m?.Status,
			} satisfies SyncedMyProjectRosterEntry;
		}
		return syncedEntities;
	}
);

export const myProjectRosterSelectors = getAppTableDataSelectors(
	selectMyProjectRosterState,
	{ selectEntities: selectSyncedMyProjectRosterEntities }
);

/** Thunk actions */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isGenericObject(o: unknown): o is Record<string, any> {
	return isPlainObject(o);
}

function validMyProjectRosterEntry(
	entry: unknown
): entry is MyProjectRosterEntry {
	return (
		isGenericObject(entry) &&
		typeof entry.id === "number" &&
		(entry.SAPIN === null || typeof entry.SAPIN === "number") &&
		typeof entry.Email === "string" &&
		typeof entry.Name === "string" &&
		typeof entry.LastName === "string" &&
		typeof entry.FirstName === "string" &&
		typeof entry.MI === "string" &&
		typeof entry.Status === "string"
	);
}

function validMyProjectRoster(
	roster: unknown
): roster is MyProjectRosterEntry[] {
	return Array.isArray(roster) && roster.every(validMyProjectRosterEntry);
}

export const parseMyProjectRoster =
	(file: File): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectMembersState(getState()).groupName;
		const url = `/api/${groupName}/members/myProjectRoster`;
		if (!groupName) {
			dispatch(setError("Unable to upload roster", "Group not selected"));
			return;
		}
		dispatch(getPending({ groupName }));
		let response: unknown;
		try {
			response = await fetcher.postFile(url, file);
			if (!validMyProjectRoster(response))
				throw new TypeError("Unexpected response to POST " + url);
		} catch (error) {
			dispatch(getFailure());
			dispatch(setError("Unable to upload MyProject roster", error));
			return;
		}
		dispatch(getSuccess(response));
	};

export type UpdateRosterOptions = {
	appendNew?: boolean;
	removeUnchanged?: boolean;
};

export const updateMyProjectRoster =
	(file: File, options: UpdateRosterOptions): AppThunk =>
	async (dispatch, getState) => {
		const { groupName } = selectMembersState(getState());
		if (!groupName) {
			dispatch(setError("Unable to import roster", "Group not selected"));
			return;
		}
		const url = `/api/${groupName}/members/MyProjectRoster`;
		try {
			await fetcher.patchFile(url, file, options);
		} catch (error) {
			dispatch(setError("Unable to get file", error));
		}
	};
