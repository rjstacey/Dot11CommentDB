import { createSelector, createAction, EntityId } from "@reduxjs/toolkit";

import {
	fetcher,
	setError,
	displayDate,
	createAppTableDataSlice,
	getAppTableDataSelectors,
	FieldType,
	Fields,
} from "dot11-components";

import type { RootState, AppThunk } from ".";
import { selectCurrentSession, selectSessionEntities } from "./sessions";
import { ImatMeeting, imatMeetingsSchema } from "@schemas/imat";

export type { ImatMeeting };

export type SyncedImatMeeting = ImatMeeting & {
	sessionId: number | null;
};

export const fields: Fields = {
	id: { label: "Meeting number", type: FieldType.NUMERIC },
	start: {
		label: "Start",
		dataRenderer: /*displayDate*/ (d: string) => `Here: ${d}`,
		type: FieldType.DATE,
	},
	end: { label: "End", dataRenderer: displayDate, type: FieldType.DATE },
	name: { label: "Name" },
	type: { label: "Type" },
	timezone: { label: "Time zone" },
	sessionId: { label: "Session" },
};

const initialState = {
	groupName: null as string | null,
	lastLoad: null as string | null,
};
const dataSet = "imatMeetings";
const selectId = (d: ImatMeeting) => d.id;
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState,
	selectId,
	reducers: {},
	extraReducers(builder, dataAdapter) {
		builder
			.addMatcher(
				(action) => action.type === getPending.toString(),
				(state, action: ReturnType<typeof getPending>) => {
					const { groupName } = action.payload;
					state.lastLoad = new Date().toISOString();
					if (state.groupName !== groupName) {
						state.groupName = groupName;
						dataAdapter.removeAll(state);
					}
				}
			)
			.addMatcher(
				(action) => action.type === clearImatMeetings.toString(),
				(state) => {
					dataAdapter.removeAll(state);
					state.valid = false;
				}
			);
	},
});

export default slice;

/* Slice actions */
export const imatMeetingsActions = slice.actions;

const { getSuccess, getFailure } = slice.actions;

// Override the default getPending()
const getPending = createAction<{ groupName: string }>(dataSet + "/getPending");
export const clearImatMeetings = createAction(dataSet + "/clear");

/* Selectors */
export const selectImatMeetingsState = (state: RootState) => state[dataSet];
const selectImatMeetingsAge = (state: RootState) => {
	const lastLoad = selectImatMeetingsState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
export const selectImatMeetingEntities = (state: RootState) =>
	selectImatMeetingsState(state).entities;
export const selectImatMeetingIds = (state: RootState) =>
	selectImatMeetingsState(state).ids;

export const selectSyncedImatMeetingEntities = createSelector(
	selectImatMeetingIds,
	selectImatMeetingEntities,
	selectSessionEntities,
	(imatMeetingIds, imatMeetingEntities, sessionEntities) => {
		const newEntities: Record<EntityId, SyncedImatMeeting> = {};
		const sessions = Object.values(sessionEntities);
		imatMeetingIds.forEach((id) => {
			const session = sessions.find((s) => s!.imatMeetingId === id);
			newEntities[id] = {
				...imatMeetingEntities[id]!,
				sessionId: session?.id || null,
			};
		});
		return newEntities;
	}
);

export const selectCurrentImatMeeting = (state: RootState) => {
	const session = selectCurrentSession(state);
	const imatMeetingId = session?.imatMeetingId;
	return imatMeetingId
		? selectImatMeetingEntities(state)[imatMeetingId]
		: undefined;
};

export const selectImatMeeting = (state: RootState, imatMeetingId: number) =>
	selectImatMeetingEntities(state)[imatMeetingId];

export const imatMeetingsSelectors = getAppTableDataSelectors(
	selectImatMeetingsState,
	{ selectEntities: selectSyncedImatMeetingEntities }
);

/* Thunk actions */
const AGE_STALE = 60 * 60 * 1000; // 1 hour
let loading = false;
let loadingPromise: Promise<void>;
export const loadImatMeetings =
	(groupName: string, force = false): AppThunk<void> =>
	(dispatch, getState) => {
		const state = getState();
		const currentGroupName = selectImatMeetingsState(state).groupName;
		if (currentGroupName === groupName) {
			if (loading) return loadingPromise;
			const age = selectImatMeetingsAge(state);
			if (!force && age && age < AGE_STALE) return Promise.resolve();
		}
		dispatch(getPending({ groupName }));
		const url = `/api/${groupName}/imat/meetings`;
		loading = true;
		loadingPromise = fetcher
			.get(url)
			.then((response: unknown) => {
				const imatMeetings = imatMeetingsSchema.parse(response);
				dispatch(getSuccess(imatMeetings));
			})
			.catch((error: unknown) => {
				dispatch(getFailure());
				dispatch(setError("GET " + url, error));
			})
			.finally(() => {
				loading = false;
			});
		return loadingPromise;
	};
