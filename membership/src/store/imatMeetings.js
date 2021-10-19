import {createSlice, createEntityAdapter, createSelector} from '@reduxjs/toolkit'

import fetcher from 'dot11-components/lib/fetcher';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error'
import {displayDate} from 'dot11-components/lib'
import {SessionTypeOptions, displaySessionType} from './sessions'

export const fields = {
	id: {label: 'ID'},
	Start: {label: 'Start', dataRenderer: displayDate, sortType: SortType.DATE},
	End: {label: 'End', dataRenderer: displayDate, sortType: SortType.DATE},
	Name: {label: 'Name'},
	Type: {label: 'Type', dataRenderer: displaySessionType, options: SessionTypeOptions},
	TimeZone: {label: 'TimeZone'},
	MeetingNumber: {label: 'MeetingNumber', sortType: SortType.NUMERIC}
};

/*
 * Remove entries that no longer exist from a list. If there
 * are no changes, return the original list.
 */
function filterIdList(idList, allIds) {
	const newList = idList.filter(id => allIds.includes(id));
	return newList.length === idList.length? idList: newList;
}

const dataAdapter = createEntityAdapter({
	selectId: (meeting) => meeting.MeetingNumber
})

const dataSet = 'imatMeetings';
const selectId = (meeting) => meeting.MeetingNumber;

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	initialState: {},
});

/*
 * Export reducer as default
 */
export default slice.reducer;

const {
	getPending,
	getSuccess,
	getFailure
} = slice.actions;

export const loadImatMeetings = (n) =>
	async (dispatch, getState) => {
		if (getState()[dataSet].loading)
			return;
		dispatch(getPending())
		let meetings;
		try {
			meetings = await fetcher.get('/api/imat/meetings', {n})
			if (!Array.isArray(meetings))
				throw new TypeError('Unexpected response to GET: /api/imat/meetings');
		}
		catch(error) {
			console.log(error)
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get meetings list', error))
			]);
			return;
		}
		meetings = meetings.map(m => ({...m, Start: new Date(m.Start), End: new Date(m.End)}));
		await dispatch(getSuccess(meetings));
	}

/*
 * Selectors
 */
const getSessionsEntities = (state) => state['sessions'].entities;
const getImatMeetingsEntities = (state) => state[dataSet].entities;

/*
 * getSyncedImatMeetings(state)
 *
 * Generate imatMeetings list with indicator on each entry of presence in meetings list
 */
export const getSyncedImatMeetingsEntities = createSelector(
	getSessionsEntities,
	getImatMeetingsEntities,
	(sessionsEntities, imatMeetingsEntities) => {
		const syncedImatMeetingsEntities = {};
		for (const id of Object.keys(imatMeetingsEntities))
			syncedImatMeetingsEntities[id] = {...imatMeetingsEntities[id], InDatabase: false};
		for (const m of Object.values(sessionsEntities)) {
			if (syncedImatMeetingsEntities[m.MeetingNumber])
				syncedImatMeetingsEntities[m.MeetingNumber].InDatabase = true;
		}
		return syncedImatMeetingsEntities;
	}
);