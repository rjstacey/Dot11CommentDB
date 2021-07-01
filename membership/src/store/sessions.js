import {createSlice, createEntityAdapter} from '@reduxjs/toolkit'

import fetcher from 'dot11-components/lib/fetcher'
import sortsSlice, {initSorts, SortDirection, SortType} from 'dot11-components/store/sort'
import filtersSlice, {initFilters, FilterType} from 'dot11-components/store/filters'
import selectedSlice, {setSelected} from 'dot11-components/store/selected'
import uiSlice from 'dot11-components/store/ui'
import {setError} from 'dot11-components/store/error'
import {displayDate} from 'dot11-components/lib/utils'

const SessionType = {
	Plenary: 'p',
	Interim: 'i',
	Other: 'o',
	General: 'g',
}

export const SessionTypeOptions = [
	{value: SessionType.Plenary, label: 'Plenary'},
	{value: SessionType.Interim, label: 'Interim'},
	{value: SessionType.Other, label: 'Other'},
	{value: SessionType.General, label: 'General'}
]

export const fields = {
	id: {label: 'ID', sortType: SortType.NUMERIC},
	MeetingNumber: {label: 'Meeting number'},
	Start: {label: 'Start', dataRenderer: displayDate, sortType: SortType.DATE},
	End: {label: 'End', dataRenderer: displayDate, sortType: SortType.DATE}, 
	Name: {label: 'Session name'},
	Type: {label: 'Session type', options: SessionTypeOptions},
	TimeZone: {label: 'TimeZone'}
};

/*
 * Generate a filter for each field (table column)
 */
const defaultFiltersEntries = Object.keys(fields).reduce((entries, dataKey) => {
	let options;
	if (dataKey === 'Type')
		options = SessionTypeOptions;
	return {...entries, [dataKey]: {options}}
}, {});

/*
 * Generate object that describes the initial sort state
 */
const defaultSortEntries = Object.keys(fields).reduce((entries, dataKey) => {
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

/*
 * Remove entries that no longer exist from a list. If there
 * are no changes, return the original list.
 */
function filterIdList(idList, allIds) {
	const newList = idList.filter(id => allIds.includes(id));
	return newList.length === idList.length? idList: newList;
}

const dataAdapter = createEntityAdapter({
	selectId: (meeting) => meeting.id
})

function correctEntry(session) {
	let s = session;
	if (typeof s.Start === 'string')
		s = {...s, Start: new Date(s.Start)};
	if (typeof s.End === 'string')
		s = {...s, End: new Date(s.End)};
	return s;
}

const dataSet = 'sessions'

const slice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		valid: false,
		loading: false,
		loadingTimeZones: false,
		timeZones: [],
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
			dataAdapter.setAll(state, action.payload.map(correctEntry));
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		getFailure(state, action) {
			state.loading = false;
		},
		updateOne(state, action) {
			let {id, changes} = action.payload;
			dataAdapter.updateOne(state, {id, changes: correctEntry(changes)});
		},
		addOne(state, action) {
			dataAdapter.addOne(state, correctEntry(action.payload));
		},
		deleteMany(state, action) {
			dataAdapter.removeMany(state, action.payload);
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
		},
		getTimeZonesPending(state, action) {
			state.loadingTimeZones = true;
		},
		getTimeZonesSuccess(state, action) {
			state.loadingTimeZones = false;
			state.timeZones = action.payload;
		},
		getimeZonesFailure(state, action) {
			state.loadingTimeZones = false;
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

export const loadSessions = () =>
	async (dispatch, getState) => {
		if (getState()[dataSet].loading)
			return;
		await dispatch(getPending());
		let sessions;
		try {
			sessions = await fetcher.get('/api/sessions');
			if (!Array.isArray(sessions))
				throw new TypeError('Unexpected response to GET: /api/sessions');
		}
		catch(error) {
			console.log(error)
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get sessions', error))
			]);
			return;
		}
		await dispatch(getSuccess(sessions));
	}

const {updateOne} = slice.actions;

export const updateSessionSuccess = (id, session) => updateOne({id, changes: session});

export const updateSession = (id, session) =>
	async (dispatch) => {
		await dispatch(updateOne({id, changes: session}));
		const url = `/api/session/${id}`;
		let updatedSession;
		try {
			updatedSession = await fetcher.patch(url, session);
			if (typeof updatedSession !== 'object')
				throw new TypeError('Unexpected response to PATCH: ' + url);
		}
		catch(error) {
			await dispatch(setError(`Unable to update session`, error));
			return;
		}
		await dispatch(updateOne({id, changes: updatedSession}));
	}

const {addOne} = slice.actions;

export const addSession = (session) =>
	async (dispatch) => {
		let newSession;
		try {
			newSession = await fetcher.post('/api/session', session);
			if (typeof newSession !== 'object')
				throw new TypeError('Unexpected response to POST: /api/session');
		}
		catch(error) {
			await dispatch(setError('Unable to add session', error));
			return;
		}
		dispatch(addOne(newSession));
	}

const {deleteMany} = slice.actions;

export const deleteSessions = (ids) =>
	async (dispatch, getState) => {
		await dispatch(deleteMany(ids));
		try {
			await fetcher.delete('/api/sessions', ids);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete meetings ${ids}`, error));
		}
	}

const {getTimeZonesPending, getTimeZonesSuccess, getTimeZonesFailure} = slice.actions;

export const loadTimeZones = () =>
	async (dispatch, getState) => {
		await dispatch(getTimeZonesPending());
		let timeZones;
		try {
			timeZones = await fetcher.get('/api/timeZones');
			if (!Array.isArray(timeZones))
				throw new TypeError('Unexpected response to GET: /api/timeZones');
		}
		catch(error) {
			console.log(error)
			await Promise.all([
				dispatch(getTimeZonesFailure()),
				dispatch(setError('Unable to get time zones list', error))
			])
			return;
		}
		await dispatch(getTimeZonesSuccess(timeZones));
	}
