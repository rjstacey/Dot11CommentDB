import {
	createSelector,
	createAction,
	EntityId,
	Action,
} from "@reduxjs/toolkit";
import isEqual from "lodash.isequal";

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	FieldType,
	getAppTableDataSelectors,
	isObject,
} from "dot11-components";

import type { RootState, AppThunk } from ".";
import type { MemberContactInfo } from "./members";
import { selectMemberEntities } from "./members";
import { SessionAttendanceSummary } from "./sessionParticipation";
import { selectSession, Session } from "./sessions";

export const fields = {
	SAPIN: { label: "SA PIN", type: FieldType.NUMERIC },
	"Name/Email": { label: "Name/Email" },
	Name: { label: "Name" },
	Email: { label: "Email" },
	"Employer/Affiliation": { label: "Employer/Affiliation" },
	Employer: { label: "Employer" },
	Affiliation: { label: "Affiliation" },
	ContactInfo: { label: "Contact Info" },
	Status: { label: "Status" },
	AttendancePercentage: { label: "Attendance", type: FieldType.NUMERIC },
	AttendanceOverride: { label: "Attendance override" },
	Notes: { label: "Notes" },
};

export type SessionAttendee = {
	SAPIN: number;
	Name: string;
	FirstName: string;
	MI: string;
	LastName: string;
	CurrentInvolvementLevel: string;
	Email: string;
	Affiliation: string;
	Employer?: string; // Not present with attendance summary
	ContactInfo?: MemberContactInfo; // Not present with attendance summary
	AttendancePercentage: number;
};

type SessionAttendeeWithOverrride = SessionAttendee & {
	DidAttend: boolean;
	DidNotAttend: boolean;
	AttendancePercentageOverride: number;
	Notes: string;
};

export type SyncedSessionAttendee = SessionAttendeeWithOverrride & {
	Status: string;
	OldName: string | null;
	OldAffiliation: string | null;
	OldEmployer: string | null;
	OldEmail: string | null;
	OldContactInfo: MemberContactInfo | null;
};

/* Fields derived from other fields */
export function getField(entity: SyncedSessionAttendee, key: string): any {
	if (key === "AttendanceOverride") {
		if (entity.DidAttend) return "Did attend";
		else if (entity.DidNotAttend) return "Did not attend";
		else if (
			entity.AttendancePercentage.toFixed(0) !==
			entity.AttendancePercentageOverride.toFixed(0)
		)
			return entity.AttendancePercentageOverride.toFixed(0) + "%";
		else return "";
	}
	return entity[key as keyof SyncedSessionAttendee];
}

/*
 * Slice
 */
const selectId = (attendee: SessionAttendeeWithOverrride) => attendee.SAPIN;
const sortComparer = (
	m1: SessionAttendeeWithOverrride,
	m2: SessionAttendeeWithOverrride
) => m1.SAPIN - m2.SAPIN;

const initialState: {
	groupName: string | null;
	sessionId: number | null;
	dailyAttendance: boolean; // derive from IMAT "daily attendance" (vs "attendance summary")
} = {
	groupName: null,
	sessionId: null,
	dailyAttendance: true,
};

const dataSet = "sessionAttendees";
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
					action.type === clearSessionAttendees.toString(),
				(state) => {
					state.groupName = null;
					state.sessionId = null;
					state.valid = false;
					dataAdapter.removeAll(state);
				}
			)
			.addMatcher(
				(action: Action) =>
					action.type === setDailyAttendance.toString(),
				(state, action) => {
					if (state.dailyAttendance !== action.payload) {
						state.dailyAttendance = action.payload;
						dataAdapter.removeAll(state);
						state.valid = false;
						state.loading = false;
					}
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
export const clearSessionAttendees = createAction(dataSet + "/clear");
export const setDailyAttendance = createAction<boolean>(
	dataSet + "/setDailyAttendance"
);

const { getSuccess, getFailure } = slice.actions;
// Overload getPending() with one that sets groupName
const getPending = createAction<{ groupName: string; sessionId: number }>(
	dataSet + "/getPending"
);

/*
 * Selectors
 */
export const selectSessionAttendeesState = (state: RootState) => state[dataSet];
export const selectSessionAttendeesIds = (state: RootState) =>
	selectSessionAttendeesState(state).ids;
export const selectSessionAttendeesEntities = (state: RootState) =>
	selectSessionAttendeesState(state).entities;
//const selectSessionAttendeesUseDaily = (state: RootState) => selectSessionAttendeesState(state).useDaily;

export const selectDailyAttendance = (state: RootState) =>
	selectSessionAttendeesState(state).dailyAttendance;

export const selectSyncedSessionAtendeesEntities = createSelector(
	selectSessionAttendeesIds,
	selectSessionAttendeesEntities,
	selectMemberEntities,
	(ids, entities, memberEntities) => {
		const newEntities: Record<EntityId, SyncedSessionAttendee> = {};
		ids.forEach((id) => {
			let entity: SyncedSessionAttendee = {
				...entities[id]!,
				OldAffiliation: null,
				OldEmployer: null,
				OldName: null,
				OldEmail: null,
				OldContactInfo: null,
				Status: "New",
			};
			const m = memberEntities[id];
			if (m) {
				entity.Status = m.Status;
				if (m.Affiliation !== entity.Affiliation)
					entity.OldAffiliation = m.Affiliation;
				if (
					entity.Employer !== undefined &&
					m.Employer !== entity.Employer
				)
					entity.OldEmployer = m.Employer;
				if (m.Email !== entity.Email) entity.OldEmail = m.Email;
				if (m.Name !== entity.Name) entity.OldName = m.Name;
				if (
					entity.Employer !== undefined &&
					!isEqual(m.ContactInfo, entity.ContactInfo)
				) {
					entity.OldContactInfo = m.ContactInfo;
				}
			}
			newEntities[id] = entity;
		});
		return newEntities;
	}
);

export const sessionAttendeesSelectors = getAppTableDataSelectors(
	selectSessionAttendeesState,
	{ selectEntities: selectSyncedSessionAtendeesEntities, getField }
);

/*
 * Thunk actions
 */
function validSessionAttendee(entry: any): entry is SessionAttendee {
	return isObject(entry);
}

function validGetImatAttendanceResponse(
	response: any
): response is SessionAttendee[] {
	return Array.isArray(response) && response.every(validSessionAttendee);
}

function validGetAttendancesResponse(
	response: any
): response is { attendances: SessionAttendanceSummary[]; session: Session } {
	return (
		isObject(response) &&
		Array.isArray(response.attendances) &&
		isObject(response.session)
	);
}

let loadingPromise: Promise<SessionAttendee[]>;
export const loadSessionAttendees =
	(groupName: string, sessionId: number): AppThunk<SessionAttendee[]> =>
	async (dispatch, getState) => {
		const { loading, ...current } = selectSessionAttendeesState(getState());
		if (
			loading &&
			groupName === current.groupName &&
			sessionId === current.sessionId
		) {
			return loadingPromise;
		}
		const session = selectSession(getState(), sessionId);
		if (!session || !session.imatMeetingId) {
			dispatch(
				setError(
					"Can't retrieve attendance",
					session
						? "No IMAT meeting associated with session"
						: "Bad session"
				)
			);
			dispatch(clearSessionAttendees());
			return [];
		}
		dispatch(getPending({ groupName, sessionId }));
		const dailyAttendance = selectDailyAttendance(getState());
		const attendanceUrl = `/api/${groupName}/attendances/${session.id}`;
		const imatAttendanceUrl = `/api/${groupName}/imat/attendance/${
			session.imatMeetingId
		}/${dailyAttendance ? "daily" : "summary"}`;
		loadingPromise = fetcher
			.get(attendanceUrl)
			.then((response: any) => {
				if (!validGetAttendancesResponse(response))
					throw new TypeError(
						"Unexpected response to GET " + attendanceUrl
					);
				const { attendances } = response;
				return fetcher
					.get(imatAttendanceUrl)
					.then((imatAttendances: any) => {
						if (!validGetImatAttendanceResponse(imatAttendances))
							throw new TypeError(
								"Unexpected response to GET " +
									imatAttendanceUrl
							);
						const mergedAttendances: SessionAttendeeWithOverrride[] =
							imatAttendances.map((i) => {
								const attendance = attendances.find(
									(a) => a.SAPIN === i.SAPIN
								);
								return {
									...i,
									DidAttend: attendance?.DidAttend || false,
									DidNotAttend:
										attendance?.DidNotAttend || false,
									Notes: attendance?.Notes || "",
									AttendancePercentageOverride:
										attendance?.AttendancePercentage || 0,
								};
							});
						dispatch(getSuccess(mergedAttendances));
						return mergedAttendances;
					});
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("Unable to get attendances", error));
				return [];
			});
		return loadingPromise;
	};

export const refreshSessionAttendees =
	(): AppThunk => async (dispatch, getState) => {
		const { groupName, sessionId } = selectSessionAttendeesState(
			getState()
		);
		dispatch(
			groupName && sessionId
				? loadSessionAttendees(groupName, sessionId)
				: clearSessionAttendees()
		);
	};
