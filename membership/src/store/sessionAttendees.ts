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
import { selectWorkingGroupName } from './groups';
import { selectMemberEntities } from './members';
import { selectSession } from './sessions';

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

export type SessionAttendee = {
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

export type SyncedSessionAttendee = SessionAttendee & {
	Status: string;
}

/*
 * Slice
 */
const selectId = (attendee: SessionAttendee) => attendee.SAPIN;

const initialState: {sessionId: number | null} = {
	sessionId: null
}

const dataSet = 'dailyAttendances';
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
export const selectSessionAttendeesState = (state: RootState) => state[dataSet];
export const selectSessionAttendeesIds = (state: RootState) => selectSessionAttendeesState(state).ids;
export const selectSessionAttendeesEntities = (state: RootState) => selectSessionAttendeesState(state).entities;

const selectSyncedSessionAtendeesEntities = createSelector(
	selectSessionAttendeesIds,
	selectSessionAttendeesEntities,
	selectMemberEntities,
	(ids, entities, memberEntities) => {
		const newEntities: Dictionary<SyncedSessionAttendee> = {};
		ids.forEach(id => {
			const entity = entities[id]!;
			const m = memberEntities[id];
			newEntities[id] = {...entity, Status: m? m.Status: "New"}
		});
		return newEntities;
	}
);

export const sessionAttendeesSelectors = getAppTableDataSelectors(
	selectSessionAttendeesState,
	{selectEntities: selectSyncedSessionAtendeesEntities}
);

/*
 * Actions
 */
export const sessionAttendeesActions = slice.actions;

const {
	getPending,
	getSuccess,
	getFailure,
	removeAll,
	setSessionId
} = slice.actions;

function validSessionAttendee(entry: any): entry is SessionAttendee {
	return isObject(entry);
}

function validGetResponse(response: any): response is SessionAttendee[] {
	return Array.isArray(response) && response.every(validSessionAttendee);
}

export const loadSessionAttendees = (sessionId: number): AppThunk =>
	async (dispatch, getState) => {
		const state = getState();
		const session = selectSession(state, sessionId);
		if (!session) {
			console.error('Bad sessionId');
			return;
		}
		dispatch(getPending());
		dispatch(removeAll());
		dispatch(setSessionId(sessionId));
		const groupName = selectWorkingGroupName(state);
		const url = `/api/${groupName}/imat/dailyAttendance/${session.imatMeetingId}`;
		let response: any;
		try {
			response = await fetcher.get(url);
			if (!validGetResponse(response))
				throw new TypeError('Unexpected response to GET ' + url);
		}
		catch(error) {
			dispatch(getFailure());
			dispatch(setError('Unable to get attendances', error));
			return;
		}
		dispatch(getSuccess(response));
	}

export const clearSessionAttendees = (): AppThunk =>
	async (dispatch) => {
		dispatch(removeAll());
		dispatch(setSessionId(null));
	}