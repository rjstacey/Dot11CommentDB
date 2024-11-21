import {
	createEntityAdapter,
	createSlice,
	PayloadAction,
	EntityId,
	Dictionary,
	createSelector,
} from "@reduxjs/toolkit";
import isEqual from "lodash.isequal";

import { fetcher, setError, isObject } from "dot11-components";

import type { RootState, AppThunk } from ".";
import { selectMemberEntities } from "./members";
import {
	selectRecentSessions,
	selectSessionByNumber,
	updateSession,
} from "./sessions";

export type SessionAttendanceSummary = {
	id: number;
	session_id: number; // Session identifier
	AttendancePercentage: number | null; // Percentage of meeting slots attended
	IsRegistered: boolean; // Registered for session
	InPerson: boolean; // Attended in-person (not remotely)
	DidAttend: boolean; // Declare attendance criteria met
	DidNotAttend: boolean; // Declare attendance criteria not met
	SAPIN: number; // SA PIN under which attendance was logged
	CurrentSAPIN: number; // Current SA PIN
	Notes: string | null;
};

export type SessionAttendanceSummaryCreate = Pick<
	SessionAttendanceSummary,
	"session_id" | "SAPIN"
> &
	Partial<
		Pick<
			SessionAttendanceSummary,
			| "AttendancePercentage"
			| "IsRegistered"
			| "InPerson"
			| "DidAttend"
			| "DidNotAttend"
			| "Notes"
		>
	>;

export type SessionAttendanceSummaryChanges = Partial<
	Pick<
		SessionAttendanceSummary,
		| "session_id"
		| "SAPIN"
		| "AttendancePercentage"
		| "IsRegistered"
		| "InPerson"
		| "DidAttend"
		| "DidNotAttend"
		| "Notes"
	>
>;

export type SessionAttendanceSummaryUpdate = {
	id: number;
	changes: SessionAttendanceSummaryChanges;
};

export function getNullAttendanceSummary(
	session_id: number,
	SAPIN: number
): SessionAttendanceSummary {
	return {
		id: 0,
		session_id,
		AttendancePercentage: 0,
		IsRegistered: false,
		InPerson: false,
		DidAttend: false,
		DidNotAttend: false,
		Notes: "",
		SAPIN,
		CurrentSAPIN: SAPIN,
	};
}

export function isNullAttendanceSummary(a: SessionAttendanceSummary) {
	return (
		a.id &&
		!a.AttendancePercentage &&
		!a.IsRegistered &&
		!a.InPerson &&
		!a.DidAttend &&
		!a.DidNotAttend &&
		!a.Notes
	);
}

type ExtraState = {
	valid: boolean;
	loading: boolean;
	groupName: string | null;
	sessionIds: EntityId[];
	lastLoad: string | null;
};

/* Create slice */
const selectId = (d: SessionAttendanceSummary) => d.id;
const dataAdapter = createEntityAdapter<SessionAttendanceSummary>({ selectId });
const initialState = dataAdapter.getInitialState<ExtraState>({
	valid: false,
	loading: false,
	groupName: null,
	sessionIds: [],
	lastLoad: null,
});
const dataSet = "attendanceSummary";
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		getPending(
			state,
			action: PayloadAction<{ groupName: string; sessionIds: number[] }>
		) {
			const { groupName, sessionIds } = action.payload;
			state.loading = true;
			state.lastLoad = new Date().toISOString();
			if (
				state.groupName !== groupName ||
				!isEqual(state.sessionIds, sessionIds)
			) {
				state.groupName = groupName;
				state.sessionIds = sessionIds;
				state.valid = false;
				dataAdapter.removeAll(state);
			}
		},
		getSuccess(state, action: PayloadAction<SessionAttendanceSummary[]>) {
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, action.payload);
		},
		getFailure(state) {
			state.loading = false;
		},
		setMany: dataAdapter.setMany,
		addMany: dataAdapter.addMany,
		updateMany: dataAdapter.updateMany,
		removeMany: dataAdapter.removeMany,
		upsertMany: dataAdapter.upsertMany,
	},
});

export default slice;

/** Slice actions */
const { getPending, getSuccess, getFailure, setMany, updateMany, removeMany } =
	slice.actions;
export const upsertAttendanceSummaries = slice.actions.upsertMany;

/** Selectors */
export const selectAttendanceSummaryState = (state: RootState) =>
	state[dataSet];
const selectAttendanceSummaryAge = (state: RootState) => {
	let lastLoad = selectAttendanceSummaryState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
export const selectAttendanceSummaryIds = (state: RootState) =>
	selectAttendanceSummaryState(state).ids;
export const selectAttendanceSummaryEntities = (state: RootState) =>
	selectAttendanceSummaryState(state).entities;
export const selectAttendanceSummaryGroupName = (state: RootState) =>
	selectAttendanceSummaryState(state).groupName;
export const selectAttendanceSummarySessionIds = (state: RootState) =>
	selectAttendanceSummaryState(state).sessionIds;

/** Select attendance symmary entities for session indexed by SAPIN */
export const selectAttendanceSummaryEntitiesForSession = createSelector(
	selectAttendanceSummaryIds,
	selectAttendanceSummaryEntities,
	(state: RootState, session_id: number | null) => session_id,
	(ids, entities, session_id) => {
		const newEntities: Dictionary<SessionAttendanceSummary> = {};
		for (const id of ids) {
			const entity = entities[id]!;
			if (entity.session_id === session_id)
				newEntities[entity.SAPIN] = entity;
		}
		return newEntities;
	}
);

export type MemberSessionAttendanceSummaries = Record<
	number,
	SessionAttendanceSummary
>; // Indexed by session_id
export type MembersSessionAttendanceSummaries = Record<
	number,
	MemberSessionAttendanceSummaries
>; // Indexed by SAPIN

/** Create a dictionary indexed by member SAPIN where each entry is a dictionary of attendance indexed by session ID */
export const selectMemberAttendances = createSelector(
	selectAttendanceSummaryIds,
	selectAttendanceSummaryEntities,
	selectMemberEntities,
	(ids, entities, memberEntities) => {
		const membersAttendanceEntities: MembersSessionAttendanceSummaries = {};
		for (const id of ids) {
			const entity = entities[id]!;
			let sapin = entity.SAPIN;
			const member = memberEntities[sapin];
			if (member) {
				if (member.ReplacedBySAPIN) sapin = member.ReplacedBySAPIN;
				membersAttendanceEntities[sapin] = {
					...membersAttendanceEntities[sapin],
					[entity.session_id]: { ...entity, CurrentSAPIN: sapin },
				};
			}
		}
		return membersAttendanceEntities;
	}
);

/*
 * Thunk actions
 */

/** Validate as attendance summary object */
function validAttendanceSummary(entry: any): entry is SessionAttendanceSummary {
	return (
		isObject(entry) &&
		typeof entry.id === "number" &&
		typeof entry.session_id === "number" &&
		typeof entry.SAPIN === "number" &&
		(entry.AttendancePercentage === null ||
			typeof entry.AttendancePercentage === "number") &&
		typeof entry.IsRegistered === "boolean" &&
		typeof entry.InPerson === "boolean" &&
		typeof entry.DidAttend === "boolean" &&
		typeof entry.DidNotAttend === "boolean" &&
		(entry.Notes === null || typeof entry.Notes === "string")
	);
}

/** Validate as array of attendance summary objects */
export function validAttendanceSummaries(
	attendances: unknown
): attendances is SessionAttendanceSummary[] {
	return (
		Array.isArray(attendances) && attendances.every(validAttendanceSummary)
	);
}

const AGE_STALE = 60 * 60 * 1000; // 1 hour

let loading = false;
let loadingPromise: Promise<void> = Promise.resolve();
export const loadRecentAttendanceSummaries =
	(groupName: string, force = false): AppThunk<void> =>
	async (dispatch, getState) => {
		const state = getState();
		const sessions = selectRecentSessions(state);
		const sessionIds = sessions.map((s) => s.id);
		const { groupName: currentGroupName, sessionIds: currentSessionIds } =
			selectAttendanceSummaryState(state);
		if (
			currentGroupName === groupName &&
			isEqual(currentSessionIds, sessionIds)
		) {
			if (loading) return loadingPromise;
			const age = selectAttendanceSummaryAge(state);
			if (!force && age && age < AGE_STALE) return loadingPromise;
		}
		dispatch(getPending({ groupName, sessionIds }));
		loading = true;
		loadingPromise = Promise.all(
			sessions.map((session) => {
				const url = `/api/${groupName}/attendances/${session.id}`;
				return fetcher.get(url).then((response: any) => {
					if (!validAttendanceSummaries(response)) {
						throw new TypeError(
							"Unexpected response to GET " + url
						);
					}
					return response;
				});
			})
		)
			.then((all) => {
				const summaries = ([] as SessionAttendanceSummary[]).concat(
					...all
				);
				dispatch(getSuccess(summaries));
			})
			.catch((error) => {
				dispatch(getFailure());
				dispatch(
					setError(`Unable to get recent attendance summaries`, error)
				);
			})
			.finally(() => {
				loading = false;
			});
		return loadingPromise;
	};

export const importAttendanceSummary =
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
		let response: any;
		try {
			response = await fetcher.post(url);
			if (!validAttendanceSummaries(response))
				throw new TypeError("Unexpected response to POST " + url);
		} catch (error) {
			dispatch(
				setError(
					"Unable to import attendance summary for session " +
						sessionNumber,
					error
				)
			);
			return;
		}
		dispatch(
			updateSession({
				id: session.id,
				changes: { attendees: response.length },
			})
		);
		dispatch(setMany(response));
	};

export const addAttendanceSummaries =
	(adds: SessionAttendanceSummaryCreate[]): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectAttendanceSummaryGroupName(getState());
		const url = `/api/${groupName}/attendances`;
		let response: unknown;
		try {
			response = await fetcher.post(url, adds);
			if (!validAttendanceSummaries(response))
				throw new TypeError("Unexpected response to POST " + url);
		} catch (error) {
			dispatch(setError("Unable to add attendance summaries", error));
			return;
		}
		dispatch(setMany(response));
	};

export const updateAttendanceSummaries =
	(updates: SessionAttendanceSummaryUpdate[]): AppThunk =>
	async (dispatch, getState) => {
		dispatch(updateMany(updates));
		const groupName = selectAttendanceSummaryGroupName(getState());
		const url = `/api/${groupName}/attendances`;
		let response: unknown;
		try {
			response = await fetcher.patch(url, updates);
			console.log(response);
			if (!validAttendanceSummaries(response))
				throw new TypeError("Unexpected response to PATCH " + url);
		} catch (error) {
			dispatch(setError("Unable to update attendance summaries", error));
			return;
		}
		dispatch(setMany(response));
	};

export const deleteAttendanceSummaries =
	(ids: EntityId[]): AppThunk =>
	async (dispatch, getState) => {
		dispatch(removeMany(ids));
		const groupName = selectAttendanceSummaryGroupName(getState());
		const url = `/api/${groupName}/attendances`;
		try {
			await fetcher.delete(url, ids);
		} catch (error) {
			dispatch(setError("Unable to update attendance summaries", error));
		}
	};
