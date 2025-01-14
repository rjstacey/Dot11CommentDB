import {
	createSlice,
	createEntityAdapter,
	createSelector,
	EntityId,
	PayloadAction,
} from "@reduxjs/toolkit";
import { DateTime } from "luxon";

import { fetcher, setError } from "dot11-components";

import type { RootState, AppThunk } from ".";

import { sessionsSchema, Session, SessionType } from "@schemas/sessions";
export type { Session };

export type SessionAdd = Omit<Session, "id" | "Attendees">;

export const SessionTypeLabels: Record<SessionType, string> = {
	p: "Plenary",
	i: "Interim",
	o: "Other",
	g: "General",
} as const;

export const SessionTypeOptions = Object.entries(SessionTypeLabels).map(
	([value, label]) =>
		({ value, label }) as { value: SessionType; label: string }
);

export const displaySessionType = (type: SessionType | null) =>
	type ? SessionTypeLabels[type] : "";

/** Slice */
const dataSet = "sessions";

type ExtraState = {
	loading: boolean;
	valid: boolean;
	groupName: string | null;
	lastLoad: string | null;
};
const sortComparer = (a: Session, b: Session) =>
	DateTime.fromISO(b.startDate).toMillis() -
	DateTime.fromISO(a.startDate).toMillis();
const dataAdapter = createEntityAdapter<Session>({ sortComparer });
const initialState = dataAdapter.getInitialState<ExtraState>({
	loading: false,
	valid: false,
	groupName: null,
	lastLoad: null,
});

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
		},
		clear(state) {
			state.groupName = null;
			state.valid = false;
			state.lastLoad = null;
			dataAdapter.removeAll(state);
		},
		updateOne: dataAdapter.updateOne,
		upsertMany: dataAdapter.upsertMany,
	},
});

export default slice;

/** Slice actions */
export const sessionsActions = slice.actions;
const {
	getPending,
	getSuccess,
	getFailure,
	clear: clearSessions,
	upsertMany: upsertSessions,
	updateOne: updateSession,
} = slice.actions;
export { clearSessions, upsertSessions, updateSession };

/** Selectors */
export const selectSessionsState = (state: RootState) => state[dataSet];
const selectSessionsAge = (state: RootState) => {
	const lastLoad = selectSessionsState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
export const selectSessionIds = (state: RootState) =>
	selectSessionsState(state).ids;
export const selectSessionEntities = (state: RootState) =>
	selectSessionsState(state).entities;
export const selectSessions = createSelector(
	selectSessionIds,
	selectSessionEntities,
	(ids, entities) => ids.map((id) => entities[id]!)
);

export const selectSessionByNumber = (state: RootState, number: number) => {
	const sessions = selectSessions(state);
	return sessions.find((session) => session.number === number);
};

export const selectRecentSessions = createSelector(
	selectSessions,
	(sessions) => {
		const today = new Date();
		return sessions
			.filter((s) => new Date(s.startDate) < today)
			.slice(0, 8);
	}
);

export const selectMostRecentAttendedSession = (state: RootState) => {
	const sessions = selectRecentSessions(state);
	return sessions[0];
};

export const selectSession = (state: RootState, id: EntityId) =>
	selectSessionEntities(state)[id];

/** Thunk actions */
const AGE_STALE = 60 * 60 * 1000; // 1 hour
let loading = false;
let loadingPromise: Promise<void>;
export const loadSessions =
	(groupName: string, force = false): AppThunk<void> =>
	async (dispatch, getState) => {
		const state = getState();
		const currentGroupName = selectSessionsState(state).groupName;
		if (currentGroupName === groupName) {
			if (loading) return loadingPromise;
			const age = selectSessionsAge(state);
			if (!force && age && age < AGE_STALE) return loadingPromise;
		}
		dispatch(getPending({ groupName }));
		const url = `/api/${groupName}/sessions`;
		loading = true;
		loadingPromise = fetcher
			.get(url, { type: ["p", "i"], limit: 20 })
			.then((response) => {
				const sessions = sessionsSchema.parse(response);
				dispatch(getSuccess(sessions));
			})
			.catch((error) => {
				dispatch(getFailure());
				dispatch(setError("GET " + url, error));
			})
			.finally(() => {
				loading = false;
			});
		return loadingPromise;
	};
