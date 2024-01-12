import {
	createSelector,
	createAction,
	EntityId,
} from "@reduxjs/toolkit";

import {
	fetcher,
	setError,
	displayDate,
	createAppTableDataSlice,
	getAppTableDataSelectors,
	FieldType,
	isObject,
	Fields,
} from "dot11-components";

import type { RootState, AppThunk } from ".";
import { selectCurrentSession, selectSessionEntities } from "./sessions";

export type ImatMeeting = {
	id: number;
	organizerId: string;
	organizerSymbol: string;
	organizerName: string;
	name: string;
	type: string;
	start: string;
	end: string;
	timezone: string;
};

export type SyncedImatMeeting = ImatMeeting & {
	sessionId: number | null;
};

export const fields: Fields = {
	id: { label: "Meeting number", type: FieldType.NUMERIC },
	start: { label: "Start", dataRenderer: /*displayDate*/ (d: any) => `Here: ${d}`, type: FieldType.DATE },
	end: { label: "End", dataRenderer: displayDate, type: FieldType.DATE },
	name: { label: "Name" },
	type: {	label: "Type" },
	timezone: { label: "Time zone" },
	sessionId: { label: "Session" },
};

const initialState: {
	groupName: string | null;
} = {
	groupName: null,
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
		builder.addMatcher(
			(action) => action.type === getPending.toString(),
			(state, action: ReturnType<typeof getPending>) => {
				const { groupName } = action.payload;
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

/* Basic actions */
export const imatMeetingsActions = slice.actions;

const { getSuccess, getFailure } = slice.actions;

// Override the default getPending()
const getPending = createAction<{ groupName: string }>(dataSet + "/getPending");
export const clearImatMeetings = createAction(dataSet + "/clear");

/* Selectors */
export const selectImatMeetingsState = (state: RootState) => state[dataSet];
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
function validImatMeeting(imatMeeting: any): imatMeeting is ImatMeeting {
	return (
		isObject(imatMeeting) &&
		typeof imatMeeting.id === "number" &&
		typeof imatMeeting.name === "string" &&
		typeof imatMeeting.type === "string" &&
		typeof imatMeeting.start === "string" &&
		typeof imatMeeting.end === "string" &&
		typeof imatMeeting.timezone === "string"
	);
}

function validGetResponse(response: any): response is ImatMeeting[] {
	return Array.isArray(response) && response.every(validImatMeeting);
}

let loadingPromise: Promise<ImatMeeting[]>;
export const loadImatMeetings =
	(groupName: string): AppThunk<ImatMeeting[]> =>
	(dispatch, getState) => {
		const { loading, groupName: currentGroupName } =
			selectImatMeetingsState(getState());
		if (loading && currentGroupName === groupName) {
			return loadingPromise;
		}
		dispatch(getPending({ groupName }));
		loadingPromise = fetcher
			.get(`/api/${groupName}/imat/meetings`)
			.then((response: any) => {
				if (!validGetResponse(response))
					throw new TypeError("Unexpected response to GET");
				dispatch(getSuccess(response));
				return response;
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("Unable to get meetings list", error));
				return [];
			});
		return loadingPromise;
	};
