
import {updateBallotLocal} from './ballots'

var axios = require('axios');

function getResultsLocal(ballotId) {
	return {
		type: 'GET_RESULTS',
		ballotId: ballotId
	}
}
function getResultsSuccess(results, summary) {
	return {
		type: 'GET_RESULTS_SUCCESS',
		results,
		summary
	}
}
function getResultsFailure(msg) {
	return {
		type: 'GET_RESULTS_FAILURE',
		errMsg: msg
	}
}

export function getResults(ballotId) {
	return dispatch => {
		dispatch(getResultsLocal(ballotId))
		return axios.get('/results', {params: {BallotID: ballotId}})
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(getResultsFailure(response.data.message))
				}
				else {
					var {results, summary} = response.data.data;
					dispatch(getResultsSuccess(results, summary))
				}
			})
			.catch((error) => {
				dispatch(getResultsFailure('Unable to get results list'))
			})
	}
}

export function clearGetResultsError() {
	return {
		type: 'CLEAR_GET_RESULTS_ERROR',
	}
}

function deleteResultsLocal(ballotId) {
	return {
		type: 'DELETE_RESULTS',
		ballotId: ballotId
	}
}
function deleteResultsSuccess(ballotId) {
	return {
		type: 'DELETE_RESULTS_SUCCESS',
		ballotId: ballotId
	}
}
function deleteResultsFailure(ballotId, msg) {
	return {
		type: 'DELETE_RESULTS_FAILURE',
		ballotId,
		errMsg: msg
	}
}
export function deleteResults(ballotId) {
	return dispatch => {
		dispatch(deleteResultsLocal(ballotId));
		return axios.delete('/results', {data: {BallotID: ballotId}})
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(deleteResultsFailure(response.data.message))
				}
				else {
					dispatch(updateBallotLocal({BallotID: ballotId, Results: ''}))
					dispatch(deleteResultsSuccess(ballotId))
				}
			})
			.catch((error) => {
				dispatch(deleteResultsFailure(ballotId, `Unable to delete results with ballotId=${ballotId}`))
			})
	}
}

export function clearDeleteResultsError() {
	return {
		type: 'CLEAR_DELETE_RESULTS_ERROR',
	}
}

function importResultsLocal(ballotId) {
	return {
		type: 'IMPORT_RESULTS',
		ballotId
	}
}
function importResultsSuccess(ballotId, summary) {
	return {
		type: 'IMPORT_RESULTS_SUCCESS',
		ballotId,
		summary
	}
}
function importResultsFailure(ballotId, msg) {
	return {
		type: 'IMPORT_RESULTS_FAILURE',
		ballotId,
		errMsg: msg
	}
}
export function importResults(ballotId, epollNum) {
	return dispatch => {
		dispatch(importResultsLocal(ballotId));
		var params = {
			BallotID: ballotId,
			EpollNum: epollNum
		}
		return axios.put('/results/import', params)
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(importResultsFailure(ballotId, response.data.message))
				}
				else {
					const summary = response.data.data.summary;
					dispatch(updateBallotLocal({BallotID: ballotId, Summary: summary}))
					dispatch(importResultsSuccess(ballotId, summary))
				}
			})
			.catch((error) => {
				dispatch(importResultsFailure(ballotId, `Unable to import results for ballotId=${ballotId}`))
			})
	}
}

export function clearImportResultsError() {
	return {
		type: 'CLEAR_IMPORT_RESULTS_ERROR'
	}
}

function summarizeResultsLocal(data) {
	return {
		type: 'SUMMARIZE_RESULTS',
	}
}
function summarizeResultsSuccess(data) {
	return {
		type: 'SUMMARIZE_RESULTS_SUCCESS',
		symmary: data
	}
}
function summarizeResultsFailure(msg) {
	return {
		type: 'SUMMARIZE_RESULTS_FAILURE',
		errMsg: msg
	}
}

export function summarizeResults(data) {
	return dispatch => {
		dispatch(summarizeResultsLocal());
		return axios.get('/results/summary')
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(summarizeResultsFailure(response.data.message))
				}
				else {
					dispatch(summarizeResultsSuccess(data))
				}
			})
			.catch((error) => {
				dispatch(summarizeResultsFailure(`Unable to get results summary for ${data.BallotID}`))
			})
	}
}

export function clearSummarizeResultsError() {
	return {
		type: 'CLEAR_SUMMARIZE_RESULTS_ERROR',
	}
}

