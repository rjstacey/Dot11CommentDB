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
	getNullAttendanceSummary,
	selectAttendanceSummaryEntitiesForSession,
	SessionAttendanceSummary,
} from "./attendanceSummaries";
import {
	sessionRegistrationsSchema,
	SessionRegistration,
} from "@schemas/registration";
import { selectSessionByNumber, selectSessionEntities } from "./sessions";
import { IeeeMember, selectIeeeMemberEntities } from "./ieeeMembers";
import { MemberCreate, selectMemberEntities } from "./members";

export type { SessionRegistration };

export const fields: Fields = {
	CurrentSAPIN: { type: FieldType.NUMERIC },
	SAPIN: { type: FieldType.NUMERIC },
	Name: { label: "Name" },
	LastName: { label: "Last name" },
	FirstName: { label: "First name" },
	Email: { label: "Email" },
	Status: { label: "Status" },
	RegType: { label: "Registration type" },
	Matched: { label: "Matched", type: FieldType.STRING },
	AttendancePercentage: { label: "Attendance", type: FieldType.NUMERIC },
	AttendanceOverride: { label: "Attendance override" },
	IsRegistered: { label: "Registered" },
	InPerson: { label: "In-Person" },
	Notes: { label: "Notes" },
};

export type SyncedSessionRegistration = SessionRegistration & {
	Matched: "SAPIN" | "EMAIL" | null;
	IsRegistered: SessionAttendanceSummary["IsRegistered"];
	InPerson: SessionAttendanceSummary["InPerson"];
	AttendancePercentage: SessionAttendanceSummary["AttendancePercentage"];
	DidAttend: SessionAttendanceSummary["DidAttend"];
	DidNotAttend: SessionAttendanceSummary["DidNotAttend"];
	Notes: SessionAttendanceSummary["Notes"];
	attendance: SessionAttendanceSummary | undefined;
	member: MemberCreate | undefined;
};

export type SessionRegistrationUpdate = {
	id: number;
	changes: Partial<SessionRegistration>;
};

/* Fields derived from other fields */
export function getField(entity: SyncedSessionRegistration, key: string) {
	if (key === "AttendanceOverride") {
		return entity.DidAttend
			? "Did attend"
			: entity.DidNotAttend
				? "Did not attend"
				: "";
	}
	return entity[key as keyof SyncedSessionRegistration];
}

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
				},
			)
			.addMatcher(
				(action: Action) =>
					action.type === clearSessionRegistration.toString(),
				(state) => {
					state.groupName = null;
					state.sessionId = null;
					state.valid = false;
					dataAdapter.removeAll(state);
				},
			);
	},
});

export default slice;

/** Slice actions */
export const sessionRegistrationActions = slice.actions;
export const {
	setSelected,
	updateOne: updateOneSessionRegistration,
	updateMany: updateManySessionRegistrations,
} = slice.actions;
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
export const selectSessionRegistrationSession = (state: RootState) => {
	const sessionId = selectSessionRegistrationSessionId(state);
	if (sessionId) return selectSessionEntities(state)[sessionId];
};
export const selectSessionRegistrationSelected = createSelector(
	(state: RootState) => selectSessionRegistrationState(state).selected,
	selectSessionRegistrationEntities,
	(selected, entities) => selected.filter((id) => Boolean(entities[id])),
);

export const selectSessionRegistrationSyncedEntities = createSelector(
	selectSessionRegistrationIds,
	selectSessionRegistrationEntities,
	(state: RootState) =>
		selectAttendanceSummaryEntitiesForSession(
			state,
			selectSessionRegistrationSessionId(state),
		),
	selectIeeeMemberEntities,
	selectMemberEntities,
	selectSessionRegistrationSessionId,
	(
		ids,
		entities,
		attendanceSummaryEntities,
		ieeeMemberEntities,
		memberEntities,
		session_id,
	) => {
		const syncedEntities: Record<EntityId, SyncedSessionRegistration> = {};
		const users = Object.values(ieeeMemberEntities) as IeeeMember[];

		ids.forEach((id) => {
			const entity = entities[id]!;

			const email = entity.Email.toLowerCase();
			const sapin = entity.SAPIN;
			let Matched: null | "SAPIN" | "EMAIL" = null;
			let user = users.find((u) => u.SAPIN === sapin);
			if (user) {
				Matched = "SAPIN";
			} else {
				user = users.find((u) => u.Email.toLowerCase() === email);
				if (user) Matched = "EMAIL";
			}

			let member: MemberCreate | undefined;
			if (user) {
				let m = memberEntities[user.SAPIN];
				if (m && m.Status === "Obsolete" && m.ReplacedBySAPIN)
					m = memberEntities[m.ReplacedBySAPIN];
				member = m || {
					...user,
					Affiliation: "",
					Status: "Non-Voter",
				};
			}

			let attendance: SessionAttendanceSummary | undefined;
			if (member) {
				attendance =
					attendanceSummaryEntities[member.SAPIN] ||
					getNullAttendanceSummary(session_id!, member.SAPIN);
			}
			const InPerson = /person/i.test(entity.RegType); // "In person" or "In-person"
			let DidNotAttend = false;
			let Notes = attendance?.Notes || null;
			if (/student/i.test(entity.RegType)) {
				DidNotAttend = true;
				if (Notes === null) {
					Notes = "Student registration";
				} else if (!/Student/i.test(Notes)) {
					if (Notes.length > 0) Notes += "; ";
					Notes += "Student registration";
				}
			}
			const syncedEntity: SyncedSessionRegistration = {
				...entity,
				Matched,
				InPerson,
				IsRegistered: true,
				AttendancePercentage: attendance?.AttendancePercentage || 0,
				DidAttend: attendance?.DidAttend || false,
				DidNotAttend,
				Notes,
				attendance,
				member,
			};
			syncedEntities[id] = syncedEntity;
		});
		return syncedEntities;
	},
);

export const sessionRegistrationSelectors = getAppTableDataSelectors(
	selectSessionRegistrationState,
	{
		selectEntities: selectSessionRegistrationSyncedEntities,
		selectIds: selectSessionRegistrationIds,
		getField,
	},
);

/** Thunk actions */
export const loadSessionRegistration =
	(groupName: string, sessionNumber: number, file: File): AppThunk =>
	async (dispatch, getState) => {
		const session = selectSessionByNumber(getState(), sessionNumber);
		if (!session) {
			dispatch(
				setError("Can't upload registration", "Bad session number"),
			);
			return;
		}
		const url = `/api/${groupName}/attendances/${session.id}/load?format=registration`;
		dispatch(getPending({ groupName, sessionId: session.id }));
		let r: SessionRegistration[];
		try {
			const response = await fetcher.postFile(url, file);
			r = sessionRegistrationsSchema.parse(response);
		} catch (error) {
			dispatch(getFailure());
			dispatch(setError("POST " + url, error));
			return;
		}
		dispatch(getSuccess(r));
	};
