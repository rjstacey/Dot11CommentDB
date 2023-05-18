import { Dictionary, PayloadAction, createSelector } from '@reduxjs/toolkit';

import {
	fetcher,
	setError,
	createAppTableDataSlice,
	SortType,
	getAppTableDataSelectors,
	isObject
} from 'dot11-components';

import type { RootState, AppThunk } from '.';
import type { MemberContactInfo } from './members';
import { selectMemberEntities } from './members';
import { selectSessionEntities } from './sessionParticipation';

export const fields = {
	SAPIN: {label: 'SA PIN', sortType: SortType.NUMERIC},
	'Name/Email': {label: 'Name/Email'},
	Name: {label: 'Name'},
	Email: {label: 'Email'},
	'Employer/Affiliation': {label: 'Employer/Affiliation'},
	Employer: {label: 'Employer'},
	Affiliation: {label: 'Affiliation'},
	ContactInfo: {label: 'Contact Info'},
	Status: {label: 'Status'},
	AttendancePercentage: {label: 'Attendance', SortType: SortType.NUMERIC}
};

export const dataSet = 'dailyAttendances';

type DailyAttendance = {
	SAPIN: number;
	Name: string;
	FirstName: string;
	MI: string;
	LastName: string;
	CurrentInvolvementLevel: string;
	Email: string;
	Affiliation: string;
	Employer: string;
	ContactInfo: MemberContactInfo;
	AttendancePercentage: number;
}

type SyncedDailyAttendance = DailyAttendance & {
	Status: string;
}


/*
 * Slice
 */
const selectId = (attendance: DailyAttendance) => attendance.SAPIN;

const initialState: {sessionId: number | null} = {
	sessionId: null
}

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	initialState,
	reducers: {
		setSessionId(state, action: PayloadAction<number | null>) {
			state.sessionId = action.payload;
		}
	},
});

export default slice;

/*
 * Selectors
 */
export const selectDailyAttendancesState = (state: RootState) => state[dataSet];
export const selectDailyAttendanceIds = (state: RootState) => selectDailyAttendancesState(state).ids;
export const selectDailyAttendanceEntities = (state: RootState) => selectDailyAttendancesState(state).entities;

const selectSyncedDailyAttendanceEntities = createSelector(
	selectDailyAttendanceIds,
	selectDailyAttendanceEntities,
	selectMemberEntities,
	(ids, entities, memberEntities) => {
		const newEntities: Dictionary<SyncedDailyAttendance> = {};
		ids.forEach(id => {
			const entity = entities[id]!;
			const m = memberEntities[id];
			newEntities[id] = {...entity, Status: m? m.Status: "New"}
		});
		return newEntities;
	}
);

export const dailyAttendancesSelectors = getAppTableDataSelectors(selectDailyAttendancesState, {selectEntities: selectSyncedDailyAttendanceEntities});

/*
 * Actions
 */

const {
	getPending,
	getSuccess,
	getFailure,
	removeAll,
	setSessionId
} = slice.actions;

export const dailyAttendancesActions = slice.actions;

const baseUrl = '/api/imat/dailyAttendance';

function validDailyAttendance(entry: any): entry is DailyAttendance {
	return isObject(entry);
}

function validGetResponse(response: any): response is DailyAttendance[] {
	return Array.isArray(response) && response.every(validDailyAttendance);
}

export const loadDailyAttendances = (sessionId: number): AppThunk =>
	async (dispatch, getState) => {
		const session = selectSessionEntities(getState())[sessionId];
		if (!session)
			return;
		dispatch(getPending());
		dispatch(removeAll());
		dispatch(setSessionId(sessionId));
		const url = `${baseUrl}/${session.imatMeetingId}`;
		let response: any;
		try {
			response = await fetcher.get(url);
			if (!validGetResponse(response))
				throw new TypeError('Unexpected response to GET: ' + url);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get attendances', error));
			return;
		}
		dispatch(getSuccess(response));
	}

export const clearDailyAttendances = (): AppThunk =>
	async (dispatch) => {
		dispatch(removeAll());
		dispatch(setSessionId(null));
	}