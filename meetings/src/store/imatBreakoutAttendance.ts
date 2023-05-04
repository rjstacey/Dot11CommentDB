
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
import { selectBreakoutMeetingId, selectBreakoutEntities } from './imatBreakouts';

export type ImatBreakoutAttendance = {
	SAPIN: number;
	Name: string;
	Email: string;
	Timestamp: string;
	Affiliation: string;
}

export const fields = {
	SAPIN: {label: 'SA PIN', sortType: SortType.NUMERIC},
	Name: {label: 'Name'},
	Email: {label: 'Email'},
	Affiliation: {label: 'Affiliation'},
	Timestamp: {label: 'Timestamp', sortType: SortType.DATE},
};

export const dataSet = 'imatBreakoutAttendance';

const selectId = (entity: ImatBreakoutAttendance) => entity.SAPIN;

type ExtraState = {
	imatMeetingId: number;
	imatBreakoutId: number;
}

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	initialState: {
		imatMeetingId: 0,
		imatBreakoutId: 0,
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
export const selectBreakoutAttendanceState = (state: RootState) => state[dataSet];

export const selectImatMeeting = (state: RootState) => {
	const {imatMeetingId} = selectBreakoutAttendanceState(state);
	const imatMeetingEntities = selectImatMeetingEntities(state);
	return imatMeetingEntities[imatMeetingId];
}

export const selectImatBreakout = (state: RootState) => {
	const {imatMeetingId, imatBreakoutId} = selectBreakoutAttendanceState(state);
	if (imatMeetingId === selectBreakoutMeetingId(state)) {
		const imatBreakoutEntities = selectBreakoutEntities(state);
		return imatBreakoutEntities[imatBreakoutId];
	}
}

export const imatBreakoutAttendanceSelectors = getAppTableDataSelectors(selectBreakoutAttendanceState);

/*
 * Actions
 */
export const imatBreakoutAttendanceActions = slice.actions;

const {
	getPending,
	getSuccess,
	getFailure,
	setDetails,
} = slice.actions;

const baseUrl = '/api/imat/attendance';

export const loadBreakoutAttendance = (imatMeetingId: number, imatBreakoutId: number): AppThunk<ImatBreakoutAttendance[]> =>
	async (dispatch, getState) => {
		dispatch(getPending());
		const url = `${baseUrl}/${imatMeetingId}/${imatBreakoutId}`;
		let response;
		try {
			response = await fetcher.get(url);
			if (!Array.isArray(response))
				throw new TypeError('Unexpected response to GET ' + url);
		}
		catch (error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to get attendance for ${imatMeetingId}/${imatBreakoutId}`, error));
			return [];
		}
		dispatch(setDetails({imatMeetingId, imatBreakoutId}));
		dispatch(getSuccess(response));
		return response;
	}

