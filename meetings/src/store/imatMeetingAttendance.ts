
import { createSelector } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import {
	createAppTableDataSlice,
	getAppTableDataSelectors,
	SortType
} from 'dot11-components';

import type { AppThunk, RootState } from '.';
import { selectImatMeetingEntities } from './imatMeetings';
import { selectBreakoutIds, getBreakouts, Breakout } from './imatBreakouts';
import { loadBreakoutAttendance, ImatBreakoutAttendance } from './imatBreakoutAttendance';

export type ImatMeetingAttendance = {
    id: number;
	breakoutId: number;
} & ImatBreakoutAttendance;

export const fields = {
	breakoutId: {label: 'Breakout'},
	SAPIN: {label: 'SA PIN', sortType: SortType.NUMERIC},
	Name: {label: 'Name'},
	Email: {label: 'Email'},
	Affiliation: {label: 'Affiliation'},
	Timestamp: {label: 'Timestamp', sortType: SortType.DATE},
};

export const dataSet = 'imatMeetingAttendance';

const selectId = (entity: ImatMeetingAttendance) => entity.id;

type ExtraState = {
	imatMeetingId: number | null;
}

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	initialState: {
		imatMeetingId: 0,
	} as ExtraState,
	reducers: {
		setDetails(state, action: PayloadAction<ExtraState>) {
			return {...state, ...action.payload};
		},
	},
});

export default slice;

/*
 * Selectors
 */
export const selectMeetingAttendanceState = (state: RootState) => state[dataSet];
export const selectAttendanceMeetingId = (state: RootState) => selectMeetingAttendanceState(state).imatMeetingId;

export const selectImatMeeting = (state: RootState) => {
	const {imatMeetingId} = selectMeetingAttendanceState(state);
	const imatMeetingEntities = selectImatMeetingEntities(state);
	return imatMeetingId? imatMeetingEntities[imatMeetingId]: undefined;
}

export const selectMeetingAttendanceCountsByBreakout = createSelector(
	selectBreakoutIds,
	selectMeetingAttendanceState,
	(breakoutIds, meetingAttendanceState) => {
		const countsByBreakoutId: Record<number, number> = {};

		/* Initialize the record */
		breakoutIds.forEach(breakoutId => countsByBreakoutId[breakoutId as number] = 0);

		/* Sum by breakout identifier */
		const {ids, entities} = meetingAttendanceState;
		ids.forEach(id => {
			const breakoutId = entities[id]!.breakoutId;
			countsByBreakoutId[breakoutId] = (countsByBreakoutId[breakoutId] || 0) + 1;
		});

		return countsByBreakoutId;
	}
);

export const imatMeetingAttendanceSelectors = getAppTableDataSelectors(selectMeetingAttendanceState);

/*
 * Actions
 */
export const imatMeetingAttendanceActions = slice.actions;

const {
	getPending,
	getSuccess,
	getFailure,
	setDetails,
	addMany,
	removeAll,
} = slice.actions;

let loadImatMeetingAttendancePromise: Promise<ImatMeetingAttendance[]> | null = null;
export const loadImatMeetingAttendance = (imatMeetingId: number): AppThunk<ImatMeetingAttendance[]> =>
	async (dispatch, getState) => {
		if (loadImatMeetingAttendancePromise)
			return loadImatMeetingAttendancePromise;
		dispatch(getPending());
		dispatch(removeAll());
		dispatch(setDetails({imatMeetingId}));
		loadImatMeetingAttendancePromise = dispatch(getBreakouts(imatMeetingId))
			.then(async (breakouts: Breakout[]) => {
				let allAttendances: ImatMeetingAttendance[] = [];
				let p: {id: number; promise: Promise<ImatBreakoutAttendance[]>}[] = [];
				let id = 0;
				while (breakouts.length > 0 || p.length > 0) {
					if (breakouts.length > 0) {
						const breakout = breakouts.shift()!;
						p.push({id: breakout.id, promise: dispatch(loadBreakoutAttendance(imatMeetingId, breakout.id))});
					}
					if (p.length === 5 || (breakouts.length === 0 && p.length > 0)) {
						const pp = p.shift()!;
						const breakoutAttendances = await pp.promise;
						/* eslint-disable-next-line no-loop-func */
						const attendances = breakoutAttendances.map((a, i) => ({id: id++, breakoutId: pp.id, ...a}))
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
			.finally(() => {
				loadImatMeetingAttendancePromise = null;
			})
		return loadImatMeetingAttendancePromise;
	}

export const getImatMeetingAttendance = (imatMeetingId: number): AppThunk<ImatMeetingAttendance[]> =>
	async (dispatch, getState) => {
		const {imatMeetingId: currentImatMeetingId, ids, entities} = selectMeetingAttendanceState(getState());
		if (currentImatMeetingId !== imatMeetingId)
			return dispatch(loadImatMeetingAttendance(imatMeetingId));
		return ids.map(id => entities[id]!);
	}

export const clearImatMeetingAttendance = (): AppThunk =>
	async (dispatch) => {
		dispatch(removeAll());
		dispatch(setDetails({imatMeetingId: null}));
	}