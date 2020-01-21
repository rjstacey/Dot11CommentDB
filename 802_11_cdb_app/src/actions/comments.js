import {updateBallotLocal} from './ballots'

var axios = require('axios');

export function setProject(project) {
	return {
		type: 'SET_PROJECT',
		project
	}
}

export function setCommentsFilters(filters) {
	return {
		type: 'SET_COMMENTS_FILTERS',
		filters
	}

}

export function setCommentsSort(sortBy, sortDirection) {
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
					dispatch(updateBallotLocal({BallotID: ballotId, Comments: {Count: 0}}))
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
		ballotId
	}
}
function importCommentsSuccess(ballotId, summary) {
	return {
		type: 'IMPORT_COMMENTS_SUCCESS',
		ballotId,
		CommentsSummary: summary
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
		return axios.post('/comments/import', params)
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(importCommentsFailure(ballotId, response.data.message))
				}
				else {
					const commentsSummary = response.data.data.CommentsSummary;
					dispatch(updateBallotLocal({BallotID: ballotId, Comments: commentsSummary}))
					dispatch(importCommentsSuccess(ballotId, commentsSummary))
				}
			})
			.catch((error) => {
				console.log(error)
				dispatch(importCommentsFailure(ballotId, `Unable to import comments for ${ballotId}`))
			})
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
		return axios.put('/comment', data)
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

function addResolutionLocal(data) {
	return {
		type: 'ADD_RESOLUTION',
		resolution: data
	}
}

function addResolutionSuccess(data) {
	return {
		type: 'ADD_RESOLUTION_SUCCESS',
		ballotId: data.BallotID,
		commentId: data.CommentID,
		resolutionId: data.ResolutionID,
		updatedComments: data.updatedComments
	}
}

function addResolutionFailure(msg) {
	return {
		type: 'ADD_RESOLUTION_FAILURE',
		errMsg: msg
	}
}

export function addResolution(data) {
	return async (dispatch) => {
		dispatch(addResolutionLocal(data));
		try {
			const response = await axios.post('/resolution', data)
			if (response.data.status === 'OK') {
				await dispatch(addResolutionSuccess(response.data.data))
				console.log(response.data.data)
				return response.data.data.ResolutionID
			}
			else {
				await dispatch(addResolutionFailure(response.data.message))
				return -1
			}
		}
		catch(error) {
			console.log(error)
			await dispatch(addResolutionFailure(`Unable to add resolution ${data.BallotID}/${data.CommentID}/${data.ResolutionID}`))
			return -1
		}
	}
}

function updateResolutionsLocal(ballotId, resolutions) {
	return {
		type: 'UPDATE_RESOLUTIONS',
		ballotId,
		resolutions
	}
}
function updateResolutionsSuccess(ballotId, resolutions) {
	return {
		type: 'UPDATE_RESOLUTIONS_SUCCESS',
		ballotId,
		resolutions
	}
}
function updateResolutionsFailure(errMsg) {
	return {
		type: 'UPDATE_RESOLUTIONS_FAILURE',
		errMsg
	}
}

export function updateResolutions(ballotId, resolutions) {
	return async (dispatch) => {
		dispatch(updateResolutionsLocal(ballotId, resolutions));
		try {
			const response = await axios.put('/resolutions', {ballotId, resolutions})
			if (response.data.status === 'OK') {
				return dispatch(updateResolutionsSuccess(ballotId, resolutions))
			}
			else {
				return dispatch(updateResolutionsFailure(response.data.message))
			}
		}
		catch(error) {
			console.log(error)
			return dispatch(updateResolutionsFailure(`Unable to update resolutions for ${ballotId}`))
		}
	}
}

export function clearUpdateResolutionError() {
	return {
		type: 'CLEAR_UPDATE_RESOLUTION_ERROR',
	}
}

function deleteResolutionLocal(ballotId, commentId, resolutionId) {
	return {
		type: 'DELETE_RESOLUTION',
		ballotId,
		commentId,
		resolutionId
	}
}

function deleteResolutionSuccess(data) {
	return {
		type: 'DELETE_RESOLUTION_SUCCESS',
		ballotId: data.BallotID,
		commentId: data.CommentID,
		resolutionId: data.ResolutionID,
		updatedComments: data.updatedComments
	}
}
function deleteResolutionFailure(msg) {
	return {
		type: 'DELETE_RESOLUTION_FAILURE',
		errMsg: msg
	}
}

export function deleteResolution(data) {
	return async (dispatch) => {
		dispatch(deleteResolutionLocal(data))
		try {
			const response = await axios.delete('/resolution', {data: data})
			if (response.data.status === 'OK') {
				return dispatch(deleteResolutionSuccess(response.data.data))
			}
			else {
				return dispatch(deleteResolutionFailure(response.data.message))
			}
		}
		catch(error) {
			console.log(error)
			return dispatch(deleteResolutionFailure(`Unable to delete resolution ${data.BallotID}/${data.CommentID}/${data.ResolutionID}`))
		}
	}
}

function uploadCommentsLocal(ballotId) {
	return {
		type: 'UPLOAD_COMMENTS',
		ballotId
	}
}
function uploadCommentsSuccess(ballotId) {
	return {
		type: 'UPLOAD_COMMENTS_SUCCESS',
		ballotId,
	}
}
function uploadCommentsFailure(msg) {
	return {
		type: 'UPLOAD_COMMENTS_FAILURE',
		errMsg: msg
	}
}
export function uploadComments(ballotId, file) {
	return dispatch => {
		dispatch(uploadCommentsLocal(ballotId));
		var formData = new FormData();
		formData.append("BallotID", ballotId);
		formData.append("CommentsFile", file);
		return axios.post('/comments/upload', formData, {headers: {'Content-Type': 'multipart/form-data'}})
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(uploadCommentsFailure(response.data.message))
				}
				else {
					dispatch(uploadCommentsSuccess(ballotId))
				}
			})
			.catch((error) => {
				dispatch(uploadCommentsFailure(`Unable to upload comments for ballot ${ballotId}`))
			})
	}
}

function uploadResolutionsLocal(ballotId) {
	return {
		type: 'UPLOAD_RESOLUTIONS',
		ballotId
	}
}
function uploadResolutionsSuccess(ballotId) {
	return {
		type: 'UPLOAD_RESOLUTIONS_SUCCESS',
		ballotId,
	}
}
function uploadResolutionsFailure(msg) {
	return {
		type: 'UPLOAD_RESOLUTIONS_FAILURE',
		errMsg: msg
	}
}
export function uploadResolutions(ballotId, file) {
	console.log('uploadResolutions')

	return dispatch => {
		dispatch(uploadResolutionsLocal(ballotId));
		var formData = new FormData();
		formData.append("BallotID", ballotId);
		formData.append("ResolutionsFile", file);
		return axios.post('/resolutions/upload', formData, {headers: {'Content-Type': 'multipart/form-data'}})
			.then((response) => {
				if (response.data.status !== 'OK') {
					dispatch(uploadResolutionsFailure(response.data.message))
				}
				else {
					dispatch(uploadResolutionsSuccess(ballotId))
				}
			})
			.catch((error) => {
				dispatch(uploadResolutionsFailure(`Unable to upload resolutions for ballot ${ballotId}`))
			})
	}
}

export function clearCommentsError() {
	return {
		type: 'CLEAR_COMMENTS_ERROR',
	}
}