import {createSlice, createSelector, createEntityAdapter} from '@reduxjs/toolkit'

import {setError} from './error'
import fetcher from './fetcher'

import sortReducer, {sortInit, SortDirection, SortType} from './sort'
import filtersReducer, {filtersInit, FilterType} from './filters'
import selectedReducer, {setSelected} from './selected'
import expandedReducer, {setExpanded} from './expanded'
import uiReducer from './ui'

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
		sort: sortReducer(undefined, sortInit(defaultSortEntries)),
		filters: filtersReducer(undefined, filtersInit(defaultFiltersEntries)),
		selected: selectedReducer(undefined, {}),
		expanded: expandedReducer(undefined, {}),
		ui: uiReducer(undefined, {})
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
				state.sort = sortReducer(state.sort, sliceAction);
				state.filters = filtersReducer(state.filters, sliceAction);
				state.selected = selectedReducer(state.selected, sliceAction);
				state.ui = uiReducer(state.ui, sliceAction);
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
