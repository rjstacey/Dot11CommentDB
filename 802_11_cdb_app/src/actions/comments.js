import {updateBallotLocal} from './ballots'

var axios = require('axios');

export function setProject(project) {
	return {
		type: 'SET_PROJECT',
		project
	}
}

export function setFilter(dataKey, filter) {
	return {
		type: 'SET_COMMENTS_FILTER',
		dataKey,
		filter
	}

}

export function setSort(sortBy, sortDirection) {
	return {
		type: 'SET_COMMENTS_SORT',
		sortBy,
		sortDirection
	}
}

function getCommentsLocal(ballotId) {
	return {
		type: 'GET_COMMENTS',
		ballotId: ballotId
	}
}
function getCommentsSuccess(comments) {
	return {
		type: 'GET_COMMENTS_SUCCESS',
		comments
	}
}
function getCommentsFailure(msg) {
	return {
		type: 'GET_COMMENTS_FAILURE',
		errMsg: msg
	}
}

export function getComments(ballotId) {
	return dispatch => {
		dispatch(getCommentsLocal(ballotId))
		return axios.get('/comments', {params: {BallotID: ballotId}})
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(getCommentsFailure(response.data.message))
				}
				else {
					dispatch(getCommentsSuccess(response.data.data))
				}
			})
			.catch((error) => {
				dispatch(getCommentsFailure('Unable to get comment list'))
			})
	}
}

export function clearGetCommentsError() {
	return {
		type: 'CLEAR_GET_COMMENTS_ERROR',
	}
}

function deleteCommentsWithBallotIdLocal(ballotId) {
	return {
		type: 'DELETE_COMMENTS_WITH_BALLOTID',
		ballotId: ballotId
	}
}
function deleteCommentsWithBallotIdSuccess(ballotId) {
	return {
		type: 'DELETE_COMMENTS_WITH_BALLOTID_SUCCESS',
		ballotId: ballotId
	}
}
function deleteCommentsWithBallotIdFailure(ballotId, msg) {
	return {
		type: 'DELETE_COMMENTS_WITH_BALLOTID_FAILURE',
		ballotId,
		errMsg: msg
	}
}
export function deleteCommentsWithBallotId(ballotId) {
	return dispatch => {
		dispatch(deleteCommentsWithBallotIdLocal(ballotId));
		return axios.delete('/comments/BallotId', {data: {BallotID: ballotId}})
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(deleteCommentsWithBallotIdFailure(response.data.message))
				}
				else {
					dispatch(updateBallotLocal({BallotID: ballotId, count: 0}))
					dispatch(deleteCommentsWithBallotIdSuccess(ballotId))
				}
			})
			.catch((error) => {
				dispatch(deleteCommentsWithBallotIdFailure(ballotId, `Unable to delete comments with ballotId=${ballotId}`))
			})
	}
}

export function clearDeleteCommentsWithBallotIdError() {
	return {
		type: 'CLEAR_DELETE_COMMENTS_WITH_BALLOTID_ERROR',
	}
}

function importCommentsLocal(ballotId) {
	return {
		type: 'IMPORT_COMMENTS',
		ballotId
	}
}
function importCommentsSuccess(ballotId, count) {
	return {
		type: 'IMPORT_COMMENTS_SUCCESS',
		ballotId,
		commentCount: count
	}
}
function importCommentsFailure(ballotId, msg) {
	return {
		type: 'IMPORT_COMMENTS_FAILURE',
		ballotId,
		errMsg: msg
	}
}
export function importComments(ballotId, epollNum, startCID) {
	return dispatch => {
		dispatch(importCommentsLocal(ballotId));
		var params = {
			BallotID: ballotId,
			EpollNum: epollNum,
			StartCID: startCID
		}
		return axios.put('/comments/import', params)
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(importCommentsFailure(ballotId, response.data.message))
				}
				else {
					const count = response.data.data.count;
					dispatch(updateBallotLocal({BallotID: ballotId, count: count}))
					dispatch(importCommentsSuccess(ballotId, count))
				}
			})
			.catch((error) => {
				dispatch(importCommentsFailure(ballotId, `Unable to import comments for ballotId=${ballotId}`))
			})
	}
}

export function clearImportCommentsError() {
	return {
		type: 'CLEAR_IMPORT_COMMENTS_ERROR'
	}
}

function updateCommentLocal(data) {
	return {
		type: 'UPDATE_COMMENT',
		comment: data
	}
}
function updateCommentSuccess(data) {
	return {
		type: 'UPDATE_COMMENT_SUCCESS',
		comment: data
	}
}
function updateCommentFailure(msg) {
	return {
		type: 'UPDATE_COMMENT_FAILURE',
		errMsg: msg
	}
}

export function updateComment(data) {
	return dispatch => {
		dispatch(updateCommentLocal(data));
		return axios.post('/comment', data)
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(updateCommentFailure(response.data.message))
				}
				else {
					dispatch(updateCommentSuccess(data))
				}
			})
			.catch((error) => {
				dispatch(updateCommentFailure(`Unable to update comment ${data.BallotID}/${data.CommentID}`))
			})
	}
}

export function clearUpdateCommentError() {
	return {
		type: 'CLEAR_UPDATE_COMMENT_ERROR',
	}
}

function addResolutionLocal(data) {
	return {
		type: 'ADD_RESOLUTION',
		resolution: data
	}
}
function addResolutionSuccess(data) {
	return {
		type: 'ADD_RESOLUTION_SUCCESS',
		resolution: data
	}
}
function addResolutionFailure(msg) {
	return {
		type: 'ADD_RESOLUTION_FAILURE',
		errMsg: msg
	}
}

export function addResolution(data) {
	return dispatch => {
		dispatch(addResolutionLocal(data));
		return axios.put('/resolution', data)
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(addResolutionFailure(response.data.message))
				}
				else {
					dispatch(addResolutionSuccess(data))
				}
			})
			.catch((error) => {
				dispatch(addResolutionFailure(`Unable to add resolution ${data.BallotID}/${data.CommentID}/${data.ResolutionID}`))
			})
	}
}

export function clearAddResolutionError() {
	return {
		type: 'CLEAR_ADD_RESOLUTION_ERROR',
	}
}

function updateResolutionLocal(data) {
	return {
		type: 'UPDATE_RESOLUTION',
		resolution: data
	}
}
function updateResolutionSuccess(data) {
	return {
		type: 'UPDATE_RESOLUTION_SUCCESS',
		resolution: data
	}
}
function updateResolutionFailure(msg) {
	return {
		type: 'UPDATE_RESOLUTION_FAILURE',
		errMsg: msg
	}
}

export function updateResolution(data) {
	return dispatch => {
		dispatch(updateResolutionLocal(data));
		return axios.post('/resolution', data)
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(updateResolutionFailure(response.data.message))
				}
				else {
					dispatch(updateResolutionSuccess(data))
				}
			})
			.catch((error) => {
				dispatch(updateResolutionFailure(`Unable to update resolution ${data.BallotID}/${data.CommentID}/${data.ResolutionID}`))
			})
	}
}

export function clearUpdateResolutionError() {
	return {
		type: 'CLEAR_UPDATE_RESOLUTION_ERROR',
	}
}

function deleteResolutionLocal(data) {
	return {
		type: 'DELETE_RESOLUTION',
		resolution: data
	}
}
function deleteResolutionSuccess(data) {
	return {
		type: 'DELETE_RESOLUTION_SUCCESS',
		resolution: data
	}
}
function deleteResolutionFailure(msg) {
	return {
		type: 'DELETE_RESOLUTION_FAILURE',
		errMsg: msg
	}
}

export function deleteResolution(data) {
	return dispatch => {
		dispatch(deleteResolutionLocal(data));
		return axios.delete('/resolution', data)
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(deleteResolutionFailure(response.data.message))
				}
				else {
					dispatch(deleteResolutionSuccess(data))
				}
			})
			.catch((error) => {
				dispatch(deleteResolutionFailure(`Unable to delete resolution ${data.BallotID}/${data.CommentID}/${data.ResolutionID}`))
			})
	}
}

export function clearDeleteResolutionError() {
	return {
		type: 'CLEAR_DELETE_RESOLUTION_ERROR',
	}
}