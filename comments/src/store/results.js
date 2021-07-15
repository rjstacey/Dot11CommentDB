import {createSlice, createEntityAdapter} from '@reduxjs/toolkit'

import fetcher from 'dot11-components/lib/fetcher'
import sortsSlice, {initSorts, SortDirection, SortType} from 'dot11-components/store/sort'
import filtersSlice, {initFilters, FilterType} from 'dot11-components/store/filters'
import selectedSlice, {setSelected} from 'dot11-components/store/selected'
import uiSlice from 'dot11-components/store/ui'
import {setError} from 'dot11-components/store/error'

import {updateBallotSuccess} from './ballots'

const fields = {
	SAPIN: {label: 'SA PIN', sortType: SortType.NUMERIC},
	Name: {label: 'Name'},
	Affiliation: {label: 'Affiliation'},
	Email: {label: 'Email'},
	Vote: {label: 'Vote'},
	CommentCount: {label: 'Comments', sortType: SortType.NUMERIC},
	Notes: {label: 'Notes'}
};

const dataAdapter = createEntityAdapter({
	selectId: r => r.id
});

const dataSet = 'results';

const slice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		ballotId: '',
		ballot: {},
		loading: false,
		valid: false,
		votingPoolSize: 0,
		resultsSummary: {},
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
  			const {ballotId, ballot, results, summary, votingPoolSize} = action.payload;
			state.loading = false;
			state.valid = true;
			state.ballotId = ballotId;
			state.ballot = ballot;
			dataAdapter.setAll(state, results);
			state.resultsSummary = summary;
			state.votingPoolSize = votingPoolSize;
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

export const loadResults = (ballotId) =>
	async (dispatch) => {
		dispatch(getPending({ballotId}));
		const url = `/api/results/${ballotId}`;
		let response;
		try {
			response = await fetcher.get(url);
			if (!response.hasOwnProperty('ballot') ||
				!response.hasOwnProperty('VotingPoolSize') ||
				!response.hasOwnProperty('results') ||
				!response.hasOwnProperty('summary'))
				throw new TypeError('Unexpected response to GET: ' + url);
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get results list', error))
			]);
			return;
		}
		const payload = {
			ballotId: response.BallotID,
			ballot: response.ballot,
			votingPoolSize: response.VotingPoolSize,
			results: response.results,
			summary: response.summary
		}
		await dispatch(getSuccess(payload));
	}

