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
	Fields,
} from "dot11-components";

import type { RootState, AppThunk } from ".";
import type { MemberContactInfo } from "./members";
import { selectMemberEntities } from "./members";
import {
	validResponse as validRecentSessionAttendanceReponse,
	getPending as getPendingRecentSessionAttendance,
	getSuccess as getSuccessRecentSessionAttendance,
	getFailure as getFailureRecentSessionAttendance,
	SessionAttendanceSummary,
} from "./sessionParticipation";
import {
	selectSessionByNumber,
	upsertSessions,
	type Session,
} from "./sessions";

export const fields: Fields = {
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
	InPerson: boolean;
	IsRegistered: boolean;
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
	sessionNumber: number | null;
	useDaily: boolean; // derive from IMAT "daily attendance" (vs "attendance summary")
} = {
	groupName: null,
	sessionNumber: null,
	useDaily: false,
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
					const { groupName, sessionNumber, useDaily } =
						action.payload;
					if (
						groupName !== state.groupName ||
						sessionNumber !== state.sessionNumber ||
						useDaily !== state.useDaily
					) {
						state.groupName = groupName;
						state.sessionNumber = sessionNumber;
						state.useDaily = useDaily;
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
					state.sessionNumber = null;
					state.valid = false;
					dataAdapter.removeAll(state);
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

const { getSuccess, getFailure } = slice.actions;
// Overload getPending() with one that sets groupName
const getPending = createAction<{
	groupName: string;
	sessionNumber: number | null;
	useDaily: boolean;
}>(dataSet + "/getPending");

/*
 * Selectors
 */
export const selectSessionAttendeesState = (state: RootState) => state[dataSet];
export const selectSessionAttendeesIds = (state: RootState) =>
	selectSessionAttendeesState(state).ids;
export const selectSessionAttendeesEntities = (state: RootState) =>
	selectSessionAttendeesState(state).entities;
export const selectSessionAttendeesSessionNumber = (state: RootState) =>
	selectSessionAttendeesState(state).sessionNumber;

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
	(
		groupName: string,
		sessionNumber: number,
		useDaily = false
	): AppThunk<SessionAttendee[]> =>
	async (dispatch, getState) => {
		const session = selectSessionByNumber(getState(), sessionNumber);
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

		const { loading, ...current } = selectSessionAttendeesState(getState());
		if (
			loading &&
			groupName === current.groupName &&
			session.number === current.sessionNumber &&
			useDaily === current.useDaily
		) {
			return loadingPromise;
		}

		dispatch(
			getPending({ groupName, sessionNumber: session.number, useDaily })
		);
		const attendanceUrl = `/api/${groupName}/attendances/${session.id}`;
		const imatAttendanceUrl = `/api/${groupName}/imat/attendance/${
			session.imatMeetingId
		}/${useDaily ? "daily" : "summary"}`;
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
									InPerson: attendance?.InPerson || false,
									IsRegistered:
										attendance?.IsRegistered || false,
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

export const importAttendances =
	(groupName: string, sessionNumber: number, useDaily = false): AppThunk =>
	async (dispatch, getState) => {
		const session = selectSessionByNumber(getState(), sessionNumber);
		if (!session) {
			dispatch(
				setError("Can't retrieve attendance", "Bad session number")
			);
			return;
		}
		let url = `/api/${groupName}/attendances/${session.id}/import`;
		if (useDaily) url += "?use=daily-attendance";
		dispatch(getPendingRecentSessionAttendance({ groupName }));
		let response: any;
		try {
			response = await fetcher.post(url);
			if (!validRecentSessionAttendanceReponse(response))
				throw new TypeError("Unexpected response to POST " + url);
		} catch (error) {
			dispatch(getFailureRecentSessionAttendance());
			dispatch(
				setError(
					"Unable to import attendance summary for session " +
						sessionNumber,
					error
				)
			);
			return;
		}
		dispatch(upsertSessions(response.sessions));
		dispatch(getSuccessRecentSessionAttendance(response.attendances));
	};

export const uploadRegistration =
	(groupName: string, sessionNumber: number, file: File): AppThunk =>
	async (dispatch, getState) => {
		const session = selectSessionByNumber(getState(), sessionNumber);
		if (!session) {
			dispatch(
				setError("Can't upload registration", "Bad session number")
			);
			return;
		}
		let url = `/api/${groupName}/attendances/${session.id}/uploadRegistration`;
		dispatch(getPendingRecentSessionAttendance({ groupName }));
		let response: any;
		try {
			response = await fetcher.postMultipart(url, { file });
			if (!validRecentSessionAttendanceReponse(response))
				throw new TypeError("Unexpected response to POST " + url);
		} catch (error) {
			dispatch(getFailureRecentSessionAttendance());
			dispatch(
				setError(
					"Unable to import attendance summary for session " +
						sessionNumber,
					error
				)
			);
			return;
		}
		dispatch(upsertSessions(response.sessions));
		dispatch(getSuccessRecentSessionAttendance(response.attendances));
	};

export const exportAttendanceForMinutes =
	(groupName: string, sessionNumber: number): AppThunk =>
	async (dispatch, getState) => {
		const session = selectSessionByNumber(getState(), sessionNumber);
		if (!session) {
			dispatch(
				setError("Can't retrieve attendance", "Bad session number")
			);
			return;
		}
		let url = `/api/${groupName}/attendances/${session.id}/exportForMinutes`;
		try {
			await fetcher.getFile(url);
		} catch (error) {
			dispatch(
				setError(
					"Unable to export attendance for session " +
						`id=${session.id}`,
					error
				)
			);
		}
	};
