import {syncEpollsAgainstBallots} from './epolls'
import {setError} from './error'
import fetcher from '../lib/fetcher'

export const SET_BALLOTS_FILTER = 'SET_BALLOTS_FILTER'
export const SET_BALLOTS_SORT = 'SET_BALLOTS_SORT'
export const SET_BALLOTS_SELECTED = 'SET_BALLOTS_SELECTED'

export const SET_PROJECT = 'SET_PROJECT'
export const SET_BALLOTID = 'SET_BALLOTID'

export const GET_BALLOTS = 'GET_BALLOTS'
export const GET_BALLOTS_SUCCESS = 'GET_BALLOTS_SUCCESS'
export const GET_BALLOTS_FAILURE = 'GET_BALLOTS_FAILURE'
export const UPDATE_BALLOT = 'UPDATE_BALLOT'
export const UPDATE_BALLOT_SUCCESS = 'UPDATE_BALLOT_SUCCESS'
export const UPDATE_BALLOT_FAILURE = 'UPDATE_BALLOT_FAILURE'
export const DELETE_BALLOTS = 'DELETE_BALLOTS'
export const DELETE_BALLOTS_SUCCESS = 'DELETE_BALLOTS_SUCCESS'
export const DELETE_BALLOTS_FAILURE = 'DELETE_BALLOTS_FAILURE'
export const ADD_BALLOT = 'ADD_BALLOT'
export const ADD_BALLOT_SUCCESS = 'ADD_BALLOT_SUCCESS'
export const ADD_BALLOT_FAILURE = 'ADD_BALLOT_FAILURE'


export const setBallotsFilter = (dataKey, value) => {return {type: SET_BALLOTS_FILTER, dataKey, value}}
export const setBallotsSort = (event, dataKey) => {return {type: SET_BALLOTS_SORT, event, dataKey}}
export const setBallotsSelected = (selected) => {return {type: SET_BALLOTS_SELECTED, selected}}

export const setProject = (project) => {return {type: SET_PROJECT, project}}
export const setBallotId = (ballotId) => {return {type: SET_BALLOTID, ballotId}}

const getBallotsLocal = () => {return {type: GET_BALLOTS}}
const getBallotsSuccess  = (ballots) => {return {type: GET_BALLOTS_SUCCESS,	ballots}}
const getBallotsFailure = () => {return {type: GET_BALLOTS_FAILURE}}

export function getBallots() {
	return async (dispatch, getState) => {
		dispatch(getBallotsLocal())
		try {
			const data = await fetcher.get('/api/ballots')
			await dispatch(getBallotsSuccess(data))
			return dispatch(syncEpollsAgainstBallots(getState().ballots.ballots))
		}
		catch(error) {
			console.log(error)
			return Promise.all([
				dispatch(getBallotsFailure()),
				dispatch(setError('Unable to get ballot list', error.toString()))
			])
		}
	}
}

export const updateBallotLocal = (ballotId, ballot) => {return {type: UPDATE_BALLOT, ballotId, ballot}}
export const updateBallotSuccess = (ballotId, ballot) => {return {type: UPDATE_BALLOT_SUCCESS,	ballotId, ballot}}
const updateBallotFailure = (ballotId) => {return {type: UPDATE_BALLOT_FAILURE, ballotId}}

export function updateBallot(ballotId, ballot) {
	return async (dispatch, getState) => {
		dispatch(updateBallotLocal(ballotId, ballot))
		try {
			const updatedBallot = await fetcher.put(`/api/ballot/${ballotId}`, ballot)
			await dispatch(updateBallotSuccess(ballotId, updatedBallot))
			return dispatch(syncEpollsAgainstBallots(getState().ballots.ballots))
		}
		catch(error) {
			return Promise.all([
				dispatch(updateBallotFailure(ballotId)),
				dispatch(setError(`Unable to update ballot ${ballotId}`, error.toString()))
			])
		}
	}
}

const deleteBallotsLocal = (ballotIds) => {return {type: DELETE_BALLOTS, ballotIds}}
const deleteBallotsSuccess = (ballotIds) => {return {type: DELETE_BALLOTS_SUCCESS, ballotIds}}
const deleteBallotsFailure = (ballotIds) => {return {type: DELETE_BALLOTS_FAILURE, ballotIds}}

export function deleteBallots(ballotIds) {
	return async (dispatch, getState) => {
		dispatch(deleteBallotsLocal(ballotIds))
		try {
			await fetcher.delete('/api/ballots', ballotIds)
			await dispatch(deleteBallotsSuccess(ballotIds))
			return dispatch(syncEpollsAgainstBallots(getState().ballots.ballots))
		}
		catch(error) {
			return Promise.all([
				dispatch(deleteBallotsFailure(ballotIds)),
				dispatch(setError(`Unable to delete ballots ${ballotIds}`, error.toString()))
			])
		}
	}
}

const addBallotLocal = (ballot) => {return {type: ADD_BALLOT, ballot}}
const addBallotSuccess = (ballot) => {return {type: ADD_BALLOT_SUCCESS,	ballot}}
const addBallotFailure = () => {return {type: ADD_BALLOT_FAILURE}}

export function addBallot(ballot) {
	return async (dispatch, getState) => {
		dispatch(addBallotLocal(ballot))
		try {
			const updateBallot = await fetcher.post('/api/ballots', ballot)
			await dispatch(addBallotSuccess(updateBallot))
			return dispatch(syncEpollsAgainstBallots(getState().ballots.ballots))
		}
		catch(error) {
			return Promise.all([
				dispatch(addBallotFailure()),
				dispatch(setError(`Unable to add ballot ${ballot.BallotID}`, error.toString()))
			])
		}
	}
}
