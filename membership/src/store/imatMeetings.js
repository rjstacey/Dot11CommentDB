import {createSelector} from '@reduxjs/toolkit';

import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error'
//import {displayDate} from 'dot11-components/lib'
import {SessionTypeOptions, displaySessionType, selectSessionsEntities} from './sessions'

const monthStr = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function displayDate(isoDate) {
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
//const selectId = (meeting) => meeting.MeetingNumber;

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	//selectId,
	initialState: {},
});

/*
 * Reducer
 */
export default slice.reducer;

/*
 * Selectors
 */
export const selectImatMeetingsState = (state) => state[dataSet];
const selectImatMeetingsEntities = (state) => selectImatMeetingsState(state).entities;

/*
 * selectSyncedImatMeetings(state)
 *
 * Generate imatMeetings list with indicator on each entry of presence in meetings list
 */
export const selectSyncedImatMeetingsEntities = createSelector(
	selectSessionsEntities,
	selectImatMeetingsEntities,
	(sessionsEntities, imatMeetingsEntities) => {
		const syncedImatMeetingsEntities = {};
		for (const id of Object.keys(imatMeetingsEntities))
			syncedImatMeetingsEntities[id] = {...imatMeetingsEntities[id], sessionId: null};
		for (const m of Object.values(sessionsEntities)) {
			if (syncedImatMeetingsEntities[m.imatMeetingId])
				syncedImatMeetingsEntities[m.imatMeetingId].sessionId = m.id;
		}
		return syncedImatMeetingsEntities;
	}
);

/*
 * Actions
 */
const {
	getPending,
	getSuccess,
	getFailure
} = slice.actions;

const baseUrl = '/api/imat/meetings';

export const loadImatMeetings = (n) =>
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

