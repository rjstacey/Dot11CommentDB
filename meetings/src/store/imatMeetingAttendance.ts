
import { createSelector } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	getAppTableDataSelectors,
	SortType
} from 'dot11-components';

import type { AppThunk, RootState } from '.';
import { selectImatMeetingEntities } from './imatMeetings';
import { selectBreakoutIds, loadBreakouts } from './imatBreakouts';
import type { ImatBreakoutAttendance } from './imatBreakoutAttendance';
import { loadBreakoutAttendance } from './imatBreakoutAttendance';

export type ImatMeetingAttendance = {
    id: number;
	//committee: string;
	//breakoutName: string;
	breakoutId: number;
	SAPIN: number;
	Name: string;
	Email: string;
	Timestamp: string;
	Affiliation: string;
}

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

const baseUrl = '/api/imat/attendance';

export const loadImatMeetingAttendance2 = (imatMeetingId: number): AppThunk =>
	async (dispatch, getState) => {
		if (selectMeetingAttendanceState(getState()).loading)
			return;
		dispatch(getPending());
		dispatch(removeAll());
		const url = `${baseUrl}/${imatMeetingId}`;
		let response;
		try {
			response = await fetcher.get(url);
			if (!Array.isArray(response))
				throw new TypeError('Unexpected response to GET ' + url);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to get attendance for ${imatMeetingId}`, error));
			return;
		}
		dispatch(setDetails({imatMeetingId}));
		dispatch(getSuccess(response));
	}

export const loadImatMeetingAttendance = (imatMeetingId: number): AppThunk =>
	async (dispatch, getState) => {
		const state = getState();
		if (selectMeetingAttendanceState(state).loading)
			return;
		dispatch(getPending());
		dispatch(removeAll());
		dispatch(setDetails({imatMeetingId}));
		const breakouts = (await dispatch(loadBreakouts(imatMeetingId))).slice();

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
	}

export const clearImatMeetingAttendance = (): AppThunk =>
	async (dispatch) => {
		dispatch(removeAll());
		dispatch(setDetails({imatMeetingId: null}));
	}