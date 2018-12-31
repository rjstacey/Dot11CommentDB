import {updateBallotLocal} from './ballots'

var axios = require('axios');

function requestComments(ballotId) {
	return {
		type: 'GETALL_COMMENTS',
		ballotId: ballotId
	}
}
function receiveCommentsSuccess(comments) {
	return {
		type: 'GETALL_COMMENTS_SUCCESS',
		comments
	}
}
function receiveCommentsFailure(msg) {
	return {
		type: 'GETALL_COMMENTS_FAILURE',
		errMsg: msg
	}
}

export function fetchComments(ballotId) {
	return dispatch => {
		dispatch(requestComments(ballotId))
		return axios.get('/comments', {params: {BallotID: ballotId}})
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(receiveCommentsFailure(response.data.message))
				}
				else {
					dispatch(receiveCommentsSuccess(response.data.data))
				}
			})
			.catch((error) => {
				dispatch(receiveCommentsFailure('Unable to get comment list'))
			})
	}
}

function updateCommentLocal(commentData) {
	return {
		type: 'UPDATE_COMMENT',
		comment: commentData
	}
}
function updateCommentSuccess(commentData) {
	return {
		type: 'UPDATE_COMMENT_SUCCESS',
		comment: commentData
	}
}
function updateCommentFailure(commentId, msg) {
	return {
		type: 'UPDATE_COMMENT_FAILURE',
		commentId,
		errMsg: msg
	}
}

export function updateComment(newCommentData) {
	return dispatch => {
		dispatch(updateCommentLocal(newCommentData));
		return axios.post('/comment', newCommentData)
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(updateCommentFailure(response.data.message))
				}
				else {
					dispatch(updateCommentSuccess(newCommentData))
				}
			})
			.catch((error) => {
				dispatch(updateCommentFailure(newCommentData.CommentID, `Unable to update comment ${newCommentData.CommentID}`))
			})
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
		dispatch(updateCommentLocal(ballotId));
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
function importCommentsLocal(ballotId) {
	return {
		type: 'IMPORT_COMMENTS',
		ballotId: ballotId
	}
}
function importCommentsSuccess(ballotId, count) {
	return {
		type: 'IMPORT_COMMENTS_SUCCESS',
		ballotId: ballotId,
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
				dispatch(importCommentsFailure(ballotId, `Unable to delete comments with ballotId=${ballotId}`))
			})
	}
}

export function clearImportError() {
	return {
		type: 'CLEAR_IMPORT_ERROR'
	}
}
export function clearUpdateError() {
	return {
		type: 'CLEAR_UPDATE_ERROR'
	}
}
export function clearFetchError() {
	return {
		type: 'CLEAR_FETCH_ERROR'
	}
}