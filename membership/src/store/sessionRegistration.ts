import {
	createAction,
	createSelector,
	Action,
	Dictionary,
} from "@reduxjs/toolkit";

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
import {
	SessionAttendanceSummary,
	validAttendanceSummaries,
	upsertAttendanceSummaries,
	selectAttendanceSummaryEntitiesForSession,
} from "./attendanceSummary";
import { Member, selectMemberEntities } from "./members";
import { selectSessionByNumber } from "./sessions";

export const fields: Fields = {
	SAPIN: { label: "SA PIN", type: FieldType.NUMERIC },
	"Name/Email": { label: "Name/Email" },
	Name: { label: "Name" },
	LastName: { label: "Last name" },
	FirstName: { label: "First name" },
	Email: { label: "Email" },
	RegType: {
		label: "Registration type",
	},
	Matched: { label: "Matched" },
};

export type SessionRegistration = {
	id: number;
	SAPIN: number | null;
	Name: string;
	FirstName: string;
	LastName: string;
	Email: string;
	RegType: string;
};

export type SyncedSessionRegistration = SessionRegistration & {
	Matched: boolean;
};

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

const selectSyncedSessionRegistrationEntities = createSelector(
	selectSessionRegistrationIds,
	selectSessionRegistrationEntities,
	(state: RootState) =>
		selectAttendanceSummaryEntitiesForSession(
			state,
			selectSessionRegistrationSessionId(state)
		),
	selectMemberEntities,
	(ids, entities, attendanceSummaryEntities, memberEntities) => {
		const syncedEntities: Dictionary<SyncedSessionRegistration> = {};
		const members = Object.values(memberEntities) as Member[];
		for (const id of ids) {
			const reg = entities[id]!;
			const email = reg.Email.toLowerCase();
			let sapin = reg.SAPIN || 0;
			let m = memberEntities[sapin];
			if (!m) m = members.find((m) => m.Email.toLowerCase() === email);
			if (m) sapin = m.SAPIN;
			const a = attendanceSummaryEntities[sapin];
			syncedEntities[id] = {
				...entities[id]!,
				Matched: Boolean(a),
			} satisfies SyncedSessionRegistration;
		}
		return syncedEntities;
	}
);

export const selectSessionRegistrationsUnmatched = createSelector(
	selectSessionRegistrationIds,
	selectSyncedSessionRegistrationEntities,
	(ids, entities) => ids.map((id) => entities[id]!).filter((r) => !r.Matched)
);

export const sessionRegistrationSelectors = getAppTableDataSelectors(
	selectSessionRegistrationState,
	{ selectEntities: selectSyncedSessionRegistrationEntities }
);

/** Thunk actions */
function validSessionRegistration(entry: any): entry is SessionRegistration {
	return (
		isObject(entry) &&
		typeof entry.id === "number" &&
		(entry.SAPIN === null || typeof entry.SAPIN === "number") &&
		typeof entry.Email === "string" &&
		typeof entry.Name === "string" &&
		typeof entry.RegType === "string"
	);
}

function validSessionRegistrations(
	registrations: any
): registrations is SessionRegistration[] {
	return (
		Array.isArray(registrations) &&
		registrations.every(validSessionRegistration)
	);
}

function validUploadRestrationResponse(response: any): response is {
	attendances: SessionAttendanceSummary[];
	registrations: SessionRegistration[];
} {
	console.log(response.attendances);
	return (
		isObject(response) &&
		validSessionRegistrations(response.registrations) &&
		validAttendanceSummaries(response.attendances)
	);
}

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
		let url = `/api/${groupName}/attendances/${session.id}/uploadRegistration`;
		dispatch(getPending({ groupName, sessionId: session.id }));
		let response: unknown;
		try {
			response = await fetcher.postMultipart(url, { file });
			if (!validUploadRestrationResponse(response))
				throw new TypeError("Unexpected response to POST " + url);
		} catch (error) {
			dispatch(getFailure());
			dispatch(
				setError(
					"Unable to import registration for session " +
						sessionNumber,
					error
				)
			);
			return;
		}
		dispatch(getSuccess(response.registrations));
		dispatch(upsertAttendanceSummaries(response.attendances));
	};
