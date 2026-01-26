import {
	createSelector,
	createAction,
	EntityId,
	Action,
} from "@reduxjs/toolkit";

import {
	fetcher,
	createAppTableDataSlice,
	Fields,
	FieldType,
	getAppTableDataSelectors,
} from "@common";

import type { RootState, AppThunk } from ".";
import { setError } from ".";
import type { MemberCreate } from "./members";
import { selectIeeeMemberEntities, type IeeeMember } from "./ieeeMembers";
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

/** Create an ImatAttendanceSummary with zero attendance percentage */
function getImatAttendanceSummaryZero(
	sapin: number,
	u: IeeeMember | undefined,
) {
	return {
		SAPIN: sapin,
		Name: u ? u.Name : "",
		FirstName: u ? u.FirstName : "",
		MI: u ? u.MI : "",
		LastName: u ? u.LastName : "",
		Email: u ? u.Email : "",
		Employer: u ? u.Employer : "",
		Affiliation: "",
		AttendancePercentage: 0,
		Status: "New",
	} satisfies ImatAttendanceSummary;
}

export type SyncedSessionAttendee = ImatAttendanceSummary & {
	member: MemberCreate | undefined;
	attendance: SessionAttendanceSummary | undefined;
};

/* Fields derived from other fields */
export function getField(entity: SyncedSessionAttendee, key: string) {
	if (key === "CurrentSAPIN") {
		return entity.member && entity.SAPIN !== entity.member.SAPIN
			? entity.member.SAPIN
			: "";
	}
	if (key === "AttendanceOverride") {
		return entity.attendance?.DidAttend
			? "Did attend"
			: entity.attendance?.DidNotAttend
				? "Did not attend"
				: "";
	}
	if (["IsRegistered", "InPerson", "Notes"].includes(key)) {
		return entity.attendance
			? entity.attendance[key as keyof SessionAttendanceSummary]
			: "";
	}
	if (key === "Status") {
		if (!entity.member) return "New";
		return entity.Status;
	}
	return entity[key as keyof SyncedSessionAttendee];
}

/** Slice */
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

/** Slice actions */
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

/** Selectors */
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
		ids.forEach((sapin) => {
			const entity = entities[sapin]!;
			const member = memberEntities[sapin];
			const attendance =
				attendanceSummaryEntities[sapin] ||
				getNullAttendanceSummary(session_id || 0, sapin as number);
			const syncedEntity: SyncedSessionAttendee = {
				...entity,
				attendance,
				member,
			};
			syncedEntities[sapin] = syncedEntity;
		});

		Object.values(attendanceSummaryEntities).forEach((attendance) => {
			const sapin = attendance!.SAPIN;
			if (syncedEntities[sapin]) return;
			const u = ieeeMemberEntities[sapin];
			const entity = getImatAttendanceSummaryZero(sapin, u);
			const member = memberEntities[sapin];
			const syncedEntity: SyncedSessionAttendee = {
				...entity,
				attendance,
				member,
			};
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
