import {
	createEntityAdapter,
	createSlice,
	PayloadAction,
	EntityId,
	Dictionary,
	createSelector,
} from "@reduxjs/toolkit";
import isEqual from "lodash.isequal";

import { fetcher } from "@components/lib";
import { setError } from "@components/store";

import type { RootState, AppThunk } from ".";
import {
	selectMemberIds,
	selectMemberEntities,
	isActiveMember,
} from "./members";
import {
	selectRecentSessions,
	selectSessionByNumber,
	updateSession,
} from "./sessions";

import {
	SessionAttendanceSummary,
	SessionAttendanceSummaryCreate,
	SessionAttendanceSummaryChanges,
	SessionAttendanceSummaryUpdate,
	sessionAttendanceSummariesSchema,
} from "@schemas/attendances";
export type {
	SessionAttendanceSummary,
	SessionAttendanceSummaryCreate,
	SessionAttendanceSummaryChanges,
	SessionAttendanceSummaryUpdate,
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
	const lastLoad = selectAttendanceSummaryState(state).lastLoad;
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
	selectMemberIds,
	selectMemberEntities,
	(ids, entities, sapins, memberEntities) => {
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
		// Include active members without attendance
		for (const sapin of sapins as number[]) {
			if (
				!membersAttendanceEntities[sapin] &&
				isActiveMember(memberEntities[sapin]!)
			) {
				membersAttendanceEntities[sapin] = {};
			}
		}
		return membersAttendanceEntities;
	}
);

/*
 * Thunk actions
 */

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
		const baseUrl = `/api/${groupName}/attendances`;
		loading = true;
		loadingPromise = Promise.all(
			sessions.map((session) => {
				const url = `${baseUrl}/${session.id}`;
				return fetcher
					.get(url)
					.then((response: unknown) =>
						sessionAttendanceSummariesSchema.parse(response)
					);
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
				dispatch(setError(`GET ${baseUrl}/:session_id`, error));
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
		let attendances: SessionAttendanceSummary[];
		try {
			const response = await fetcher.post(url);
			attendances = sessionAttendanceSummariesSchema.parse(response);
		} catch (error) {
			dispatch(setError("POST " + url, error));
			return;
		}
		dispatch(
			updateSession({
				id: session.id,
				changes: { attendees: attendances.length },
			})
		);
		dispatch(setMany(attendances));
	};

export const addAttendanceSummaries =
	(adds: SessionAttendanceSummaryCreate[]): AppThunk =>
	async (dispatch, getState) => {
		const groupName = selectAttendanceSummaryGroupName(getState());
		const url = `/api/${groupName}/attendances`;
		let attendances: SessionAttendanceSummary[];
		try {
			const response = await fetcher.post(url, adds);
			attendances = sessionAttendanceSummariesSchema.parse(response);
		} catch (error) {
			dispatch(setError("POST " + url, error));
			return;
		}
		dispatch(setMany(attendances));
	};

export const updateAttendanceSummaries =
	(updates: SessionAttendanceSummaryUpdate[]): AppThunk =>
	async (dispatch, getState) => {
		dispatch(updateMany(updates));
		const groupName = selectAttendanceSummaryGroupName(getState());
		const url = `/api/${groupName}/attendances`;
		let attendances: SessionAttendanceSummary[];
		try {
			const response = await fetcher.patch(url, updates);
			attendances = sessionAttendanceSummariesSchema.parse(response);
		} catch (error) {
			dispatch(setError("PATCH " + url, error));
			return;
		}
		dispatch(setMany(attendances));
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
			dispatch(setError("DELETE " + url, error));
		}
	};
