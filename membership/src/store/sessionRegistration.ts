import {
	createAction,
	Action,
	createSelector,
	EntityId,
} from "@reduxjs/toolkit";
import { fetcher } from "@common";
import {
	createAppTableDataSlice,
	Fields,
	FieldType,
	getAppTableDataSelectors,
} from "@common";

import type { RootState, AppThunk } from ".";
import { setError } from ".";
import {
	SessionAttendanceSummary,
	upsertAttendanceSummaries,
	selectAttendanceSummaryEntitiesForSession,
} from "./attendanceSummaries";
import {
	uploadSessionRegistrationResponseSchema,
	SessionRegistration,
	UploadSessionRegistrationResponse,
} from "@schemas/registration";
import { selectSessionByNumber } from "./sessions";

export type { SessionRegistration };

export const fields: Fields = {
	SAPIN: { label: "SA PIN", type: FieldType.NUMERIC },
	Name: { label: "Name" },
	LastName: { label: "Last name" },
	FirstName: { label: "First name" },
	Email: { label: "Email" },
	Status: { label: "Status" },
	RegType: { label: "Registration type" },
	Matched: { label: "Matched", type: FieldType.STRING },
	AttendancePercentage: { label: "Attendance", type: FieldType.NUMERIC },
	IsRegistered: { label: "Registered" },
	InPerson: { label: "In-Person" },
	Notes: { label: "Notes" },
};

type SyncedSessionRegistration = SessionRegistration &
	Pick<
		SessionAttendanceSummary,
		"InPerson" | "IsRegistered" | "AttendancePercentage" | "Notes"
	>;

export type SessionRegistrationUpdate = {
	id: number;
	changes: Partial<SessionRegistration>;
};

/*
 * Slice
 */
const selectId = (registrant: SessionRegistration) => registrant.id;
const sortComparer = (r1: SessionRegistration, r2: SessionRegistration) =>
	r1.SAPIN && r2.SAPIN ? r1.SAPIN - r2.SAPIN : 0;

const initialState: {
	groupName: string | null;
	sessionId: number | null;
} = {
	groupName: null,
	sessionId: null,
};

const dataSet = "sessionRegistration";
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
					action.type === clearSessionRegistration.toString(),
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
export const sessionRegistrationActions = slice.actions;
export const { setSelected, updateMany: updateManySessionRestrations } =
	slice.actions;
export const clearSessionRegistration = createAction(dataSet + "/clear");

const { getSuccess, getFailure } = slice.actions;

// Overload getPending() with one that sets groupName
const getPending = createAction<{
	groupName: string;
	sessionId: number | null;
}>(dataSet + "/getPending");

/** Selectors */
export const selectSessionRegistrationState = (state: RootState) =>
	state[dataSet];
export const selectSessionRegistrationIds = (state: RootState) =>
	selectSessionRegistrationState(state).ids;
export const selectSessionRegistrationEntities = (state: RootState) =>
	selectSessionRegistrationState(state).entities;
export const selectSessionRegistrationSessionId = (state: RootState) =>
	selectSessionRegistrationState(state).sessionId;
export const selectSessionRegistrationSummarySessionId = (state: RootState) =>
	selectSessionRegistrationState(state).sessionId;

export const selectSyncedSessionRegistrationEntities = createSelector(
	selectSessionRegistrationIds,
	selectSessionRegistrationEntities,
	(state: RootState) =>
		selectAttendanceSummaryEntitiesForSession(
			state,
			selectSessionRegistrationSummarySessionId(state)
		),
	(ids, entities, attendanceSummaryEntities) => {
		const syncedEntities: Record<EntityId, SyncedSessionRegistration> = {};

		ids.forEach((id) => {
			const entity = entities[id]!;
			const a = entity.CurrentSAPIN
				? attendanceSummaryEntities[entity.CurrentSAPIN]
				: undefined;
			const syncedEntity: SyncedSessionRegistration = {
				...entity,
				InPerson: a ? a.InPerson : null,
				IsRegistered: a ? a.IsRegistered : null,
				AttendancePercentage: a ? a.AttendancePercentage : null,
				Notes: a ? a.Notes : null,
			};
			syncedEntities[id] = syncedEntity;
		});
		return syncedEntities;
	}
);

export const sessionRegistrationSelectors = getAppTableDataSelectors(
	selectSessionRegistrationState,
	{
		selectEntities: selectSyncedSessionRegistrationEntities,
		selectIds: selectSessionRegistrationIds,
	}
);

/** Thunk actions */
export const uploadSessionRegistration =
	(groupName: string, sessionNumber: number, file: File): AppThunk =>
	async (dispatch, getState) => {
		const session = selectSessionByNumber(getState(), sessionNumber);
		if (!session) {
			dispatch(
				setError("Can't upload registration", "Bad session number")
			);
			return;
		}
		const url = `/api/${groupName}/attendances/${session.id}/upload?format=registration`;
		dispatch(getPending({ groupName, sessionId: session.id }));
		let r: UploadSessionRegistrationResponse;
		try {
			const response = await fetcher.postFile(url, file);
			r = uploadSessionRegistrationResponseSchema.parse(response);
		} catch (error) {
			dispatch(getFailure());
			dispatch(setError("POST " + url, error));
			return;
		}
		dispatch(getSuccess(r.registrations));
		dispatch(upsertAttendanceSummaries(r.attendances));
	};
