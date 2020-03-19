import {updateBallotSuccess} from './ballots'
import {setError} from './error'
import fetcher from '../lib/fetcher'

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
			const data = await fetcher.get(`/results/${ballotId}`)
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

export function deleteResults(ballotId) {
	return async (dispatch) => {
		dispatch(deleteResultsLocal(ballotId))
		try {
			await fetcher.delete(`/results/${ballotId}`)
			return Promise.all([
				dispatch(updateBallotSuccess(ballotId, {Results: {}})),
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
const importResultsSuccess = (data) => {return {type: IMPORT_RESULTS_SUCCESS, ...data}}
const importResultsFailure = (ballotId) => {return {type: IMPORT_RESULTS_FAILURE, ballotId}}

export function importResults(ballotId, epollNum) {
	return async (dispatch) => {
		dispatch(importResultsLocal(ballotId))
		try {
			const data = await fetcher.post(`/results/importFromEpoll/${ballotId}/${epollNum}`)
			console.log(data)
			return Promise.all([
				dispatch(updateBallotSuccess(ballotId, {Results: data.summary})),
				dispatch(importResultsSuccess(data))
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

export function uploadResults(ballotId, type, file) {
	return async (dispatch) => {
		dispatch(importResultsLocal(ballotId))
		try {
			const data = await fetcher.postMultipart(`/results/upload/${ballotId}/${type}`, {ResultsFile: file})
			return Promise.all([
				dispatch(updateBallotSuccess(ballotId, {Results: data.summary})),
				dispatch(importResultsSuccess(data))
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
