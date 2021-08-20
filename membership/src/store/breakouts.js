import {createSlice, createEntityAdapter, createSelector} from '@reduxjs/toolkit'

import fetcher from 'dot11-components/lib/fetcher'
import sortsSlice, {initSorts, SortDirection, SortType} from 'dot11-components/store/sort'
import filtersSlice, {initFilters, FilterType} from 'dot11-components/store/filters'
import selectedSlice from 'dot11-components/store/selected'
import uiSlice from 'dot11-components/store/ui'
import {setError} from 'dot11-components/store/error'
import {updateSessionSuccess} from './sessions'

const fields = {
	id: {label: 'ID', isId: true, sortType: SortType.NUMERIC},
	MeetingNumber: {label: 'MeetingNumber', sortType: SortType.NUMERIC},
	BreakoutID: {label: 'Breakout ID', sortType: SortType.NUMERIC},
	DayDate: {label: 'DayDate'},
	Start: {label: 'Start', sortType: SortType.DATE},
	End: {label: 'End', sortType: SortType.DATE},
	Time: {label: 'Time'},
	Location: {label: 'Location'},
	Group: {label: 'Group'},
	Name: {label: 'Name'},
	Credit: {label: 'Credit'},
	Attendees: {label: 'Attendees'}
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
	selectId: (meeting) => meeting.id
})

const dataSet = 'breakouts'

const slice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		valid: false,
		loading: false,
		session: {},
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
  			const {session, breakouts} = action.payload;
			state.loading = false;
			state.valid = true;
			state.session = session;
			dataAdapter.setAll(state, breakouts);
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

export const loadBreakouts = (session_id) =>
	async (dispatch, getState) => {
		if (getState()[dataSet].loading)
			return;
		await dispatch(getPending())
		const url = `/api/session/${session_id}/breakouts`;
		let response;
		try {
			response = await fetcher.get(url);
			if (typeof response !== 'object' || !response.hasOwnProperty('breakouts') || !response.hasOwnProperty('session'))
				throw new TypeError(`Unexpected response to GET: ${url}`);
		}
		catch(error) {
			console.log(error)
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError(`Unable to get breakouts for ${session_id}`, error))
			]);
			return;
		}
		await dispatch(getSuccess(response));
	}

export const importBreakouts = (session_id) =>
	async (dispatch, getState) => {
		console.log('import breakouts')
		const url = `/api/session/${session_id}/breakouts/import`;
		let response;
		try {
			response = await fetcher.post(url);
			if (typeof response !== 'object' || !response.hasOwnProperty('breakouts') || !response.hasOwnProperty('session'))
				throw new TypeError(`Unexpected response to POST: ${url}`);
		}
		catch(error) {
			console.log(error)
			await dispatch(setError('Unable to import breakouts', error))
			return;
		}
		const {session} = response;
		await Promise.all([
			dispatch(getSuccess(response)),
			dispatch(updateSessionSuccess(session.id, session))]);
	}
