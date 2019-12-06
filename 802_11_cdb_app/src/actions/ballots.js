import {syncEpollsAgainstBallots} from './epolls'

var axios = require('axios');

export function setBallotsFilters(filters) {
	return {
		type: 'SET_BALLOTS_FILTERS',
		filters
	}
}
export function setBallotsSort(sortBy, sortDirection) {
	return {
		type: 'SET_BALLOTS_SORT',
		sortBy,
		sortDirection
	}
}

function getBallotsLocal() {
	return {
		type: 'GET_BALLOTS'
	}
}
function getBallotsSuccess(ballots) {
	return {
		type: 'GET_BALLOTS_SUCCESS',
		ballots
	}
}
function getBallotsFailure(msg) {
	return {
		type: 'GET_BALLOTS_FAILURE',
		errMsg: msg
	}
}

export function getBallots() {
	return (dispatch, getState) => {
		dispatch(getBallotsLocal())
		return axios.get('/ballots')
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(getBallotsFailure(response.data.message))
				}
				else {
					dispatch(getBallotsSuccess(response.data.data))
				}
			})
			.then(() => dispatch(syncEpollsAgainstBallots(getState().ballots.ballotsData)))
			.catch((error) => {
				console.log(error)
				dispatch(getBallotsFailure('Unable to get ballot list'))
			})
	}
}

export function updateBallotLocal(ballotId, ballotData) {
	return {
		type: 'UPDATE_BALLOT',
		ballotId,
		ballotData
	}
}
function updateBallotSuccess(ballotId, ballotData) {
	return {
		type: 'UPDATE_BALLOT_SUCCESS',
		ballotId,
		ballotData
	}
}
function updateBallotFailure(ballotId, msg) {
	return {
		type: 'UPDATE_BALLOT_FAILURE',
		ballotId,
		errMsg: msg
	}
}

export function updateBallot(ballotId, ballotData) {
	return (dispatch, getState) => {
		dispatch(updateBallotLocal(ballotId, ballotData));
		return axios.put(`/ballot/${ballotId}`, ballotData)
			.then((response) => {
				if (response.data.status === 'OK') {
					dispatch(updateBallotSuccess(ballotId, response.data.data))
				}
				else {
					dispatch(updateBallotFailure(ballotId, response.data.message))
				}
			})
			.then(() => dispatch(syncEpollsAgainstBallots(getState().ballots.ballotsData)))
			.catch((error) => {
				dispatch(updateBallotFailure(ballotId, `Unable to update ballot ${ballotId}`))
			})
	}
}

function deleteBallotsLocal(ballotIds) {
	return {
		type: 'DELETE_BALLOTS',
		ballotIds
	}
}
function deleteBallotsSuccess(ballotIds) {
	return {
		type: 'DELETE_BALLOTS_SUCCESS',
		ballotIds
	}
}
function deleteBallotsFailure(ballotIds, msg) {
	return {
		type: 'DELETE_BALLOTS_FAILURE',
		ballotIds,
		errMsg: msg
	}
}

export function deleteBallots(ballotIds) {
	return (dispatch, getState) => {
		dispatch(deleteBallotsLocal(ballotIds))
		return axios.delete('/ballots', {data: ballotIds})
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(deleteBallotsFailure(ballotIds, response.data.message))
				}
				else {
					dispatch(deleteBallotsSuccess(ballotIds))
				}
			})
			.then(() => dispatch(syncEpollsAgainstBallots(getState().ballots.ballotsData)))
			.catch((error) => {
				dispatch(deleteBallotsFailure(ballotIds, `Unable to delete ballots ${ballotIds}: ${error}`))
			})
	}
}

function addBallotLocal(ballot) {
	return {
		type: 'ADD_BALLOT',
		ballot
	}
}
function addBallotSuccess(ballot) {
	return {
		type: 'ADD_BALLOT_SUCCESS',
		ballot
	}
}
function addBallotFailure(msg) {
	return {
		type: 'ADD_BALLOT_FAILURE',
		errMsg: msg
	}
}

export function addBallot(ballot) {
	return (dispatch, getState) => {
		dispatch(addBallotLocal(ballot))
		return axios.post('/ballots/', ballot)
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(addBallotFailure(response.data.message))
				}
				else {
					dispatch(addBallotSuccess(response.data.data))
				}
			})
			.then(() => dispatch(syncEpollsAgainstBallots(getState().ballots.ballotsData)))
			.catch((error) => {
				dispatch(addBallotFailure(`Unable to add ballot ${ballot.BallotID}`))
			})
	}
}

export function setProject(project) {
	return {
		type: 'SET_PROJECT',
		project
	}
}
export function setBallotId(ballotId) {
	return {
		type: 'SET_BALLOTID',
		ballotId
	}
}

export function clearBallotsError() {
	return {
		type: 'CLEAR_BALLOTS_ERROR'
	}
}

