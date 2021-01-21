import {setError} from './error'
import fetcher from '../lib/fetcher'

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

export const setProject = (project) => ({type: SET_PROJECT, project})
export const setBallotId = (ballotId) => ({type: SET_BALLOTID, ballotId})

const getBallotsLocal = () => ({type: GET_BALLOTS})
const getBallotsSuccess  = (ballots) => ({type: GET_BALLOTS_SUCCESS,	ballots})
const getBallotsFailure = () => ({type: GET_BALLOTS_FAILURE})

export function getBallots() {
	return async (dispatch, getState) => {
		if (getState().ballots.loading)
			return null
		dispatch(getBallotsLocal())
		try {
			const data = await fetcher.get('/api/ballots')
			return dispatch(getBallotsSuccess(data))
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

const updateBallotLocal = (ballot) => ({type: UPDATE_BALLOT, ballot})
export const updateBallotSuccess = (ballotId, ballot) => ({type: UPDATE_BALLOT_SUCCESS, ballotId, ballot})
const updateBallotFailure = (ballot) => ({type: UPDATE_BALLOT_FAILURE, ballot})

export function updateBallot(ballotId, ballot) {
	console.log(ballotId, ballot)
	return async (dispatch, getState) => {
		dispatch(updateBallotLocal(ballot))
		try {
			const [updatedBallot] = await fetcher.put(`/api/ballots`, [ballot])
			return dispatch(updateBallotSuccess(ballotId, updatedBallot))
		}
		catch(error) {
			return Promise.all([
				dispatch(updateBallotFailure(ballot)),
				dispatch(setError(`Unable to update ballot ${ballotId}`, error.toString()))
			])
		}
	}
}

const deleteBallotsLocal = (ballots) => ({type: DELETE_BALLOTS, ballots})
const deleteBallotsSuccess = (ballots) => ({type: DELETE_BALLOTS_SUCCESS, ballots})
const deleteBallotsFailure = (ballots) => ({type: DELETE_BALLOTS_FAILURE, ballots})

export function deleteBallots(ballots) {
	return async (dispatch, getState) => {
		dispatch(deleteBallotsLocal(ballots))
		try {
			await fetcher.delete('/api/ballots', ballots)
			return dispatch(deleteBallotsSuccess(ballots))
		}
		catch(error) {
			const ballotIdsStr = ballots.map(b => ballots.BallotID).join(', ')
			return Promise.all([
				dispatch(deleteBallotsFailure(ballots)),
				dispatch(setError(`Unable to delete ballots ${ballotIdsStr}`, error.toString()))
			])
		}
	}
}

const addBallotLocal = (ballot) => ({type: ADD_BALLOT, ballot})
const addBallotSuccess = (ballot) => ({type: ADD_BALLOT_SUCCESS, ballot})
const addBallotFailure = () => ({type: ADD_BALLOT_FAILURE})

export function addBallot(ballot) {
	return async (dispatch, getState) => {
		dispatch(addBallotLocal(ballot))
		try {
			const [updateBallot] = await fetcher.post('/api/ballots', [ballot])
			return dispatch(addBallotSuccess(updateBallot))
		}
		catch(error) {
			return Promise.all([
				dispatch(addBallotFailure()),
				dispatch(setError(`Unable to add ballot ${ballot.BallotID}`, error.toString()))
			])
		}
	}
}

export const BallotType = {
	CC: 0,			// comment collection
	WG_Initial: 1,	// initial WG ballot
	WG_Recirc: 2,	// WG ballot recirculation
	SA_Initial: 3,	// initial SA ballot
	SA_Recirc: 4,	// SA ballot recirculation
	Motion: 5		// motion
};
