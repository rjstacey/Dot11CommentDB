var axios = require('axios');

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
	return dispatch => {
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
			.catch((error) => {
				dispatch(getBallotsFailure('Unable to get ballot list'))
			})
	}
}

export function clearGetBallotsError() {
	return {
		type: 'CLEAR_GET_BALLOTS_ERROR'
	}
}

export function updateBallotLocal(ballotData) {
	return {
		type: 'UPDATE_BALLOT',
		ballot: ballotData
	}
}
function updateBallotSuccess(ballotData) {
	return {
		type: 'UPDATE_BALLOT_SUCCESS',
		ballot: ballotData
	}
}
function updateBallotFailure(ballotId, msg) {
	return {
		type: 'UPDATE_BALLOT_FAILURE',
		ballotId,
		errMsg: msg
	}
}

export function updateBallot(newData) {
	return dispatch => {
		dispatch(updateBallotLocal(newData));
		return axios.post('/ballots', newData)
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(updateBallotFailure(response.data.message))
				}
				else {
					dispatch(updateBallotSuccess(newData))
				}
			})
			.catch((error) => {
				dispatch(updateBallotFailure(newData.BallotID, `Unable to update ballot ${newData.BallotID}`))
			})
	}
}

export function clearUpdateBallotError() {
	return {
		type: 'CLEAR_UPDATE_BALLOT_ERROR'
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
	return dispatch => {
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
			.catch((error) => {
				dispatch(deleteBallotsFailure(ballotIds, `Unable to delete ballots ${ballotIds}: ${error}`))
			})
	}
}

export function clearDeleteBallotsError() {
	return {
		type: 'CLEAR_DELETE_BALLOTS_ERROR'
	}
}

function addBallotLocal(ballotData) {
	return {
		type: 'ADD_BALLOT',
		ballot: ballotData
	}
}
function addBallotSuccess(ballotData) {
	return {
		type: 'ADD_BALLOT_SUCCESS',
		ballot: ballotData
	}
}
function addBallotFailure(msg) {
	return {
		type: 'ADD_BALLOT_FAILURE',
		errMsg: msg
	}
}

export function addBallot(ballotData) {
	return dispatch => {
		dispatch(addBallotLocal(ballotData))
		return axios.put('/ballots/', ballotData)
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(addBallotFailure(response.data.message))
				}
				else {
					dispatch(addBallotSuccess(response.data.data))
				}
			})
			.catch((error) => {
				dispatch(addBallotFailure(`Unable to add ballot ${ballotData.BallotID}`))
			})
	}
}
export function clearAddBallotError() {
	return {
		type: 'CLEAR_ADD_BALLOT_ERROR'
	}
}

function getEpollsLocal(n) {
	return {
		type: 'GET_EPOLLS',
		n
	}
}
function getEpollsSuccess(n, epollData) {
	return {
		type: 'GET_EPOLLS_SUCCESS',
		n,
		epollData
	}
}
function getEpollsFailure(msg) {
	return {
		type: 'GET_EPOLLS_FAILURE',
		errMsg: msg
	}
}
export function getEpolls(n = 20) {
	return dispatch => {
		dispatch(getEpollsLocal(n))
		return axios.get('/epolls', {params: {n}})
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(getEpollsFailure(response.data.message))
				}
				else {
					dispatch(getEpollsSuccess(n, response.data.data))
				}
			})
			.catch((error) => {
				dispatch(getEpollsFailure('Unable to get a list of epolls'))
			})
	}
}
export function clearGetEpollsError() {
	return {
		type: 'CLEAR_GET_EPOLLS_ERROR'
	}
}
