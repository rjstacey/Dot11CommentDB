
import {updateBallotLocal} from './ballots'

var axios = require('axios');

function getVotersLocal(ballotId) {
	return {
		type: 'GET_VOTERS',
		ballotId: ballotId
	}
}
function getVotersSuccess(voters, summary) {
	return {
		type: 'GET_VOTERS_SUCCESS',
		voters,
		summary
	}
}
function getVotersFailure(msg) {
	return {
		type: 'GET_VOTERS_FAILURE',
		errMsg: msg
	}
}

export function getVoters(ballotId) {
	return dispatch => {
		dispatch(getVotersLocal(ballotId))
		return axios.get('/voters', {params: {BallotID: ballotId}})
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(getVotersFailure(response.data.message))
				}
				else {
					var {voters, summary} = response.data.data;
					dispatch(getVotersSuccess(voters, summary))
				}
			})
			.catch((error) => {
				dispatch(getVotersFailure('Unable to get voters list'))
			})
	}
}

export function clearGetVotersError() {
	return {
		type: 'CLEAR_GET_VOTERS_ERROR',
	}
}

function deleteVotersLocal(ballotId) {
	return {
		type: 'DELETE_VOTERS',
		ballotId: ballotId
	}
}
function deleteVotersSuccess(ballotId) {
	return {
		type: 'DELETE_VOTERS_SUCCESS',
		ballotId: ballotId
	}
}
function deleteVotersFailure(ballotId, msg) {
	return {
		type: 'DELETE_VOTERS_FAILURE',
		ballotId,
		errMsg: msg
	}
}
export function deleteVoters(ballotId) {
	return dispatch => {
		dispatch(deleteVotersLocal(ballotId));
		return axios.delete('/voters', {data: {BallotID: ballotId}})
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(deleteVotersFailure(response.data.message))
				}
				else {
					dispatch(updateBallotLocal({BallotID: ballotId, Voters: ''}))
					dispatch(deleteVotersSuccess(ballotId))
				}
			})
			.catch((error) => {
				dispatch(deleteVotersFailure(ballotId, `Unable to delete voters with ballotId=${ballotId}`))
			})
	}
}

export function clearDeleteVotersError() {
	return {
		type: 'CLEAR_DELETE_VOTERS_ERROR',
	}
}

function uploadVotersLocal(ballotId) {
	return {
		type: 'IMPORT_VOTERS',
		ballotId
	}
}
function uploadVotersSuccess(ballotId) {
	return {
		type: 'IMPORT_VOTERS_SUCCESS',
		ballotId,
	}
}
function uploadVotersFailure(ballotId, msg) {
	return {
		type: 'IMPORT_VOTERS_FAILURE',
		ballotId,
		errMsg: msg
	}
}
export function uploadVoters(ballotId, file) {
	return dispatch => {
		dispatch(uploadVotersLocal(ballotId));
		var formData = new FormData();
		formData.append("BallotID", ballotId);
		formData.append("VotersFile", file);
		return axios.post('/voters', formData, {headers: {'Content-Type': 'multipart/form-data'}})
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(uploadVotersFailure(ballotId, response.data.message))
				}
				else {
					dispatch(uploadVotersSuccess(ballotId))
				}
			})
			.catch((error) => {
				dispatch(uploadVotersFailure(ballotId, `Unable to import voters for ballotId=${ballotId}`))
			})
	}
}

export function clearImportVotersError() {
	return {
		type: 'CLEAR_IMPORT_VOTERS_ERROR'
	}
}

