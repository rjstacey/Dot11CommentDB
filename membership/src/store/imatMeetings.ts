import {createSelector, Dictionary, EntityId} from '@reduxjs/toolkit';

import {fetcher, getAppTableDataSelectors, setError} from 'dot11-components';
import {createAppTableDataSlice, SortType} from 'dot11-components';
import type { AppTableDataState } from 'dot11-components';

import type { RootState, AppThunk } from '.';

import {SessionTypeOptions, selectSessionEntities} from './sessions'

const monthStr = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function displayDate(isoDate: string) {
	// ISO date: "YYYY-MM-DD"
	const year = parseInt(isoDate.substr(0, 4));
	const month = parseInt(isoDate.substr(5, 7));
	const date = parseInt(isoDate.substr(8, 10));
	return `${year} ${monthStr[month] || '???'} ${date}`; 
}

export const fields = {
	id: {label: 'ID'},
	start: {label: 'Start', dataRenderer: displayDate},
	end: {label: 'End', dataRenderer: displayDate},
	name: {label: 'Name'},
	type: {label: 'Type', options: SessionTypeOptions},
	timezone: {label: 'Time zone'},
	MeetingNumber: {label: 'Meeting number', sortType: SortType.NUMERIC}
};

export const dataSet = 'imatMeetings';

export type ImatMeeting = {
	id: number;
	name: string;
	imatMeetingId: number;
	timezone: string;
	start: string;
	end: string;
	type: string;
	organizerId: string;
};

type ImatMeetingsState = AppTableDataState<ImatMeeting>;

/*
 * Slice
 */
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	initialState: {},
	reducers: {}
});

export default slice;

/*
 * Selectors
 */
export const selectImatMeetingsState = (state: any): ImatMeetingsState => state[dataSet] as ImatMeetingsState;

export const imatMeetingsSelectors = getAppTableDataSelectors(selectImatMeetingsState);

const selectImatMeetingsEntities = (state: any) => selectImatMeetingsState(state).entities;

/*
 * selectSyncedImatMeetings(state)
 *
 * Generate imatMeetings list with indicator on each entry of presence in meetings list
 */
export const selectSyncedImatMeetingsEntities = createSelector(
	selectSessionEntities,
	selectImatMeetingsEntities,
	(sessionsEntities, imatMeetingsEntities) => {
		const syncedImatMeetingsEntities: Dictionary<ImatMeeting & { sessionId: number | null }> = {};
		for (const id of Object.keys(imatMeetingsEntities))
			syncedImatMeetingsEntities[id] = {...imatMeetingsEntities[id]!, sessionId: null};
		for (const m of Object.values(sessionsEntities)) {
			if (syncedImatMeetingsEntities[m!.imatMeetingId])
				syncedImatMeetingsEntities[m!.imatMeetingId]!.sessionId = m!.id;
		}
		return syncedImatMeetingsEntities;
	}
);

/*
 * Actions
 */
export const imatMeetingsActions = slice.actions;

const {
	getPending,
	getSuccess,
	getFailure
} = slice.actions;

const baseUrl = '/api/imat/meetings';

export const loadImatMeetings = (n: number): AppThunk =>
	async (dispatch, getState) => {
		if (selectImatMeetingsState(getState()).loading)
			return;
		dispatch(getPending())
		let meetings;
		try {
			meetings = await fetcher.get(baseUrl)
			if (!Array.isArray(meetings))
				throw new TypeError('Unexpected response to GET ' + baseUrl);
		}
		catch(error) {
			console.log(error)
			dispatch(getFailure());
			dispatch(setError('Unable to get meetings list', error));
			return;
		}
		await dispatch(getSuccess(meetings));
	}

