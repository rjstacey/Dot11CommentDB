import {createSlice, createEntityAdapter, createSelector} from '@reduxjs/toolkit'

import fetcher from 'dot11-components/lib/fetcher'
import sortsSlice, {initSorts, SortDirection, SortType} from 'dot11-components/store/sort'
import filtersSlice, {initFilters, FilterType} from 'dot11-components/store/filters'
import selectedSlice, {setSelected} from 'dot11-components/store/selected'
import uiSlice from 'dot11-components/store/ui'
import {setError} from 'dot11-components/store/error'
import {displayDate} from 'dot11-components/lib/utils'
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

const dataSet = 'imatMeetings'

const slice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		valid: false,
		loading: false,
		[sortsSlice.name]: sortsSlice.reducer(undefined, initSorts(fields)),
		[filtersSlice.name]: filtersSlice.reducer(undefined, initFilters(fields)),
		[selectedSlice.name]: selectedSlice.reducer(undefined, {}),
		[uiSlice.name]: uiSlice.reducer(undefined, {})
	}),
	reducers: {
		getPending(state, action) {
			state.loading = true;
		},
  		getSuccess(state, action) {
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, action.payload);
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		getFailure(state, action) {
			state.loading = false;
		},
	},
	extraReducers: builder => {
		builder
		.addMatcher(
			(action) => action.type.startsWith(dataSet + '/'),
			(state, action) => {
				const sliceAction = {...action, type: action.type.replace(dataSet + '/', '')}
				state[sortsSlice.name] = sortsSlice.reducer(state[sortsSlice.name], sliceAction);
				state[filtersSlice.name] = filtersSlice.reducer(state[filtersSlice.name], sliceAction);
				state[selectedSlice.name] = selectedSlice.reducer(state[selectedSlice.name], sliceAction);
				state[uiSlice.name] = uiSlice.reducer(state[uiSlice.name], sliceAction);
			}
		)
	}
});

/*
 * Export reducer as default
 */
export default slice.reducer;

const {getPending, getSuccess, getFailure} = slice.actions;

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
			syncedImatMeetingsEntities[id] = {...imatMeetingsEntities[id], InDatabase: false}
		for (const m of Object.values(sessionsEntities)) {
			if (syncedImatMeetingsEntities[m.MeetingNumber])
				syncedImatMeetingsEntities[m.MeetingNumber].InDatabase = true
		}
		return syncedImatMeetingsEntities;
	}
);