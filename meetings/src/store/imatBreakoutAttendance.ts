
import {
	fetcher,
	setError,
	createAppTableDataSlice,
	getAppTableDataSelectors,
	SortType
} from 'dot11-components';

import type { PayloadAction } from '@reduxjs/toolkit';
import type { AppThunk, RootState } from '.';
import type { Member } from './members';

import { selectImatMeetingEntities } from './imatMeetings';
import { selectBreakoutMeetingId, selectBreakoutEntities } from './imatBreakouts';

export const fields = {
	id: {label: 'id', sortType: SortType.NUMERIC},
	SAPIN: {label: 'SA PIN', sortType: SortType.NUMERIC},
	Name: {label: 'Name'},
	Email: {label: 'Email'},
	Affiliation: {label: 'Affiliation'},
	Timestamp: {label: 'Timestamp', sortType: SortType.DATE},
};

export const dataSet = 'imatBreakoutAttendance';

const selectId = (member: Member) => member.SAPIN;

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

export const loadBreakoutAttendance = (imatMeetingId: number, imatBreakoutId: number): AppThunk =>
	async (dispatch, getState) => {
		if (selectBreakoutAttendanceState(getState()).loading)
			return;
		dispatch(getPending());
		const url = `${baseUrl}/${imatMeetingId}/${imatBreakoutId}`;
		let response;
		try {
			response = await fetcher.get(url);
			if (!Array.isArray(response))
				throw new TypeError('Unexpected response to GET ' + url);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError(`Unable to get attendance for ${imatMeetingId}/${imatBreakoutId}`, error));
			return;
		}
		dispatch(setDetails({imatMeetingId, imatBreakoutId}));
		dispatch(getSuccess(response));
	}
