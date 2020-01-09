
import {updateBallotSuccess} from './ballots'

var axios = require('axios');

export function setResultsProject(project) {
	return {
		type: 'SET_RESULTS_PROJECT',
		project
	}
}

export function setResultsFilters(filters) {
	return {
		type: 'SET_RESULTS_FILTERS',
		filters
	}
}

export function setResultsSort(sortBy, sortDirection) {
	return {
		type: 'SET_RESULTS_SORT',
		sortBy,
		sortDirection
	}
}

function getResultsLocal(ballotId) {
	return {
		type: 'GET_RESULTS',
		ballotId: ballotId
	}
}
function getResultsSuccess(data) {
	return {
		type: 'GET_RESULTS_SUCCESS',
		ballotId: data.BallotID,
		votingPoolId: data.VotingPoolID,
		votingPoolSize: data.VotingPoolSize,
		ballot: data.ballot,
		results: data.results,
		summary: data.summary
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
					dispatch(getResultsSuccess(response.data.data))
				}
			})
			.catch((error) => {
				dispatch(getResultsFailure('Unable to get results list'))
			})
	}
}

function deleteResultsLocal(ballotId) {
	return {
		type: 'DELETE_RESULTS',
		ballotId
	}
}
function deleteResultsSuccess(ballotId) {
	return {
		type: 'DELETE_RESULTS_SUCCESS',
		ballotId
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
					dispatch(updateBallotSuccess(ballotId, {Results: {}}))
					dispatch(deleteResultsSuccess(ballotId))
				}
			})
			.catch((error) => {
				dispatch(deleteResultsFailure(ballotId, `Unable to delete results with ballotId=${ballotId}`))
			})
	}
}

function importResultsLocal(ballotId) {
	return {
		type: 'IMPORT_RESULTS',
		ballotId
	}
}
function importResultsSuccess(data) {
	return {
		type: 'IMPORT_RESULTS_SUCCESS',
		...data
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
		return axios.post('/results/import', params)
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(importResultsFailure(ballotId, response.data.message))
				}
				else {
					console.log(response.data)
					const summary = response.data.data.summary;
					dispatch(updateBallotSuccess(ballotId, {Results: summary}))
					dispatch(importResultsSuccess(response.data.data))
				}
			})
			.catch((error) => {
				dispatch(importResultsFailure(ballotId, `Unable to import results for ballotId=${ballotId}`))
			})
	}
}

export function uploadResults(ballotId, file) {
	return dispatch => {
		dispatch(importResultsLocal(ballotId));
		var formData = new FormData();
		formData.append("BallotID", ballotId);
		formData.append("ResultsFile", file);
		return axios.post('/results/upload', formData, {headers: {'Content-Type': 'multipart/form-data'}})
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(importResultsFailure(ballotId, response.data.message))
				}
				else {
					const summary = response.data.data;
					dispatch(updateBallotSuccess(ballotId, {Results: summary}))
					dispatch(importResultsSuccess(ballotId, summary))
				}
			})
			.catch((error) => {
				dispatch(importResultsFailure(ballotId, `Unable to upload results for ballot ${ballotId}`))
			})
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

export function clearResultsError() {
	return {
		type: 'CLEAR_RESULTS_ERROR',
	}
}

