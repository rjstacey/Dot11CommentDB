import {
	createSelector,
	createAction,
	Dictionary,
	Action,
} from "@reduxjs/toolkit";

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
import { selectSession } from "./sessions";

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
	Employer: string;
	ContactInfo: MemberContactInfo;
	AttendancePercentage: number;
};

export type SyncedSessionAttendee = SessionAttendee & {
	Status: string;
	OldName: string | null;
	OldAffiliation: string | null;
	OldEmployer: string | null;
	OldEmail: string | null;
};

/*
 * Slice
 */
const selectId = (attendee: SessionAttendee) => attendee.SAPIN;

const initialState: {
	groupName: string | null;
	sessionId: number | null;
} = {
	groupName: null,
	sessionId: null,
};

const dataSet = "dailyAttendances";
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	initialState,
	reducers: {},
	extraReducers: (builder, dataAdapter) => {
		builder
			.addMatcher(
				(action: Action) => action.type === getPending.toString(),
				(state, action: ReturnType<typeof getPending>) => {
					const { groupName, sessionId } = action.payload;
					if (groupName !== state.groupName || sessionId !== state.sessionId) {
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
			);
	},
});

export default slice;

/*
 * Slice actions
 */
export const sessionAttendeesActions = slice.actions;
const { getSuccess, getFailure } = slice.actions;
// Overload getPending() with one that sets groupName
const getPending = createAction<{ groupName: string; sessionId: number }>(
	dataSet + "/getPending"
);
export const clearSessionAttendees = createAction(dataSet + "/clear");


/*
 * Selectors
 */
export const selectSessionAttendeesState = (state: RootState) => state[dataSet];
export const selectSessionAttendeesIds = (state: RootState) =>
	selectSessionAttendeesState(state).ids;
export const selectSessionAttendeesEntities = (state: RootState) =>
	selectSessionAttendeesState(state).entities;

const selectSyncedSessionAtendeesEntities = createSelector(
	selectSessionAttendeesIds,
	selectSessionAttendeesEntities,
	selectMemberEntities,
	(ids, entities, memberEntities) => {
		const newEntities: Dictionary<SyncedSessionAttendee> = {};
		ids.forEach((id) => {
			const entity = entities[id]!;
			const m = memberEntities[id];
			let OldAffiliation = null,
				OldEmployer = null,
				OldName = null,
				OldEmail = null,
				Status = "New";
			if (m) {
				Status = m.Status;
				if (m.Affiliation !== entity.Affiliation)
					OldAffiliation = m.Affiliation;
				if (m.Employer !== entity.Employer) OldEmployer = m.Employer;
				if (m.Email !== entity.Email) OldEmail = m.Email;
				if (m.Name !== entity.Name) OldName = m.Name;
			}
			newEntities[id] = {
				...entity,
				Status,
				OldAffiliation,
				OldEmployer,
				OldEmail,
				OldName,
			};
		});
		return newEntities;
	}
);

export const sessionAttendeesSelectors = getAppTableDataSelectors(
	selectSessionAttendeesState,
	{ selectEntities: selectSyncedSessionAtendeesEntities }
);

/*
 * Thunk actions
 */
function validSessionAttendee(entry: any): entry is SessionAttendee {
	return isObject(entry);
}

function validGetResponse(response: any): response is SessionAttendee[] {
	return Array.isArray(response) && response.every(validSessionAttendee);
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
		if (!session) {
			console.error("Bad sessionId");
			dispatch(clearSessionAttendees());
			return [];
		}
		dispatch(getPending({ groupName, sessionId }));
		const url = `/api/${groupName}/imat/attendance/${session.imatMeetingId}/daily`;
		loadingPromise = fetcher
			.get(url)
			.then((response: any) => {
				if (!validGetResponse(response))
					throw new TypeError("Unexpected response to GET " + url);
				dispatch(getSuccess(response));
				return response;
			})
			.catch((error: any) => {
				dispatch(getFailure());
				dispatch(setError("Unable to get attendances", error));
				return [];
			});
		return loadingPromise;
	};

export const refreshSessionAttendees = (): AppThunk =>
	async (dispatch, getState) => {
		const {groupName, sessionId} = selectSessionAttendeesState(getState());
		dispatch((groupName && sessionId)? loadSessionAttendees(groupName, sessionId): clearSessionAttendees());
	}