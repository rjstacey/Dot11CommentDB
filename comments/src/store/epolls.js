import {createSlice, createSelector, createEntityAdapter} from '@reduxjs/toolkit'

import fetcher from 'dot11-common/store/fetcher'
import sortsSlice, {sortInit, SortDirection, SortType} from 'dot11-common/store/sort'
import filtersSlice, {filtersInit, FilterType} from 'dot11-common/store/filters'
import selectedSlice, {setSelected} from 'dot11-common/store/selected'
import expandedSlice, {setExpanded} from 'dot11-common/store/expanded'
import uiSlice from 'dot11-common/store/ui'
import {setError} from 'dot11-common/store/error'

const epollFields = ['EpollNum', 'BallotID', 'Document', 'Topic', 'Start', 'End', 'Votes']

/*
 * Generate a filter for each field (table column)
 */
const defaultFiltersEntries = epollFields.reduce((entries, dataKey) => {
	return {...entries, [dataKey]: {}};
}, {});


/*
 * Generate object that describes the initial sort state
 */
const defaultSortEntries = epollFields.reduce((entries, dataKey) => {
	let type
	switch (dataKey) {
		case 'EpollNum':
		case 'Votes':
			type = SortType.NUMERIC
			break

		case 'Start':
		case 'End':
			type = SortType.DATE
			break
		case 'BallotID':
		case 'Document':
		case 'Topic':
		default:
			type = SortType.STRING
			break	
	}
	const direction = SortDirection.NONE;
	return {...entries, [dataKey]: {type, direction}};
}, {});

const dataAdapter = createEntityAdapter({
	selectId: d => d.EpollNum
});

const dataSet = 'epolls';

const epollsSlice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		valid: false,
		loading: false,
		[sortsSlice.name]: sortsSlice.reducer(undefined, sortInit(defaultSortEntries)),
		[filtersSlice.name]: filtersSlice.reducer(undefined, filtersInit(defaultFiltersEntries)),
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

export default epollsSlice.reducer;

const {getPending, getSuccess, getFailure} = epollsSlice.actions;

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