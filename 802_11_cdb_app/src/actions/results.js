import {updateBallotSuccess} from './ballots'
import {setError} from './error'

var axios = require('axios');

export const SET_RESULTS_FILTERS = 'SET_RESULTS_FILTERS'
export const SET_RESULTS_SORT = 'SET_RESULTS_SORT'
export const GET_RESULTS = 'GET_RESULTS'
export const GET_RESULTS_SUCCESS = 'GET_RESULTS_SUCCESS'
export const GET_RESULTS_FAILURE = 'GET_RESULTS_FAILURE'
export const DELETE_RESULTS = 'DELETE_RESULTS'
export const DELETE_RESULTS_SUCCESS = 'DELETE_RESULTS_SUCCESS'
export const DELETE_RESULTS_FAILURE = 'DELETE_RESULTS_FAILURE'
export const IMPORT_RESULTS = 'IMPORT_RESULTS'
export const IMPORT_RESULTS_SUCCESS = 'IMPORT_RESULTS_SUCCESS'
export const IMPORT_RESULTS_FAILURE = 'IMPORT_RESULTS_FAILURE'

export const setResultsFilters = (filters) => {return {type: SET_RESULTS_FILTERS, filters}}
export const setResultsSort = (sortBy, sortDirection) => {return {type: SET_RESULTS_SORT, sortBy, sortDirection}}

const getResultsLocal = (ballotId) => {return {type: GET_RESULTS, ballotId}}
const getResultsSuccess = (data) => {
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
const getResultsFailure = () => {return {type: GET_RESULTS_FAILURE}}

export function getResults(ballotId) {
	return async (dispatch) => {
		dispatch(getResultsLocal(ballotId))
		try {
			const response = await axios.get('/results', {params: {BallotID: ballotId}})
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(getResultsFailure()),
					dispatch(setError(response.data.message))
				])
			}
			return dispatch(getResultsSuccess(response.data.data))
		}
		catch(error) {
			return Promise.all([
				dispatch(getResultsFailure()),
				dispatch(setError('Unable to get results list', error.toString()))
			])
		}
	}
}

const deleteResultsLocal = (ballotId) => {return {type: DELETE_RESULTS, ballotId}}
const deleteResultsSuccess = (ballotId) => {return {type: DELETE_RESULTS_SUCCESS, ballotId}}
const deleteResultsFailure = (ballotId) => {return {type: DELETE_RESULTS_FAILURE, ballotId}}

export function deleteResults(ballotId) {
	return async (dispatch) => {
		dispatch(deleteResultsLocal(ballotId))
		try {
			const response = await axios.delete('/results', {data: {BallotID: ballotId}})
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(deleteResultsFailure(ballotId)),
					dispatch(setError(response.data.message))
				])
			}
			return Promise.all([
				dispatch(updateBallotSuccess(ballotId, {Results: {}})),
				dispatch(deleteResultsSuccess(ballotId))
			])
		}
		catch(error) {
			return Promise.all([
				dispatch(deleteResultsFailure(ballotId)),
				dispatch(setError(`Unable to delete results with ballotId=${ballotId}`, error.toString()))
			])
		}
	}
}

const importResultsLocal = (ballotId) => {return {type: IMPORT_RESULTS, ballotId}}
const importResultsSuccess = (data) => {return {type: IMPORT_RESULTS_SUCCESS, ...data}}
const importResultsFailure = (ballotId) => {return {type: IMPORT_RESULTS_FAILURE, ballotId}}

export function importResults(ballotId, epollNum) {
	return async (dispatch) => {
		dispatch(importResultsLocal(ballotId))
		try {
			const params = {
				BallotID: ballotId,
				EpollNum: epollNum
			}
			const response = await axios.post('/results/import', params)
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(importResultsFailure(ballotId)),
					dispatch(setError(response.data.message))
				])
			}
			console.log(response.data)
			const summary = response.data.data.summary;
			return Promise.all([
				dispatch(updateBallotSuccess(ballotId, {Results: summary})),
				dispatch(importResultsSuccess(response.data.data))
			])
		}
		catch(error) {
			return Promise.all([
				dispatch(importResultsFailure(ballotId)),
				dispatch(setError(`Unable to import results for ballotId=${ballotId}`, error.toString()))
			])
		}
	}
}

export function uploadResults(ballotId, file) {
	return async (dispatch) => {
		dispatch(importResultsLocal(ballotId))
		try {
			var formData = new FormData()
			formData.append("BallotID", ballotId)
			formData.append("ResultsFile", file)
			const response = await axios.post('/results/upload', formData, {headers: {'Content-Type': 'multipart/form-data'}})
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(importResultsFailure(ballotId)),
					dispatch(setError(response.data.message))
				])
			}
			const summary = response.data.data
			return Promise.all([
				dispatch(updateBallotSuccess(ballotId, {Results: summary})),
				dispatch(importResultsSuccess(ballotId, summary))
			])
		}
		catch(error) {
			return Promise.all([
				dispatch(importResultsFailure(ballotId)),
				dispatch(setError(`Unable to upload results for ballot ${ballotId}`, error.toString()))
			])
		}
	}
}
