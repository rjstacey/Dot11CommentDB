import {
	createSelector,
	createAction,
	EntityId,
	Action,
} from "@reduxjs/toolkit";
import isEqual from "lodash.isequal";

import {
	fetcher,
	createAppTableDataSlice,
	Fields,
	FieldType,
	getAppTableDataSelectors,
} from "@common";

import type { RootState, AppThunk } from ".";
import { setError } from ".";
import type { ContactInfo } from "./members";
import { selectMemberEntities } from "./members";
import { selectSessionEntities } from "./sessions";
import {
	getNullAttendanceSummary,
	selectAttendanceSummaryEntitiesForSession,
	SessionAttendanceSummary,
} from "./attendanceSummaries";
import {
	imatAttendanceSummariesSchema,
	type ImatAttendanceSummary,
} from "@schemas/imat";
export type { ImatAttendanceSummary };

export const fields: Fields = {
	SAPIN: { label: "SA PIN", type: FieldType.NUMERIC },
	"Name/Email": { label: "Name/Email" },
	Name: { label: "Name" },
	LastName: { label: "Family name" },
	FirstName: { label: "Given name" },
	MI: { label: "MI" },
	Email: { label: "Email" },
	"Employer/Affiliation": { label: "Employer/Affiliation" },
	Employer: { label: "Employer" },
	Affiliation: { label: "Affiliation" },
	ContactInfo: { label: "Contact Info" },
	Status: { label: "Status" },
	AttendancePercentage: { label: "Attendance", type: FieldType.NUMERIC },
	AttendanceOverride: { label: "Attendance override" },
	InPerson: {
		label: "In-Person",
		options: [
			{ value: true, label: "In-person x" },
			{ value: false, label: "Remote x" },
		],
	},
	IsRegistered: { label: "Registered" },
	Notes: { label: "Notes" },
};

type ImatAttendanceSummaryWithSummary = ImatAttendanceSummary &
	SessionAttendanceSummary;

export type SyncedSessionAttendee = ImatAttendanceSummaryWithSummary & {
	Status: string;
	OldName: string | null;
	OldAffiliation: string | null;
	OldEmployer: string | null;
	OldEmail: string | null;
	OldContactInfo: ContactInfo | null;
};

/*
 * Slice
 */
const selectId = (attendee: ImatAttendanceSummary) => attendee.SAPIN;
const sortComparer = (m1: ImatAttendanceSummary, m2: ImatAttendanceSummary) =>
	m1.SAPIN - m2.SAPIN;

const initialState: {
	groupName: string | null;
	sessionId: number | null;
	useDaily: boolean; // derive from IMAT "daily attendance" (vs "attendance summary")
	lastLoad: string | null;
} = {
	groupName: null,
	sessionId: null,
	useDaily: false,
	lastLoad: null,
};

const dataSet = "imatAttendanceSummary";
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
					const { groupName, sessionId, useDaily } = action.payload;
					if (
						groupName !== state.groupName ||
						sessionId !== state.sessionId ||
						useDaily !== state.useDaily
					) {
						state.groupName = groupName;
						state.sessionId = sessionId;
						state.useDaily = useDaily;
						state.valid = false;
						dataAdapter.removeAll(state);
					}
					state.lastLoad = new Date().toISOString();
				}
			)
			.addMatcher(
				(action: Action) =>
					action.type === clearImatAttendanceSummary.toString(),
				(state) => {
					state.groupName = null;
					state.sessionId = null;
					state.valid = false;
					dataAdapter.removeAll(state);
					state.lastLoad = null;
				}
			);
	},
});

export default slice;

/*
 * Slice actions
 */
export const sessionAttendeesActions = slice.actions;
export const { setSelected } = slice.actions;
export const clearImatAttendanceSummary = createAction(dataSet + "/clear");

const { getSuccess, getFailure } = slice.actions;
// Overload getPending() with one that sets groupName
const getPending = createAction<{
	groupName: string;
	sessionId: number | null;
	useDaily: boolean;
}>(dataSet + "/getPending");

/*
 * Selectors
 */
export const selectImatAttendanceSummaryState = (state: RootState) =>
	state[dataSet];
const selectSessionAttendeesAge = (state: RootState) => {
	const lastLoad = selectImatAttendanceSummaryState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
export const selectImatAttendanceSummaryGroupName = (state: RootState) =>
	selectImatAttendanceSummaryState(state).groupName;
export const selectImatAttendanceSummaryIds = (state: RootState) =>
	selectImatAttendanceSummaryState(state).ids;
export const selectImatAttendanceSummaryEntities = (state: RootState) =>
	selectImatAttendanceSummaryState(state).entities;
export const selectImatAttendanceSummarySessionId = (state: RootState) =>
	selectImatAttendanceSummaryState(state).sessionId;
export const selectImatAttendanceSummarySession = (state: RootState) => {
	const sessionId = selectImatAttendanceSummarySessionId(state);
	if (sessionId) return selectSessionEntities(state)[sessionId];
};
export const selectImatAttendanceSummarySelected = createSelector(
	(state: RootState) => selectImatAttendanceSummaryState(state).selected,
	selectImatAttendanceSummaryEntities,
	(selected, entities) => selected.filter((id) => Boolean(entities[id]))
);

export const selectSyncedImatAttendanceSummaryEntities = createSelector(
	selectImatAttendanceSummaryIds,
	selectImatAttendanceSummaryEntities,
	(state: RootState) =>
		selectAttendanceSummaryEntitiesForSession(
			state,
			selectImatAttendanceSummarySessionId(state)
		),
	selectMemberEntities,
	selectImatAttendanceSummarySessionId,
	(ids, entities, attendanceSummaryEntities, memberEntities, session_id) => {
		const syncedEntities: Record<EntityId, SyncedSessionAttendee> = {};

		ids.forEach((id) => {
			const entity = entities[id]!;
			const a =
				attendanceSummaryEntities[entity.SAPIN] ||
				getNullAttendanceSummary(session_id || 0, entity.SAPIN);
			const syncedEntity: SyncedSessionAttendee = {
				...a,
				...entity,
				OldAffiliation: null,
				OldEmployer: null,
				OldName: null,
				OldEmail: null,
				OldContactInfo: null,
				Status: "New",
			};
			const m = memberEntities[id];
			if (m) {
				syncedEntity.Status = m.Status;
				if (m.Affiliation !== syncedEntity.Affiliation)
					syncedEntity.OldAffiliation = m.Affiliation;
				if (
					syncedEntity.Employer !== undefined &&
					m.Employer !== entity.Employer
				)
					syncedEntity.OldEmployer = m.Employer;
				if (m.Email !== entity.Email) syncedEntity.OldEmail = m.Email;
				if (m.Name !== entity.Name) syncedEntity.OldName = m.Name;
				if (
					syncedEntity.Employer !== undefined &&
					!isEqual(m.ContactInfo, entity.ContactInfo)
				) {
					syncedEntity.OldContactInfo = m.ContactInfo;
				}
			}
			syncedEntities[id] = syncedEntity;
		});
		return syncedEntities;
	}
);

export const sessionAttendeesSelectors = getAppTableDataSelectors(
	selectImatAttendanceSummaryState,
	{ selectEntities: selectSyncedImatAttendanceSummaryEntities }
);

/*
 * Thunk actions
 */
const AGE_STALE = 60 * 60 * 1000; // 1 hour

let loadingPromise: Promise<void>;
export const loadImatAttendanceSummary =
	(
		groupName: string,
		sessionId: number,
		useDaily = false,
		force = false
	): AppThunk<void> =>
	async (dispatch, getState) => {
		const session = selectSessionEntities(getState())[sessionId];
		if (!session || !session.imatMeetingId) {
			dispatch(
				setError(
					"Can't retrieve attendance",
					session
						? "No IMAT meeting associated with session"
						: "Bad session"
				)
			);
			dispatch(clearImatAttendanceSummary());
			return;
		}

		const { loading, ...current } =
			selectImatAttendanceSummaryState(getState());
		if (
			groupName === current.groupName &&
			session.id === current.sessionId &&
			useDaily === current.useDaily
		) {
			if (loading) return loadingPromise;
			const age = selectSessionAttendeesAge(getState());
			if (!force && age && age < AGE_STALE) return;
		}

		dispatch(getPending({ groupName, sessionId: session.id, useDaily }));
		const url = `/api/${groupName}/imat/attendance/${session.imatMeetingId}/summary`;
		loadingPromise = fetcher
			.get(url, { useDaily })
			.then((response) => {
				const imatAttendances =
					imatAttendanceSummariesSchema.parse(response);
				dispatch(getSuccess(imatAttendances));
			})
			.catch((error) => {
				dispatch(getFailure());
				dispatch(setError("GET " + url, error));
			});
		return loadingPromise;
	};
