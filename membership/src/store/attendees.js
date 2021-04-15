import {createSlice, createEntityAdapter, createSelector} from '@reduxjs/toolkit'

import fetcher from 'dot11-common/store/fetcher'
import sortsSlice, {sortInit, SortDirection, SortType} from 'dot11-common/store/sort'
import filtersSlice, {filtersInit, FilterType} from 'dot11-common/store/filters'
import selectedSlice, {setSelected} from 'dot11-common/store/selected'
import uiSlice from 'dot11-common/store/ui'
import {setError} from 'dot11-common/store/error'
import {getSortedFilteredIds} from 'dot11-common/store/dataSelectors'

import {upsertMembers} from './members'
import {updateSessionSuccess} from './sessions'

const fields = ['id', 'SAPIN', 'Name', 'Email', 'Affiliation', 'Status', 'SessionCredit']

/*
 * Generate a filter for each field (table column)
 */
const defaultFiltersEntries = fields.reduce((entries, dataKey) => {
	let options;
	return {...entries, [dataKey]: {options}}
}, {});

/*
 * Generate object that describes the initial sort state
 */
const defaultSortEntries = fields.reduce((entries, dataKey) => {
	let type
	switch (dataKey) {
		case 'SAPIN':
		case 'SessionCreditPct':
		case 'SessionCredit':
			type = SortType.NUMERIC
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
	selectId: (member) => member.SAPIN
})

const dataSet = 'attendees'

const slice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		valid: false,
		loading: false,
		session: {},
		breakout: {},
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
  			const {session, breakout, attendees} = action.payload;
			state.loading = false;
			state.valid = true;
			state.session = session;
			state.breakout = breakout;
			dataAdapter.setAll(state, attendees);
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

export const loadAttendees = (session_id, breakout_id) =>
	async (dispatch, getState) => {
		dispatch(getPending())
		const url = breakout_id?
			`/api/session/${session_id}/breakout/${breakout_id}/attendees`:
			`/api/session/${session_id}/attendees`;
		let response;
		try {
			response = await fetcher.get(url);
			if (typeof response !== 'object' || 
				!response.hasOwnProperty('session') ||
				!response.hasOwnProperty('attendees') ||
				(breakout_id && !response.hasOwnProperty('breakout')))
				throw new TypeError('Unexpected response to GET: ' + url);
		}
		catch(error) {
			console.log(error)
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError(`Unable to get attendees for ${breakout_id}`, error))
			]);
			return;
		}
		await dispatch(getSuccess(response))
	}

export const importSelectedAttendees = () =>
	async (dispatch, getState) => {
		const state = getState();
		const selected = state[dataSet].selected;
		const attendees = state[dataSet].entities;
		const shown = getSortedFilteredIds(state, dataSet);
		const newMembers = {};
		for (const id of selected) {
			if (shown.includes(id))
				newMembers[id] = attendees[id];
		}
		return dispatch(upsertMembers(newMembers));
	}

export const importAttendances = (session_id) =>
	async (dispatch, state) => {
		dispatch(getPending())
		const url = `/api/session/${session_id}/attendance_summary/import`;
		let response;
		try {
			response = await fetcher.post(url);
			if (typeof response !== 'object' || !response.hasOwnProperty('session') || !response.hasOwnProperty('attendees'))
				throw new TypeError('Unexpected response to GET: ' + url);
		}
		catch(error) {
			console.log(error)
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get attendance summary', error))
			]);
			return;
		}
		const {session} = response;
		await Promise.all([
			dispatch(getSuccess(response)),
			dispatch(updateSessionSuccess(session.id, session))]);
	}
	