import {createSlice, createEntityAdapter} from '@reduxjs/toolkit'

import fetcher from 'dot11-common/store/fetcher'
import sortsSlice, {sortInit, SortDirection, SortType} from 'dot11-common/store/sort'
import filtersSlice, {filtersInit, FilterType} from 'dot11-common/store/filters'
import selectedSlice, {setSelected} from 'dot11-common/store/selected'
import uiSlice from 'dot11-common/store/ui'
import {setError} from 'dot11-common/store/error'

import {updateBallotSuccess} from './ballots'

const fields = ['SAPIN', 'Name', 'Affiliation', 'Email', 'Vote', 'CommentCount', 'Notes'];

/*
 * Generate a filter for each field (table column)
 */
const defaultFiltersEntries = fields.reduce((entries, dataKey) => {
	return {...entries, [dataKey]: {}};
}, {});


/*
 * Generate object that describes the initial sort state
 */
const defaultSortEntries = fields.reduce((entries, dataKey) => {
	let type;
	switch (dataKey) {
		case 'SAPIN':
		case 'CommentCount':
			type = SortType.NUMERIC;
			break;
		case 'Name':
		case 'Affiliation':
		case 'Email':
		case 'Vote':
		case 'Notes':
		default:
			type = SortType.STRING;
			break;
	}
	const direction = SortDirection.NONE;
	return {...entries, [dataKey]: {type, direction}};
}, {});

const dataAdapter = createEntityAdapter({
	selectId: r => r.id,
	sortComparer: (r1, r2) => r1.SAPIN - r2.SAPIN
})

const dataSet = 'results';

const resultsSlice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		ballotId: '',
		ballot: {},
		loading: false,
		valid: false,
		votingPoolSize: 0,
		resultsSummary: {},
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
		deleteAll(state, action) {
			const {ballotId} = action.payload;
			if (ballotId === state.ballotId) {
				state.valid = false;
				dataAdapter.setAll(state, []);
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
export default resultsSlice.reducer;

const {getPending, getSuccess, getFailure} = resultsSlice.actions;

export function loadResults(ballotId) {
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
			dispatch(updateBallotSuccess(ballot.id, {Results: {}})),
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
			votingPoolSize: response.VotingPoolSize,
			ballot: response.ballot,
			results: response.results,
			summary: response.summary
		}
		return Promise.all([
			dispatch(updateBallotSuccess(response.ballot.id, response.ballot)),
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
			votingPoolSize: response.VotingPoolSize,
			ballot: response.ballot,
			results: response.results,
			summary: response.summary
		}
		return Promise.all([
			dispatch(updateBallotSuccess(response.ballot.id, response.ballot)),
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
			dispatch(updateBallotSuccess(response.ballot.id, response.ballot)),
			dispatch(getSuccess(response))
		])
	}
}
