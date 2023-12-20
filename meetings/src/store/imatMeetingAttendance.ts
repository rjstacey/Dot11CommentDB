import { createSelector, createAction } from "@reduxjs/toolkit";

import {
	createAppTableDataSlice,
	getAppTableDataSelectors,
	FieldType,
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

export const fields = {
	breakoutId: { label: "Breakout" },
	SAPIN: { label: "SA PIN", type: FieldType.NUMERIC },
	Name: { label: "Name" },
	Email: { label: "Email" },
	Affiliation: { label: "Affiliation" },
	Timestamp: { label: "Timestamp", type: FieldType.DATE },
};

const selectId = (entity: ImatMeetingAttendance) => entity.id;

type ExtraState = {
	groupName: string | null;
	imatMeetingId: number | null;
};

const initialState: ExtraState = {
	groupName: null,
	imatMeetingId: null,
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
				(action) => action.type === clearImatMeetingAttendance.toString(),
				(state) => {
					dataAdapter.removeAll(state);
					state.imatMeetingId = null;
					state.valid = false;
				}
			);
	},
});

export default slice;

/*
 * Selectors
 */
export const selectMeetingAttendanceState = (state: RootState) =>
	state[dataSet];
export const selectAttendanceMeetingId = (state: RootState) =>
	selectMeetingAttendanceState(state).imatMeetingId;

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

/*
 * Actions
 */
export const imatMeetingAttendanceActions = slice.actions;

const { getSuccess, getFailure, addMany } =	slice.actions;
// Override the default getPending()
const getPending = createAction<{ groupName: string; imatMeetingId: number }>(
	dataSet + "/getPending"
);
export const clearImatMeetingAttendance = createAction(dataSet + "/clear");

let loadingPromise: Promise<ImatMeetingAttendance[]>;
export const loadImatMeetingAttendance =
	(groupName: string, imatMeetingId: number): AppThunk<ImatMeetingAttendance[]> =>
	(dispatch, getState) => {
		const {loading, groupName: currentGroupName, imatMeetingId: currentImatMeetingId} = selectMeetingAttendanceState(getState());
		if (loading && groupName === currentGroupName && imatMeetingId === currentImatMeetingId) {
			return loadingPromise;
		}
		dispatch(getPending({groupName, imatMeetingId}));

		loadingPromise = dispatch(loadBreakouts(groupName, imatMeetingId))
			.then(async (breakouts: Breakout[]): Promise<ImatMeetingAttendance[]> => {
				let allAttendances: ImatMeetingAttendance[] = [];
				let p: {
					id: number;
					promise: Promise<ImatBreakoutAttendance[]>;
				}[] = [];
				let id = 0;
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
						/* eslint-disable-next-line no-loop-func */
						const attendances = breakoutAttendances.map((a, i) => ({
							id: id + i,
							breakoutId: pp.id,
							...a,
						}));
						id += attendances.length;
						dispatch(addMany(attendances));
						allAttendances = allAttendances.concat(attendances);
					}
				}
				dispatch(getSuccess(allAttendances));
				return allAttendances;
			})
			.catch((error: any) => {
				dispatch(getFailure());
				return [];
			})

		return loadingPromise;
	};
