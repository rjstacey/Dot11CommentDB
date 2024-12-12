import { createSelector, createAction } from "@reduxjs/toolkit";

import {
	createAppTableDataSlice,
	getAppTableDataSelectors,
	FieldType,
	Fields,
} from "dot11-components";

import type { AppThunk, RootState } from ".";
import { selectImatMeetingEntities } from "./imatMeetings";
import { selectBreakoutIds, loadBreakouts, Breakout } from "./imatBreakouts";
import {
	loadBreakoutAttendance,
	ImatBreakoutAttendance,
} from "./imatBreakoutAttendance";

export type ImatMeetingAttendance = {
	id: number;
	breakoutId: number;
} & ImatBreakoutAttendance;

export const fields: Fields = {
	breakoutId: { label: "Breakout" },
	SAPIN: { label: "SA PIN", type: FieldType.NUMERIC },
	Name: { label: "Name" },
	Email: { label: "Email" },
	Affiliation: { label: "Affiliation" },
	Timestamp: { label: "Timestamp", type: FieldType.DATE },
};

const selectId = (entity: ImatMeetingAttendance) => entity.id;

const initialState = {
	groupName: null as string | null,
	imatMeetingId: null as number | null,
	lastLoad: null as string | null,
};

const dataSet = "imatMeetingAttendance";
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	initialState,
	reducers: {},
	extraReducers(builder, dataAdapter) {
		builder
			.addMatcher(
				(action) => action.type === getPending.toString(),
				(state, action: ReturnType<typeof getPending>) => {
					const { groupName, imatMeetingId } = action.payload;
					state.lastLoad = new Date().toISOString();
					if (
						state.groupName !== groupName ||
						state.imatMeetingId !== imatMeetingId
					) {
						state.groupName = groupName;
						state.imatMeetingId = imatMeetingId;
						dataAdapter.removeAll(state);
					}
				}
			)
			.addMatcher(
				(action) =>
					action.type === clearImatMeetingAttendance.toString(),
				(state) => {
					dataAdapter.removeAll(state);
					state.imatMeetingId = null;
					state.valid = false;
				}
			);
	},
});

export default slice;

/* Slice actions */
export const imatMeetingAttendanceActions = slice.actions;

const { getSuccess, getFailure, addMany } = slice.actions;

// Override getPending() with one that sets groupName and imatMeetingId
const getPending = createAction<{ groupName: string; imatMeetingId: number }>(
	dataSet + "/getPending"
);
export const clearImatMeetingAttendance = createAction(dataSet + "/clear");

/* Selectors */
export const selectMeetingAttendanceState = (state: RootState) =>
	state[dataSet];
const selectMeetingAttendanceAge = (state: RootState) => {
	let lastLoad = selectMeetingAttendanceState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
export const selectAttendanceMeetingId = (state: RootState) =>
	selectMeetingAttendanceState(state).imatMeetingId;
const selectMeetingAttendanceIds = (state: RootState) =>
	selectMeetingAttendanceState(state).ids;
const selectMeetingAttendanceEntities = (state: RootState) =>
	selectMeetingAttendanceState(state).entities;
const seelctMeetingAttendances = createSelector(
	selectMeetingAttendanceIds,
	selectMeetingAttendanceEntities,
	(ids, entities) => ids.map((id) => entities[id]!)
);
export const selectImatMeeting = (state: RootState) => {
	const { imatMeetingId } = selectMeetingAttendanceState(state);
	const imatMeetingEntities = selectImatMeetingEntities(state);
	return imatMeetingId ? imatMeetingEntities[imatMeetingId] : undefined;
};

export const selectMeetingAttendanceCountsByBreakout = createSelector(
	selectBreakoutIds,
	selectMeetingAttendanceState,
	(breakoutIds, meetingAttendanceState) => {
		const countsByBreakoutId: Record<number, number> = {};

		/* Initialize the record */
		breakoutIds.forEach(
			(breakoutId) => (countsByBreakoutId[breakoutId as number] = 0)
		);

		/* Sum by breakout identifier */
		const { ids, entities } = meetingAttendanceState;
		ids.forEach((id) => {
			const breakoutId = entities[id]!.breakoutId;
			countsByBreakoutId[breakoutId] =
				(countsByBreakoutId[breakoutId] || 0) + 1;
		});

		return countsByBreakoutId;
	}
);

export const imatMeetingAttendanceSelectors = getAppTableDataSelectors(
	selectMeetingAttendanceState
);

/* Thunk actions */
const AGE_STALE = 60 * 60 * 1000; // 1 hour
let loading = false;
let loadingPromise: Promise<ImatMeetingAttendance[]>;
export const loadImatMeetingAttendance =
	(
		groupName: string,
		imatMeetingId: number,
		force = false
	): AppThunk<ImatMeetingAttendance[]> =>
	(dispatch, getState) => {
		const state = getState();
		const current = selectMeetingAttendanceState(state);
		if (
			groupName === current.groupName &&
			imatMeetingId === current.imatMeetingId
		) {
			if (loading) return loadingPromise;
			const age = selectMeetingAttendanceAge(state);
			if (!force && age && age < AGE_STALE)
				return Promise.resolve(seelctMeetingAttendances(state));
		}
		dispatch(getPending({ groupName, imatMeetingId }));
		loading = true;
		loadingPromise = dispatch(loadBreakouts(groupName, imatMeetingId))
			.then(
				async (
					breakouts: Breakout[]
				): Promise<ImatMeetingAttendance[]> => {
					let allAttendances: ImatMeetingAttendance[] = [];
					let p: {
						id: number;
						promise: Promise<ImatBreakoutAttendance[]>;
					}[] = [];
					let id = 0;
					function breakoutToMeetingAttendance(
						breakoutId: number,
						breakoutAttendance: ImatBreakoutAttendance
					): ImatMeetingAttendance {
						return { id: id++, breakoutId, ...breakoutAttendance };
					}
					while (breakouts.length > 0 || p.length > 0) {
						if (breakouts.length > 0) {
							const breakout = breakouts.shift()!;
							p.push({
								id: breakout.id,
								promise: dispatch(
									loadBreakoutAttendance(
										groupName,
										imatMeetingId,
										breakout.id
									)
								),
							});
						}
						if (
							p.length === 5 ||
							(breakouts.length === 0 && p.length > 0)
						) {
							const pp = p.shift()!;
							const breakoutAttendances = await pp.promise;
							const attendances = breakoutAttendances.map((a) =>
								breakoutToMeetingAttendance(pp.id, a)
							);
							dispatch(addMany(attendances));
							allAttendances = allAttendances.concat(attendances);
						}
					}
					dispatch(getSuccess(allAttendances));
					return seelctMeetingAttendances(getState());
				}
			)
			.catch((error: any) => {
				dispatch(getFailure());
				return [];
			})
			.finally(() => {
				loading = false;
			});

		return loadingPromise;
	};
