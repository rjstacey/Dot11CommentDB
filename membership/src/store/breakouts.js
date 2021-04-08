import {createSlice, createEntityAdapter, createSelector} from '@reduxjs/toolkit'

import fetcher from 'dot11-common/store/fetcher'
import sortsSlice, {sortInit, SortDirection, SortType} from 'dot11-common/store/sort'
import filtersSlice, {filtersInit, FilterType} from 'dot11-common/store/filters'
import selectedSlice, {setSelected} from 'dot11-common/store/selected'
import uiSlice from 'dot11-common/store/ui'
import {setError} from 'dot11-common/store/error'

const breakoutFields = ['id', 'DayDate', 'Time', 'Location', 'Group', 'Name', 'Credit', 'Attendees']

/*
 * Generate a filter for each field (table column)
 */
const defaultFiltersEntries = breakoutFields.reduce((entries, dataKey) => {
	let options;
	return {...entries, [dataKey]: {options}}
}, {});

/*
 * Generate object that describes the initial sort state
 */
const defaultSortEntries = breakoutFields.reduce((entries, dataKey) => {
	let type
	switch (dataKey) {
		case 'id':
		case 'MeetingNumber':
		case 'BreakoutID':
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

const dataSet = 'breakouts'

const breakoutsSlice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		valid: false,
		loading: false,
		meeting: {},
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
  			const {meeting, breakouts} = action.payload;
			state.loading = false;
			state.valid = true;
			state.meeting = meeting;
			dataAdapter.setAll(state, breakouts);
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
export default breakoutsSlice.reducer;

function updateIdList(breakouts, selected) {
	const changed = selected.reduce(
		(result, id) => result || !breakouts.find(m => m.id === id),
		false
	);

	if (!changed)
		return selected

	return selected.filter(id => !breakouts.find(m => m.id === id))
}

const {getPending, getSuccess, getFailure} = breakoutsSlice.actions;

export const loadBreakouts = (session_id) =>
	async (dispatch, getState) => {
		dispatch(getPending())
		let response;
		try {
			response = await fetcher.get(`/api/session/${session_id}/breakouts`)
		}
		catch(error) {
			console.log(error)
			return Promise.all([
				dispatch(getFailure()),
				dispatch(setError(`Unable to get breakouts for ${session_id}`, error))
			])
		}
		const {meeting, breakouts} = response;
		const p = []
		const {selected} = getState()[dataSet]
		const newSelected = updateIdList(breakouts, selected)
		if (newSelected !== selected)
			p.push(dispatch(setSelected(dataSet, newSelected)))
		p.push(dispatch(getSuccess({meeting, breakouts})))
		return Promise.all(p)
	}
