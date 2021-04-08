import {createSlice, createEntityAdapter} from '@reduxjs/toolkit'

import fetcher from 'dot11-common/store/fetcher'
import sortsSlice, {sortInit, SortDirection, SortType} from 'dot11-common/store/sort'
import filtersSlice, {filtersInit, FilterType} from 'dot11-common/store/filters'
import selectedSlice, {setSelected} from 'dot11-common/store/selected'
import uiSlice from 'dot11-common/store/ui'
import {setError} from 'dot11-common/store/error'


const SessionType = {
	Plenary: 'p',
	Interim: 'i',
	Other: 'o',
	General: 'g',
}

export const MeetingTypeOptions = [
	{value: SessionType.Plenary, label: 'Plenary'},
	{value: SessionType.Interim, label: 'Interim'},
	{value: SessionType.Other, label: 'Other'},
	{value: SessionType.General, label: 'General'}
]

const meetingFields = ['id', 'Start', 'End', 'Name', 'Type', 'TimeZone']

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
		case 'id':
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
	selectId: (meeting) => meeting.id
})

const dataSet = 'sessions'

const slice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		valid: false,
		loading: false,
		timeZones: [],
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
		getTimeZonesSuccess(state, action) {
			state.timeZones = action.payload
		},
		updateOne(state, action) {
			dataAdapter.updateOne(state, action.payload);
		},
		addOne(state, action) {
			const meeting = action.payload;
			dataAdapter.addOne(state, meeting);
		},
		deleteMany(state, action) {
			const ids = action.payload;
			dataAdapter.removeMany(state, ids);
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

function updateIdList(meetings, selected) {
	const changed = selected.reduce(
		(result, id) => result || !meetings.find(m => m.id === id),
		false
	);

	if (!changed)
		return selected

	return selected.filter(id => !meetings.find(u => u.id === id))
}

const {getPending, getSuccess, getFailure} = slice.actions;

export const loadSessions = () =>
	async (dispatch, getState) => {
		dispatch(getPending())
		let meetings;
		try {
			meetings = await fetcher.get('/api/sessions');
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
		const {selected, timeZones} = getState()[dataSet]
		const newSelected = updateIdList(meetings, selected)
		if (newSelected !== selected)
			p.push(dispatch(setSelected(dataSet, newSelected)))
		if (timeZones.length === 0)
			p.push(dispatch(loadTimeZones()))
		p.push(dispatch(getSuccess(meetings)))
		return Promise.all(p)
	}

const {getTimeZonesSuccess} = slice.actions;

export const loadTimeZones = () =>
	async (dispatch, getState) => {
		let timeZones;
		try {
			timeZones = await fetcher.get('/api/timeZones');
		}
		catch(error) {
			console.log(error)
			return dispatch(setError('Unable to get time zones list', error))
		}
		return dispatch(getTimeZonesSuccess(timeZones))
	}

const {updateOne} = slice.actions;

export const updateSession = (id, changes) =>
	async (dispatch) => {
		dispatch(updateOne({id, changes}))
		try {
			const response = await fetcher.put(`/api/session/${id}`, {meeting: changes})
			return null
		}
		catch(error) {
			return dispatch(setError(`Unable to update session ${id}`, error))
		}
	}

const {addOne} = slice.actions;

export const addSession = (meeting) =>
	async (dispatch) => {
		let response;
		try {
			response = await fetcher.post('/api/session', {meeting})
		}
		catch(error) {
			return dispatch(setError(`Unable to add meeting ${meeting}`, error))
		}
		dispatch(addOne(response.meeting))
	}

const {deleteMany} = slice.actions;

export const deleteSessions = (ids) =>
	async (dispatch, getState) => {
		dispatch(deleteMany(ids))
		try {
			await fetcher.delete('/api/sessions', ids)
			const {selected} = getState()[dataSet]
			const newSelected = selected.filter(id => !ids.includes(id))
			return dispatch(setSelected(dataSet, newSelected))
		}
		catch(error) {
			return dispatch(setError(`Unable to delete meetings ${ids}`, error))
		}
	}

export const importSessionBreakouts = (id) =>
	async (dispatch, getState) => {
		let breakouts;
		try {
			breakouts = await fetcher.post(`/api/session/${id}/importBreakouts`)
		}
		catch(error) {
			console.log(error)
			return dispatch(setError('Unable to import breakouts', error))
		}
	}
