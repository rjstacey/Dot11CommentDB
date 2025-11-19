import {
	createAction,
	createSelector,
	Action,
	Dictionary,
	PayloadAction,
} from "@reduxjs/toolkit";
import {
	createAppTableDataSlice,
	fetcher,
	Fields,
	FieldType,
	getAppTableDataSelectors,
	setError,
} from "@common";

import type { RootState, AppThunk } from ".";
import {
	loadAttendanceSummary,
	selectAttendanceSummariesIds,
	selectAttendanceSummariesEntities,
	type SessionAttendanceSummary,
} from "./attendanceSummaries";
import { selectSessionByNumber } from "./sessions";
import { selectMemberEntities } from "./members";
import { SessionAttendeesExportQuery } from "@schemas/attendances";

export const fields: Fields = {
	SAPIN: { label: "SA PIN", type: FieldType.NUMERIC },
	CurrentSAPIN: { label: "Current SA PIN", type: FieldType.NUMERIC },
	Name: { label: "Name" },
	LastName: { label: "Last name" },
	FirstName: { label: "First name" },
	Email: { label: "Email" },
	Status: { label: "Status" },
	AttendancePercentage: { label: "Attendance", type: FieldType.NUMERIC },
	AttendanceOverride: { label: "Attendance override" },
	IsRegistered: { label: "Registered" },
	InPerson: { label: "In-Person" },
	Notes: { label: "Notes" },
};

export type SyncedSessionAttendance = SessionAttendanceSummary & {
	Status: string;
	Name: string | null;
	LastName: string | null;
	FirstName: string | null;
	Affiliation: string | null;
	Employer: string | null;
	Email: string | null;
};

/* Fields derived from other fields */
export function getField(entity: SyncedSessionAttendance, key: string) {
	if (key === "CurrentSAPIN") {
		return entity.CurrentSAPIN !== entity.SAPIN ? entity.CurrentSAPIN : "";
	}
	if (key === "AttendanceOverride") {
		return entity.DidAttend
			? "Did attend"
			: entity.DidNotAttend
				? "Did not attend"
				: "";
	}
	return entity[key as keyof SessionAttendanceSummary];
}

/*
 * Slice
 */
const selectId = (registrant: SessionAttendanceSummary) => registrant.id;
const sortComparer = (
	r1: SessionAttendanceSummary,
	r2: SessionAttendanceSummary
) => (r1.SAPIN && r2.SAPIN ? r1.SAPIN - r2.SAPIN : 0);

const initialState: {
	groupName: string | null;
	sessionId: number | null;
} = {
	groupName: null,
	sessionId: null,
};

const dataSet = "sessionAttendanceSummary";
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	sortComparer,
	initialState,
	reducers: {
		setSessionId(
			state,
			action: PayloadAction<{ groupName: string; sessionId: number }>
		) {
			state.sessionId = action.payload.sessionId;
			state.groupName = action.payload.groupName;
		},
	},
	extraReducers: (builder, dataAdapter) => {
		builder
			.addMatcher(
				(action: Action) => action.type === getPending.toString(),
				(state, action: ReturnType<typeof getPending>) => {
					const { groupName, sessionId } = action.payload;
					if (
						groupName !== state.groupName ||
						sessionId !== state.sessionId
					) {
						state.groupName = groupName;
						state.sessionId = sessionId;
						state.valid = false;
						dataAdapter.removeAll(state);
					}
				}
			)
			.addMatcher(
				(action: Action) =>
					action.type === clearSessionAttendanceSummary.toString(),
				(state) => {
					state.groupName = null;
					state.sessionId = null;
					state.valid = false;
					dataAdapter.removeAll(state);
				}
			);
	},
});

export default slice;

/** Slice actions */
export const sessionAttendanceSummaryActions = slice.actions;
export const { setSessionId, setSelected } = slice.actions;
export const clearSessionAttendanceSummary = createAction(dataSet + "/clear");

// Overload getPending() with one that sets groupName
const getPending = createAction<{
	groupName: string;
	sessionId: number | null;
}>(dataSet + "/getPending");

/** Selectors */
export const selectSessionAttendanceSummaryState = (state: RootState) =>
	state[dataSet];
export const selectSessionAttendanceSummarySessionId = (state: RootState) =>
	selectSessionAttendanceSummaryState(state).sessionId;

export const selectSessionAttendanceSummaryIds = createSelector(
	selectSessionAttendanceSummarySessionId,
	selectAttendanceSummariesIds,
	selectAttendanceSummariesEntities,
	(session_id, ids, entities) =>
		ids.filter((id) => entities[id]?.session_id === session_id)
);

export const selectSessionAttendanceSummaryEntities =
	selectAttendanceSummariesEntities;

const selectSyncedSessionAttendanceSummaryEntities = createSelector(
	selectSessionAttendanceSummaryIds,
	selectSessionAttendanceSummaryEntities,
	selectMemberEntities,
	(ids, entities, memberEntities) => {
		const syncedEntities: Dictionary<SyncedSessionAttendance> = {};
		for (const id of ids) {
			const entity = entities[id]!;
			const m = memberEntities[entity.SAPIN];
			syncedEntities[id] = {
				...entity,
				Status: m?.Status || "",
				Name: m?.Name || "",
				LastName: m?.LastName || "",
				FirstName: m?.FirstName || "",
				Affiliation: m?.Affiliation || "",
				Employer: m?.Employer || "",
				Email: m?.Email || "",
			} satisfies SyncedSessionAttendance;
		}
		return syncedEntities;
	}
);

export const sessionAttendanceSummarySelectors = getAppTableDataSelectors(
	selectSessionAttendanceSummaryState,
	{
		selectEntities: selectSyncedSessionAttendanceSummaryEntities,
		selectIds: selectSessionAttendanceSummaryIds,
		getField,
	}
);

/** Thunk actions */
export const loadSessionAttendanceSummary =
	(groupName: string, session_id: number, force = false): AppThunk<void> =>
	async (dispatch) => {
		dispatch(setSessionId({ groupName, sessionId: session_id }));
		await dispatch(loadAttendanceSummary(groupName, session_id, force));
	};

export const exportAttendees =
	(
		groupName: string,
		sessionNumber: number,
		format: "minutes" | "dvl"
	): AppThunk =>
	async (dispatch, getState) => {
		const session = selectSessionByNumber(getState(), sessionNumber);
		if (!session) {
			dispatch(setError("Can't export attendees", "Bad session number"));
			return;
		}
		const url = `/api/${groupName}/attendances/${session.id}/export`;
		try {
			await fetcher.getFile(url, {
				format,
			} satisfies SessionAttendeesExportQuery);
		} catch (error) {
			dispatch(
				setError(
					"Unable to export attendees for session " +
						`id=${session.id}`,
					error
				)
			);
		}
	};
