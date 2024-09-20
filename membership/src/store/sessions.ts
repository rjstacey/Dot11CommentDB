import {
	createSlice,
	createEntityAdapter,
	createSelector,
	EntityId,
	PayloadAction,
} from "@reduxjs/toolkit";
import { DateTime } from "luxon";

import { fetcher, setError, isObject } from "dot11-components";

import type { RootState, AppThunk } from ".";

export interface Session {
	id: number;
	number: number | null;
	name: string;
	type: SessionType;
	groupId: string | null;
	imatMeetingId: number | null;
	OrganizerID: string;
	timezone: string;
	startDate: string;
	endDate: string;
	attendees: number;
}

export type SessionAdd = Omit<Session, "id" | "Attendees">;

export const SessionTypeLabels = {
	p: "Plenary",
	i: "Interim",
	o: "Other",
	g: "General",
} as const;

export type SessionType = keyof typeof SessionTypeLabels;

export const SessionTypeOptions = Object.entries(SessionTypeLabels).map(
	([value, label]) =>
		({ value, label } as { value: SessionType; label: string })
);

function validSession(session: any): session is Session {
	return (
		isObject(session) &&
		typeof session.id === "number" &&
		(session.number === null || typeof session.number === "number") &&
		typeof session.name === "string" &&
		["p", "i", "o", "g"].includes(session.type) &&
		(session.groupId === null || typeof session.groupId === "string") &&
		(session.imatMeetingId === null ||
			typeof session.imatMeetingId === "number") &&
		/\d{4}-\d{2}-\d{2}/.test(session.startDate) &&
		/\d{4}-\d{2}-\d{2}/.test(session.endDate) &&
		typeof session.timezone === "string"
	);
}

export const displaySessionType = (type: SessionType | null) =>
	type ? SessionTypeLabels[type] : "";

/*
 * Slice
 */
const dataSet = "sessions";

type ExtraState = {
	loading: boolean;
	valid: boolean;
	groupName: string | null;
};
const sortComparer = (a: Session, b: Session) =>
	DateTime.fromISO(b.startDate).toMillis() -
	DateTime.fromISO(a.startDate).toMillis();
const dataAdapter = createEntityAdapter<Session>({ sortComparer });
const initialState = dataAdapter.getInitialState<ExtraState>({
	loading: false,
	valid: false,
	groupName: null,
});

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
		clear(state) {
			state.groupName = null;
			state.valid = false;
			dataAdapter.removeAll(state);
		},
		upsertMany: dataAdapter.upsertMany,
	},
});

export default slice;

/*
 * Slice actions
 */
export const sessionsActions = slice.actions;

const {
	getPending,
	getSuccess,
	getFailure,
	clear: clearSessions,
	upsertMany: upsertSessions,
} = slice.actions;

export { clearSessions, upsertSessions };

/*
 * Selectors
 */
export const selectSessionsState = (state: RootState) => state[dataSet];
export const selectSessionIds = (state: RootState) =>
	selectSessionsState(state).ids;
export const selectSessionEntities = (state: RootState) =>
	selectSessionsState(state).entities;

export const selectSessions = createSelector(
	selectSessionIds,
	selectSessionEntities,
	(ids, entities) => ids.map((id) => entities[id]!)
);

export const selectRecentSessions = createSelector(
	selectSessions,
	(sessions) => {
		const today = new Date();
		return sessions.filter((s) => new Date(s.startDate) < today);
		//.slice(0, 8);
	}
);

export const selectSession = (state: RootState, id: EntityId) =>
	selectSessionEntities(state)[id];

/*
 * Thunk actions
 */

function validSessions(sessions: any): sessions is Session[] {
	return Array.isArray(sessions) && sessions.every(validSession);
}

let loadingPromise: Promise<Session[]> | undefined;
export const loadSessions =
	(groupName: string): AppThunk<Session[]> =>
	async (dispatch, getState) => {
		const state = getState();
		const { loading, groupName: currentGroupName } =
			selectSessionsState(state);
		if (loading && currentGroupName === groupName) {
			return loadingPromise!;
		}
		dispatch(getPending({ groupName }));
		const url = `/api/${groupName}/sessions`;
		loadingPromise = fetcher
			.get(url, { type: ["p", "i"] })
			.then((response: any) => {
				if (!validSessions(response))
					throw new TypeError("Unexpected response to GET " + url);
				dispatch(getSuccess(response));
				return response;
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("Unable to get sessions", error));
				return [];
			})
			.finally(() => {
				loadingPromise = undefined;
			});
		return loadingPromise!;
	};
