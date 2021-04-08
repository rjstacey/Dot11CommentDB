import {createSlice, createEntityAdapter, createSelector} from '@reduxjs/toolkit'

import fetcher from 'dot11-common/store/fetcher'
import sortsSlice, {sortInit, SortDirection, SortType} from 'dot11-common/store/sort'
import filtersSlice, {filtersInit, FilterType} from 'dot11-common/store/filters'
import selectedSlice, {setSelected} from 'dot11-common/store/selected'
import uiSlice from 'dot11-common/store/ui'
import {setError} from 'dot11-common/store/error'
import {MeetingTypeOptions} from './sessions'

const meetingFields = ['id', 'Start', 'End', 'Name', 'Type', 'TimeZone', 'MeetingNumber']

/*
 * Generate a filter for each field (table column)
 */
const defaultFiltersEntries = meetingFields.reduce((entries, dataKey) => {
	let options;
	if (dataKey === 'Type')
		options = MeetingTypeOptions;
	return {...entries, [dataKey]: {options}}
}, {});

/*
 * Generate object that describes the initial sort state
 */
const defaultSortEntries = meetingFields.reduce((entries, dataKey) => {
	let type
	switch (dataKey) {
		case 'MeetingNumber':
			type = SortType.NUMERIC
			break
		case 'Start':
		case 'End':
			type = SortType.DATE
			break
		default:
			type = SortType.STRING
	}
	const direction = SortDirection.NONE;
	return {...entries, [dataKey]: {type, direction}}
}, {});


const dataAdapter = createEntityAdapter({
	selectId: (meeting) => meeting.MeetingNumber
})

const dataSet = 'imatMeetings'

const meetingsSlice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		valid: false,
		loading: false,
		[sortsSlice.name]: sortsSlice.reducer(undefined, sortInit(defaultSortEntries)),
		[filtersSlice.name]: filtersSlice.reducer(undefined, filtersInit(defaultFiltersEntries)),
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
export default meetingsSlice.reducer;

function updateIdList(meetings, selected) {
	const changed = selected.reduce(
		(result, id) => result || !meetings.find(m => m.MeetingNumber === id),
		false
	);

	if (!changed)
		return selected

	return selected.filter(id => !meetings.find(u => u.MeetingNumber === id))
}

const {getPending, getSuccess, getFailure} = meetingsSlice.actions;

export const loadImatMeetings = (n) =>
	async (dispatch, getState) => {
		dispatch(getPending())
		let meetings;
		try {
			meetings = await fetcher.get('/api/imat/meetings', {n})
		}
		catch(error) {
			console.log(error)
			return Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get meetings list', error))
			])
		}
		meetings = meetings.map(m => ({...m, Start: new Date(m.Start), End: new Date(m.End)}));
		const p = []
		const {selected} = getState()[dataSet]
		const newSelected = updateIdList(meetings, selected)
		if (newSelected !== selected)
			p.push(dispatch(setSelected(dataSet, newSelected)))

		p.push(dispatch(getSuccess(meetings)))
		return Promise.all(p)
	}

/*
 * Selectors
 */
const getMeetingsEntities = (state) => state['meetings'].entities;
const getImatMeetingsEntities = (state) => state[dataSet].entities;

/*
 * getSyncedImatMeetings(state)
 *
 * Generate imatMeetings list with indicator on each entry of presence in meetings list
 */
export const getSyncedImatMeetingsEntities = createSelector(
	getMeetingsEntities,
	getImatMeetingsEntities,
	(meetingsEntities, imatMeetingsEntities) => {
		const syncedImatMeetingsEntities = {};
		for (const id of Object.keys(imatMeetingsEntities))
			syncedImatMeetingsEntities[id] = {...imatMeetingsEntities[id], InDatabase: false}
		for (const m of Object.values(meetingsEntities)) {
			if (syncedImatMeetingsEntities[m.MeetingNumber])
				syncedImatMeetingsEntities[m.MeetingNumber].InDatabase = true
		}
		return syncedImatMeetingsEntities;
	}
);