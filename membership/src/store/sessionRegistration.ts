import {
	createAction,
	createSelector,
	Action,
	Dictionary,
} from "@reduxjs/toolkit";
import { fetcher } from "@common";
import {
	setError,
	createAppTableDataSlice,
	Fields,
	FieldType,
	getAppTableDataSelectors,
} from "@common";

import type { RootState, AppThunk } from ".";
import { upsertAttendanceSummaries } from "./attendanceSummary";
import {
	uploadSessionRegistrationResponseSchema,
	SessionRegistration,
	UploadSessionRegistrationResponse,
} from "@schemas/registration";
import { Member, selectMemberEntities } from "./members";
import { selectSessionByNumber } from "./sessions";

export type { SessionRegistration };

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
	Matched: { label: "Matched", type: FieldType.STRING },
};

export type SyncedSessionRegistration = SessionRegistration & {
	Matched: string;
	CurrentSAPIN: number | null;
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
	selectMemberEntities,
	(ids, entities, memberEntities) => {
		const syncedEntities: Dictionary<SyncedSessionRegistration> = {};
		const members = Object.values(memberEntities) as Member[];
		for (const id of ids) {
			const reg = entities[id]!;
			const email = reg.Email.toLowerCase();
			let sapin = reg.SAPIN;
			let Matched = "NO";
			let m = sapin ? memberEntities[sapin] : undefined;
			if (m) {
				Matched = "SAPIN";
			} else {
				m = members.find((m) => m.Email.toLowerCase() === email);
				if (m) Matched = "Email";
			}
			if (m) sapin = m.SAPIN;
			syncedEntities[id] = {
				...entities[id]!,
				Matched,
				CurrentSAPIN: sapin,
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
		const url = `/api/${groupName}/attendances/${session.id}/uploadRegistration`;
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
