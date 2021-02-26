import {createSlice} from '@reduxjs/toolkit'

import {setError} from './error'
import fetcher from './fetcher'

import sortReducer, {sortInit, SortDirection, SortType} from './sort'
import filtersReducer, {filtersInit, FilterType} from './filters'
import selectedReducer, {setSelected} from './selected'
import uiReducer from './ui'

const resultFields = ['SAPIN', 'Name', 'Affiliation', 'Email', 'Vote', 'CommentCount', 'Notes'];

/*
 * Generate a filter for each field (table column)
 */
const defaultFiltersEntries = resultFields.reduce((entries, dataKey) => {
	return {...entries, [dataKey]: {}};
}, {});


/*
 * Generate object that describes the initial sort state
 */
const defaultSortEntries = resultFields.reduce((entries, dataKey) => {
	let type;
	switch (dataKey) {
		case 'SAPIN':
		case 'CommentCount':
			type = SortType.NUMERIC
			break
		case 'Name':
		case 'Affiliation':
		case 'Email':
		case 'Vote':
		case 'Notes':
			type = SortType.STRING
			break
		default:
			return entries;
	}
	const direction = SortDirection.NONE;
	return {...entries, [dataKey]: {type, direction}};
}, {});

const dataSet = 'results';

const resultsSlice = createSlice({
	name: dataSet,
	initialState: {
		ballotId: '',
		votingPoolID: '',
		votingPoolSize: 0,
		ballot: {},
		loading: false,
		valid: false,
		results: [],
		resultsSummary: {},
		sort: sortReducer(undefined, sortInit(defaultSortEntries)),
		filters: filtersReducer(undefined, filtersInit(defaultFiltersEntries)),
		selected: selectedReducer(undefined, {}),
		ui: uiReducer(undefined, {})
	},
	reducers: {
		getPending(state, action) {
			state.loading = true;
		},
  		getSuccess(state, action) {
  			const {ballotId, ballot, results, summary, votingPoolId, votingPoolSize} = action.payload;
			state.loading = false;
			state.valid = true;
			state.ballotId = ballotId;
			state.ballot = ballot;
			state.results = results;
			state.resultsSummary =summary;
			state.votingPoolId = votingPoolId;
			state.votingPoolSize = votingPoolSize;
		},
		getFailure(state, action) {
			state.loading = false;
		},
		deleteAll(state, action) {
			const {ballotId} = action.payload;
			if (ballotId === state.ballotId) {
				state.valid = false;
				state.results = [];
				state.resultsSummary = {};
			}
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

/*
 * Export reducer as default
 */
export default resultsSlice.reducer;

const {getPending, getSuccess, getFailure} = resultsSlice.actions;

export function getResults(ballotId) {
	return async (dispatch) => {
		dispatch(getPending({ballotId}))
		let response;
		try {
			response = await fetcher.get(`/api/results/${ballotId}`)
		}
		catch(error) {
			return Promise.all([
				dispatch(getFailure()),
				dispatch(setError('Unable to get results list', error))
			])
		}
		const payload = {
			ballotId: response.BallotID,
			votingPoolId: response.VotingPoolID,
			votingPoolSize: response.VotingPoolSize,
			ballot: response.ballot,
			results: response.results,
			summary: response.summary
		}
		return dispatch(getSuccess(payload))
	}
}

const {deleteAll} = resultsSlice.actions;

export function deleteResults(ballotId, ballot) {
	return async (dispatch) => {
		try {
			await fetcher.delete(`/api/results/${ballotId}`)
		}
		catch(error) {
			return dispatch(setError(`Unable to delete results with ballotId=${ballotId}`, error))
		}
		return Promise.all([
			dispatch(updateBallotSuccess(ballotId, {id: ballot.id, Results: {}})),
			dispatch(deleteAll({ballotId}))
		])
	}
}

export function importResults(ballotId, epollNum) {
	return async (dispatch) => {
		dispatch(getPending({ballotId}))
		let response;
		try {
			response = await fetcher.post(`/api/results/importFromEpoll/${ballotId}/${epollNum}`);
			
		}
		catch(error) {
			return Promise.all([
				dispatch(getFailure({ballotId})),
				dispatch(setError(`Unable to import results for ballotId=${ballotId}`, error))
			])
		}
		if (!response.ballot || !response.ballot.Result)
			console.error('Unexpected response: missing or bad ballot');
		if (!response.results || !Array.isArray(response.results))
			console.error('Unexpected response: missing or bad results');
		//console.log(response)
		const payload = {
			ballotId: response.BallotID,
			votingPoolId: response.VotingPoolID,
			votingPoolSize: response.VotingPoolSize,
			ballot: response.ballot,
			results: response.results,
			summary: response.summary
		}
		return Promise.all([
			dispatch(updateBallotSuccess(ballotId, response.ballot)),
			dispatch(getSuccess(payload))
		])
	}
}

export function uploadEpollResults(ballotId, file) {
	return async (dispatch) => {
		dispatch(getPending({ballotId}))
		let response;
		try {
			response = await fetcher.postMultipart(`/api/results/uploadEpollResults/${ballotId}`, {ResultsFile: file})
		}
		catch(error) {
			return Promise.all([
				dispatch(getFailure({ballotId})),
				dispatch(setError(`Unable to upload results for ballot ${ballotId}`, error))
			])
		}
		const payload = {
			ballotId: response.BallotID,
			votingPoolId: response.VotingPoolID,
			votingPoolSize: response.VotingPoolSize,
			ballot: response.ballot,
			results: response.results,
			summary: response.summary
		}
		return Promise.all([
			dispatch(updateBallotSuccess(ballotId, response.ballot)),
			dispatch(importResultsSuccess(payload))
		])
	}
}

export function uploadMyProjectResults(ballotId, file) {
	return async (dispatch) => {
		dispatch(getPending({ballotId}));
		let response;
		try {
			response = await fetcher.postMultipart(`/api/results/uploadMyProjectResults/${ballotId}`, {ResultsFile: file})
		}
		catch(error) {
			return Promise.all([
				dispatch(getFailure({ballotId})),
				dispatch(setError(`Unable to upload results for ballot ${ballotId}`, error))
			])
		}
		const payload = {
			ballotId: response.BallotID,
			votingPoolId: response.VotingPoolID,
			votingPoolSize: response.VotingPoolSize,
			ballot: response.ballot,
			results: response.results,
			summary: response.summary
		}
		return Promise.all([
			dispatch(updateBallotSuccess(ballotId, response.ballot)),
			dispatch(getSuccess(response))
		])
	}
}
