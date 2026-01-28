import {
	createEntityAdapter,
	createSlice,
	PayloadAction,
	EntityId,
	Dictionary,
	createSelector,
} from "@reduxjs/toolkit";

import { fetcher } from "@common";

import type { RootState, AppThunk } from ".";
import { setError } from ".";
import {
	selectMemberIds,
	selectMemberEntities,
	isActiveMember,
} from "./members";
import { selectSessionByNumber, updateSession } from "./sessions";
import {
	SessionAttendanceSummary,
	SessionAttendanceSummaryCreate,
	SessionAttendanceSummaryChange,
	SessionAttendanceSummaryUpdate,
	sessionAttendanceSummariesSchema,
	SessionAttendeesExportQuery,
} from "@schemas/attendances";

export type {
	SessionAttendanceSummary,
	SessionAttendanceSummaryCreate,
	SessionAttendanceSummaryChange,
	SessionAttendanceSummaryUpdate,
	SessionAttendeesExportQuery,
};

export function getNullAttendanceSummary(
	session_id: number,
	SAPIN: number,
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
	groupName: string | null;
	sessionIds: EntityId[];
	loading: Record<number, boolean>;
	lastLoad: Record<number, string | null>;
};

/* Create slice */
const selectId = (d: SessionAttendanceSummary) => d.id;
const dataAdapter = createEntityAdapter<SessionAttendanceSummary>({ selectId });
const initialState = dataAdapter.getInitialState<ExtraState>({
	groupName: null,
	sessionIds: [],
	loading: {},
	lastLoad: {},
});
const dataSet = "attendanceSummaries";
const slice = createSlice({
	name: dataSet,
	initialState,
	reducers: {
		getPending(
			state,
			action: PayloadAction<{ groupName: string; session_id: number }>,
		) {
			const { groupName, session_id } = action.payload;
			state.loading[session_id] = true;
			state.lastLoad[session_id] = new Date().toISOString();
			if (state.groupName !== groupName) {
				state.groupName = groupName;
				state.sessionIds = [session_id];
				dataAdapter.removeAll(state);
			}
		},
		getSuccess(
			state,
			action: PayloadAction<{
				session_id: number;
				attendanceSummaries: SessionAttendanceSummary[];
			}>,
		) {
			const { session_id, attendanceSummaries } = action.payload;
			state.loading[session_id] = false;
			if (!state.sessionIds.includes(session_id)) {
				state.sessionIds.push(session_id);
			}
			const ids = state.ids.filter(
				(id) => state.entities[id]?.session_id === session_id,
			);
			dataAdapter.removeMany(state, ids);
			dataAdapter.setMany(state, attendanceSummaries);
		},
		getFailure(state, action: PayloadAction<{ session_id: number }>) {
			const { session_id } = action.payload;
			state.loading[session_id] = false;
			state.lastLoad[session_id] = null;
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
export const selectAttendanceSummariesState = (state: RootState) =>
	state[dataSet];
const selectAttendanceSummariesAge = (state: RootState, session_id: number) => {
	const lastLoad = selectAttendanceSummariesState(state).lastLoad[session_id];
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
const selectAttendanceSummariesLoading = (
	state: RootState,
	session_id: number,
) => selectAttendanceSummariesState(state).loading[session_id];
export const selectAttendanceSummariesIds = (state: RootState) =>
	selectAttendanceSummariesState(state).ids;
export const selectAttendanceSummariesEntities = (state: RootState) =>
	selectAttendanceSummariesState(state).entities;
export const selectAttendanceSummariesGroupName = (state: RootState) =>
	selectAttendanceSummariesState(state).groupName;

/** Select attendance summary entities for session indexed by SAPIN */
export const selectAttendanceSummaryEntitiesForSession = createSelector(
	selectAttendanceSummariesIds,
	selectAttendanceSummariesEntities,
	(state: RootState, session_id: number | null) => session_id,
	(ids, entities, session_id) => {
		const newEntities: Dictionary<SessionAttendanceSummary> = {};
		for (const id of ids) {
			const entity = entities[id]!;
			if (entity.session_id === session_id)
				newEntities[entity.SAPIN] = entity;
		}
		return newEntities;
	},
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
	selectAttendanceSummariesIds,
	selectAttendanceSummariesEntities,
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
				const a = { ...entity, CurrentSAPIN: sapin };
				if (membersAttendanceEntities[sapin]) {
					// Don't replace if current entry has higher attendance
					const a_current =
						membersAttendanceEntities[sapin][entity.session_id];
					if (
						a_current &&
						(a_current.AttendancePercentage || 0) >=
							(a.AttendancePercentage || 0)
					)
						continue;
				}
				membersAttendanceEntities[sapin] = {
					...membersAttendanceEntities[sapin],
					[entity.session_id]: a,
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
	},
);

/** Thunk actions */
const AGE_STALE = 60 * 60 * 1000; // 1 hour

const loadingPromise: Record<number, Promise<void>> = {};
export const loadAttendanceSummary =
	(groupName: string, session_id: number, force = false): AppThunk<void> =>
	async (dispatch, getState) => {
		const state = getState();
		const { groupName: currentGroupName } =
			selectAttendanceSummariesState(state);
		if (currentGroupName === groupName) {
			const loading = selectAttendanceSummariesLoading(state, session_id);
			if (loading) return loadingPromise[session_id];
			const age = selectAttendanceSummariesAge(state, session_id);
			if (!force && age && age < AGE_STALE) return Promise.resolve();
		}
		dispatch(getPending({ groupName, session_id }));
		const url = `/api/${groupName}/attendances?session_id=${session_id}`;
		loadingPromise[session_id] = fetcher
			.get(url)
			.then((response) => {
				const attendanceSummaries =
					sessionAttendanceSummariesSchema.parse(response);
				dispatch(getSuccess({ session_id, attendanceSummaries }));
			})
			.catch((error) => {
				dispatch(getFailure({ session_id }));
				dispatch(setError("GET " + url, error));
			});
		return loadingPromise[session_id];
	};

export const importAttendanceSummary =
	(groupName: string, sessionNumber: number, useDaily = false): AppThunk =>
	async (dispatch, getState) => {
		const session = selectSessionByNumber(getState(), sessionNumber);
		if (!session) {
			dispatch(
				setError("Can't retrieve attendance", "Bad session number"),
			);
			return;
		}
		let url = `/api/${groupName}/attendances/${session.id}/import`;
		if (useDaily) url += "?useDaily=true";
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
			}),
		);
		dispatch(setMany(attendances));
	};

export const addAttendanceSummaries =
	(adds: SessionAttendanceSummaryCreate[]): AppThunk =>
	async (dispatch, getState) => {
		if (adds.length === 0) return;
		const groupName = selectAttendanceSummariesGroupName(getState());
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
		if (updates.length === 0) return;
		dispatch(updateMany(updates));
		const groupName = selectAttendanceSummariesGroupName(getState());
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
		if (ids.length === 0) return;
		dispatch(removeMany(ids));
		const groupName = selectAttendanceSummariesGroupName(getState());
		const url = `/api/${groupName}/attendances`;
		try {
			await fetcher.delete(url, ids);
		} catch (error) {
			dispatch(setError("DELETE " + url, error));
		}
	};

export const exportAttendees =
	(
		groupName: string,
		sessionNumber: number,
		format: "minutes" | "dvl",
	): AppThunk =>
	async (dispatch, getState) => {
		const session = selectSessionByNumber(getState(), sessionNumber);
		if (!session) {
			dispatch(setError("Can't export attendees", "Bad session number"));
			return;
		}
		const url = `/api/${groupName}/attendances/${session.id}/export`;
		try {
			await fetcher.getFile(url, {
				format,
			} satisfies SessionAttendeesExportQuery);
		} catch (error) {
			dispatch(
				setError(
					"Unable to export attendees for session " +
						`id=${session.id}`,
					error,
				),
			);
		}
	};
