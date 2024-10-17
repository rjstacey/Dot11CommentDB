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
import { selectSessionByNumber, selectSessionEntities } from "./sessions";
import {
	getNullAttendanceSummary,
	selectAttendanceSummaryEntitiesForSession,
	SessionAttendanceSummary,
} from "./attendanceSummary";

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
	RegMatch: { label: "Reg Match" },
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

type SessionAttendeeWithSummary = SessionAttendee & SessionAttendanceSummary;

export type SyncedSessionAttendee = SessionAttendeeWithSummary & {
	RegMatch: boolean;
	Status: string;
	OldName: string | null;
	OldAffiliation: string | null;
	OldEmployer: string | null;
	OldEmail: string | null;
	OldContactInfo: MemberContactInfo | null;
};

/*
 * Slice
 */
const selectId = (attendee: SessionAttendee) => attendee.SAPIN;
const sortComparer = (m1: SessionAttendee, m2: SessionAttendee) =>
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
					action.type === clearSessionAttendees.toString(),
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
export const clearSessionAttendees = createAction(dataSet + "/clear");

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
export const selectSessionAttendeesState = (state: RootState) => state[dataSet];
const selectSessionAttendeesAge = (state: RootState) => {
	let lastLoad = selectSessionAttendeesState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
export const selectSessionAttendeesGroupName = (state: RootState) =>
	selectSessionAttendeesState(state).groupName;
export const selectSessionAttendeesIds = (state: RootState) =>
	selectSessionAttendeesState(state).ids;
export const selectSessionAttendeesEntities = (state: RootState) =>
	selectSessionAttendeesState(state).entities;
export const selectSessionAttendeesSessionId = (state: RootState) =>
	selectSessionAttendeesState(state).sessionId;
export const selectSessionAttendeesSession = (state: RootState) => {
	const sessionId = selectSessionAttendeesSessionId(state);
	if (sessionId) return selectSessionEntities(state)[sessionId];
};
export const selectSessionAttendeesSelected = createSelector(
	(state: RootState) => selectSessionAttendeesState(state).selected,
	selectSessionAttendeesEntities,
	(selected, entities) => selected.filter((id) => Boolean(entities[id]))
);

export const selectSyncedSessionAtendeeEntities = createSelector(
	selectSessionAttendeesIds,
	selectSessionAttendeesEntities,
	(state: RootState) =>
		selectAttendanceSummaryEntitiesForSession(
			state,
			selectSessionAttendeesSessionId(state)
		),
	selectMemberEntities,
	selectSessionAttendeesSessionId,
	(ids, entities, attendanceSummaryEntities, memberEntities, session_id) => {
		const syncedEntities: Record<EntityId, SyncedSessionAttendee> = {};

		ids.forEach((id) => {
			const entity = entities[id]!;
			const a =
				attendanceSummaryEntities[entity.SAPIN] ||
				getNullAttendanceSummary(session_id || 0, entity.SAPIN);
			let syncedEntity: SyncedSessionAttendee = {
				...a,
				...entity,
				OldAffiliation: null,
				OldEmployer: null,
				OldName: null,
				OldEmail: null,
				OldContactInfo: null,
				Status: "New",
				RegMatch: Boolean(a),
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
	selectSessionAttendeesState,
	{ selectEntities: selectSyncedSessionAtendeeEntities }
);

/*
 * Thunk actions
 */
function validSessionAttendee(entry: any): entry is SessionAttendee {
	return (
		isObject(entry) &&
		typeof entry.SAPIN === "number" &&
		typeof entry.Name === "string" &&
		typeof entry.Email === "string"
	);
}

function validGetImatAttendanceResponse(
	response: unknown
): response is SessionAttendee[] {
	return Array.isArray(response) && response.every(validSessionAttendee);
}

const AGE_STALE = 60 * 60 * 1000; // 1 hour

let loadingPromise: Promise<null>;
export const loadSessionAttendees =
	(
		groupName: string,
		sessionNumber: number,
		useDaily = false
	): AppThunk<null> =>
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
			return null;
		}

		const { loading, ...current } = selectSessionAttendeesState(getState());
		if (
			loading &&
			groupName === current.groupName &&
			session.id === current.sessionId &&
			useDaily === current.useDaily
		) {
			return loadingPromise;
		}

		const age = selectSessionAttendeesAge(getState());
		if (age && age < AGE_STALE) return loadingPromise;

		dispatch(getPending({ groupName, sessionId: session.id, useDaily }));
		const url = `/api/${groupName}/imat/attendance/${
			session.imatMeetingId
		}/${useDaily ? "daily" : "summary"}`;
		loadingPromise = fetcher
			.get(url)
			.then((imatAttendances: any) => {
				if (!validGetImatAttendanceResponse(imatAttendances))
					throw new TypeError("Unexpected response to GET " + url);
				dispatch(getSuccess(imatAttendances));
				return null;
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("Unable to get attendances", error));
				return null;
			});
		return loadingPromise;
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
