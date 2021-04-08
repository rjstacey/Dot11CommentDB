import {createSlice, createEntityAdapter, createSelector} from '@reduxjs/toolkit'

import fetcher from 'dot11-common/store/fetcher'
import sortsSlice, {sortInit, SortDirection, SortType} from 'dot11-common/store/sort'
import filtersSlice, {filtersInit, FilterType} from 'dot11-common/store/filters'
import selectedSlice, {setSelected} from 'dot11-common/store/selected'
import uiSlice from 'dot11-common/store/ui'
import {setError} from 'dot11-common/store/error'
import {getSortedFilteredIds} from 'dot11-common/store/dataSelectors'

import {upsertMembers} from './members'

const fields = ['id', 'SAPIN', 'Name', 'Email', 'Affiliation', 'Status', 'SessionCreditPct']

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
			type = SortType.NUMERIC
			break
		default:
			type = SortType.STRING
	}
	const direction = SortDirection.NONE;
	return {...entries, [dataKey]: {type, direction}}
}, {});


const dataAdapter = createEntityAdapter({
	selectId: (member) => member.SAPIN
})

const dataSet = 'attendees'

const slice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		valid: false,
		loading: false,
		meeting: {},
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
  			const {meeting, breakout, attendees} = action.payload;
			state.loading = false;
			state.valid = true;
			state.meeting = meeting;
			state.breakout = breakout;
			dataAdapter.setAll(state, attendees);
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

function updateIdList(attendees, selected) {
	const changed = selected.reduce(
		(result, id) => result || !attendees.find(a => a.SAPIN === id),
		false
	);

	if (!changed)
		return selected

	return selected.filter(id => !attendees.find(a => a.SAPIN === id))
}

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
		}
		catch(error) {
			console.log(error)
			return Promise.all([
				dispatch(getFailure()),
				dispatch(setError(`Unable to get attendees for ${breakout_id}`, error))
			])
		}
		const {meeting, breakout, attendees} = response;
		const p = []
		const {selected} = getState()[dataSet]
		const newSelected = updateIdList(attendees, selected)
		if (newSelected !== selected)
			p.push(dispatch(setSelected(dataSet, newSelected)))
		p.push(dispatch(getSuccess({meeting, breakout, attendees})))
		return Promise.all(p)
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
