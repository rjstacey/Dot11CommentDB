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
import { selectIeeeMemberEntities } from "./ieeeMembers";
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
	CurrentSAPIN: { label: "Current SA PIN", type: FieldType.NUMERIC },
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
	InPerson: { label: "In-Person" },
	IsRegistered: { label: "Registered" },
	Notes: { label: "Notes" },
};

type ImatAttendanceSummaryWithSummary = ImatAttendanceSummary &
	SessionAttendanceSummary;

export type SyncedSessionAttendee = ImatAttendanceSummaryWithSummary & {
	Status: string;
	CurrentName: string | null;
	CurrentAffiliation: string | null;
	CurrentEmployer: string | null;
	CurrentEmail: string | null;
	CurrentContactInfo: ContactInfo | null;
	CurrentAttendancePercentage: number | null;
};

/* Fields derived from other fields */
export function getField(entity: SyncedSessionAttendee, key: string) {
	if (key === "SAPIN") {
		return entity.SAPIN !== entity.CurrentSAPIN ? entity.SAPIN : "";
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
				},
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
				},
			);
	},
});

export default slice;

/*
 * Slice actions
 */
export const sessionAttendeesActions = slice.actions;
export const { setSelected, setUiProperties } = slice.actions;
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
	(selected, entities) => selected.filter((id) => Boolean(entities[id])),
);

export const selectImatAttendanceSummarySyncedEntities = createSelector(
	selectImatAttendanceSummaryIds,
	selectImatAttendanceSummaryEntities,
	(state: RootState) =>
		selectAttendanceSummaryEntitiesForSession(
			state,
			selectImatAttendanceSummarySessionId(state),
		),
	selectIeeeMemberEntities,
	selectMemberEntities,
	selectImatAttendanceSummarySessionId,
	(
		ids,
		entities,
		attendanceSummaryEntities,
		ieeeMemberEntities,
		memberEntities,
		session_id,
	) => {
		const syncedEntities: Record<EntityId, SyncedSessionAttendee> = {};
		const allSAPINs = new Set<number>(
			ids
				.map(Number)
				.concat(
					Object.values(attendanceSummaryEntities).map(
						(a) => a!.SAPIN,
					),
				),
		);
		allSAPINs.forEach((sapin) => {
			const entity = entities[sapin];
			const u = ieeeMemberEntities[sapin];
			const m = memberEntities[sapin];
			const a =
				attendanceSummaryEntities[sapin] ||
				getNullAttendanceSummary(session_id || 0, sapin);
			const AttendancePercentage = a.AttendancePercentage || 0;
			const syncedEntity: SyncedSessionAttendee = {
				...a,
				AttendancePercentage,
				Name: u?.Name || "",
				FirstName: u?.FirstName || "",
				LastName: u?.LastName || "",
				MI: u?.MI || "",
				Email: u?.Email || "",
				Employer: u?.Employer || "",
				Affiliation: "",
				ContactInfo: u?.ContactInfo || undefined,
				...entity,
				CurrentAttendancePercentage: null,
				CurrentAffiliation: null,
				CurrentEmployer: null,
				CurrentName: null,
				CurrentEmail: null,
				CurrentContactInfo: null,
				Status: "New",
			};
			if (
				syncedEntity.AttendancePercentage.toFixed(1) !==
				AttendancePercentage.toFixed(1)
			) {
				syncedEntity.CurrentAttendancePercentage = AttendancePercentage;
			}
			if (u && entity) {
				if (u.Name !== entity.Name) syncedEntity.CurrentName = u.Name;
				if (u.Email !== entity.Email)
					syncedEntity.CurrentEmail = u.Email;
				if (
					entity.Employer !== undefined &&
					u.Employer !== entity.Employer
				) {
					syncedEntity.CurrentEmployer = u.Employer;
				}
				if (
					entity.ContactInfo !== undefined &&
					!isEqual(u.ContactInfo, entity.ContactInfo)
				) {
					syncedEntity.CurrentContactInfo = u.ContactInfo;
				}
			}
			if (m && entity) {
				if (m.Affiliation !== entity.Affiliation)
					syncedEntity.CurrentAffiliation = m.Affiliation;
			}
			if (m) syncedEntity.Status = m.Status;
			syncedEntities[sapin] = syncedEntity;
		});
		return syncedEntities;
	},
);

export const selectImatAttendanceSummarySyncedIds = createSelector(
	selectImatAttendanceSummarySyncedEntities,
	(entities) =>
		Object.keys(entities)
			.map(Number)
			.sort((a, b) => a - b),
);

export const selectImatAttendanceSummarySelectedSyncedIds = createSelector(
	(state: RootState) => selectImatAttendanceSummaryState(state).selected,
	selectImatAttendanceSummarySyncedEntities,
	(selected, entities) => selected.filter((id) => Boolean(entities[id])),
);

export const sessionAttendeesSelectors = getAppTableDataSelectors(
	selectImatAttendanceSummaryState,
	{
		selectEntities: selectImatAttendanceSummarySyncedEntities,
		selectIds: selectImatAttendanceSummarySyncedIds,
		getField,
	},
);

export const selectUiProperties = sessionAttendeesSelectors.selectUiProperties;

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
		force = false,
	): AppThunk<void> =>
	async (dispatch, getState) => {
		const session = selectSessionEntities(getState())[sessionId];
		if (!session || !session.imatMeetingId) {
			dispatch(
				setError(
					"Can't retrieve attendance",
					session
						? "No IMAT meeting associated with session"
						: "Bad session",
				),
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
