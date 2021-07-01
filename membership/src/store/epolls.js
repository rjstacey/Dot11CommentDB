import {createSlice, createSelector, createEntityAdapter} from '@reduxjs/toolkit'

import fetcher from 'dot11-components/lib/fetcher'
import sortsSlice, {initSorts, SortDirection, SortType} from 'dot11-components/store/sort'
import filtersSlice, {initFilters, FilterType} from 'dot11-components/store/filters'
import selectedSlice, {setSelected} from 'dot11-components/store/selected'
import expandedSlice, {setExpanded} from 'dot11-components/store/expanded'
import uiSlice from 'dot11-components/store/ui'
import {setError} from 'dot11-components/store/error'
import {displayDate} from 'dot11-components/lib/utils'

export const fields = {
	EpollNum: {label: 'ePoll', sortType: SortType.NUMERIC},
	BallotID: {label: 'BallotID'},
	Start: {label: 'Start', dataRenderer: displayDate, sortType: SortType.DATE},
	End: {label: 'End', dataRenderer: displayDate, sortType: SortType.DATE},
	Document: {label: 'Document'},
	Topic: {label: 'Topic'},
	Votes: {label: 'Result', sortType: SortType.NUMERIC}
};

const dataAdapter = createEntityAdapter({
	selectId: d => d.EpollNum
});

const dataSet = 'epolls';

const slice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		valid: false,
		loading: false,
		[sortsSlice.name]: sortsSlice.reducer(undefined, initSorts(fields)),
		[filtersSlice.name]: filtersSlice.reducer(undefined, initFilters(fields)),
		[selectedSlice.name]: selectedSlice.reducer(undefined, {}),
		[expandedSlice.name]: expandedSlice.reducer(undefined, {}),
		[uiSlice.name]: uiSlice.reducer(undefined, {})
	}),
	reducers: {
		getPending(state, action) {
			state.loading = true;
		},
  		getSuccess(state, action) {
  			const {epolls} = action.payload;
			state.loading = false;
			state.valid = true;
			dataAdapter.setAll(state, epolls);
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
				state[expandedSlice.name] = expandedSlice.reducer(state[expandedSlice.name], sliceAction);
				state[uiSlice.name] = uiSlice.reducer(state[uiSlice.name], sliceAction);
			}
		)
	}
});

export default slice.reducer;

const {getPending, getSuccess, getFailure} = slice.actions;

export function loadEpolls(n = 20) {
	return async (dispatch, getState) => {
		dispatch(getPending())
		try {
			const epolls = await fetcher.get('/api/epolls', {n})
			return dispatch(getSuccess({n, epolls}))
		}
		catch(error) {
			return Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get a list of epolls', error))
			])
		}
	}
}

/*
 * Selectors
 */
const getBallots = (state) => state.ballots.ids.map(id => state.ballots.entities[id]);
const getEpollsData = (state) => state.epolls.ids.map(id => state.epolls.entities[id]);

/*
 * Generate epolls list with indicator on each entry of presence in ballots list
 */
export const getSyncedEpolls = createSelector(
	getBallots,
	getEpollsData,
	(ballots, epolls) => (
		epolls.map(d => {
			if (ballots.find(b => b.EpollNum === d.EpollNum))
				return d.InDatabase? d: {...d, InDatabase: true}
			else
				return d.InDatabase? {...d, InDatabase: false}: d
		})
	)
);

/*
 * Selectors
 */
const getBallotsEntities = (state) => state['ballots'].entities;
const getEpollsEntities = (state) => state[dataSet].entities;

/*
 * getSyncedEpollEntities(state)
 *
 * Generate epoll entities objectwith indicator on each entry of presence in ballots list
 */
export const getSyncedEpollEntities = createSelector(
	getBallotsEntities,
	getEpollsEntities,
	(ballotEntities, epollEntities) => {
		const syncedEpollEntities = {};
		for (const id of Object.keys(epollEntities))
			syncedEpollEntities[id] = {...epollEntities[id], InDatabase: false}
		for (const b of Object.values(ballotEntities)) {
			if (syncedEpollEntities[b.EpollNum])
				syncedEpollEntities[b.EpollNum].InDatabase = true
		}
		return syncedEpollEntities;
	}
);