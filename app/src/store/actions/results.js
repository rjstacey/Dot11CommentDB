import {updateBallotSuccess} from './ballots'
import {setError} from './error'
import fetcher from '../lib/fetcher'

export const SET_RESULTS_FILTER = 'SET_RESULTS_FILTER'
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

export const setResultsFilter = (dataKey, value) => {return {type: SET_RESULTS_FILTER, dataKey, value}}
export const setResultsSort = (event, dataKey) => {return {type: SET_RESULTS_SORT, event, dataKey}}

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
			const data = await fetcher.get(`/api/results/${ballotId}`)
			return dispatch(getResultsSuccess(data))
		}
		catch(error) {
			return Promise.all([
				dispatch(getResultsFailure()),
				dispatch(setError('Unable to get results list', error))
			])
		}
	}
}

const deleteResultsLocal = (ballotId) => {return {type: DELETE_RESULTS, ballotId}}
const deleteResultsSuccess = (ballotId) => {return {type: DELETE_RESULTS_SUCCESS, ballotId}}
const deleteResultsFailure = (ballotId) => {return {type: DELETE_RESULTS_FAILURE, ballotId}}

export function deleteResults(ballotId, ballot) {
	return async (dispatch) => {
		dispatch(deleteResultsLocal(ballotId))
		try {
			await fetcher.delete(`/api/results/${ballotId}`)
			return Promise.all([
				dispatch(updateBallotSuccess(ballotId, {id: ballot.id, Results: {}})),
				dispatch(deleteResultsSuccess(ballotId))
			])
		}
		catch(error) {
			return Promise.all([
				dispatch(deleteResultsFailure(ballotId)),
				dispatch(setError(`Unable to delete results with ballotId=${ballotId}`, error))
			])
		}
	}
}

const importResultsLocal = (ballotId) => {return {type: IMPORT_RESULTS, ballotId}}
const importResultsSuccess = (ballotId) => {return {type: IMPORT_RESULTS_SUCCESS, ballotId}}
const importResultsFailure = (ballotId) => {return {type: IMPORT_RESULTS_FAILURE, ballotId}}

export function importResults(ballotId, epollNum) {
	return async (dispatch) => {
		dispatch(importResultsLocal(ballotId))
		try {
			const result = await fetcher.post(`/api/results/importFromEpoll/${ballotId}/${epollNum}`)
			console.log(result)
			return Promise.all([
				dispatch(updateBallotSuccess(ballotId, result.ballot)),
				dispatch(importResultsSuccess(ballotId))
			])
		}
		catch(error) {
			return Promise.all([
				dispatch(importResultsFailure(ballotId)),
				dispatch(setError(`Unable to import results for ballotId=${ballotId}`, error))
			])
		}
	}
}

export function uploadEpollResults(ballotId, file) {
	return async (dispatch) => {
		dispatch(importResultsLocal(ballotId))
		try {
			const result = await fetcher.postMultipart(`/api/results/uploadEpollResults/${ballotId}`, {ResultsFile: file})
			return Promise.all([
				dispatch(updateBallotSuccess(ballotId, result.ballot)),
				dispatch(importResultsSuccess(result))
			])
		}
		catch(error) {
			return Promise.all([
				dispatch(importResultsFailure(ballotId)),
				dispatch(setError(`Unable to upload results for ballot ${ballotId}`, error))
			])
		}
	}
}

export function uploadMyProjectResults(ballotId, file) {
	return async (dispatch) => {
		dispatch(importResultsLocal(ballotId))
		try {
			const result = await fetcher.postMultipart(`/api/results/uploadMyProjectResults/${ballotId}`, {ResultsFile: file})
			return Promise.all([
				dispatch(updateBallotSuccess(ballotId, result.ballot)),
				dispatch(importResultsSuccess(result))
			])
		}
		catch(error) {
			return Promise.all([
				dispatch(importResultsFailure(ballotId)),
				dispatch(setError(`Unable to upload results for ballot ${ballotId}`, error))
			])
		}
	}
}