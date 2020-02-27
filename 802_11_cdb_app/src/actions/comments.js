import {updateBallotSuccess} from './ballots'
import {setError} from './error'

var axios = require('axios')

export const SET_COMMENTS_FILTERS = 'SET_COMMENTS_FILTERS'
export const SET_COMMENTS_SORT = 'SET_COMMENTS_SORT'

export const GET_COMMENTS = 'GET_COMMENTS'
export const GET_COMMENTS_SUCCESS = 'GET_COMMENTS_SUCCESS'
export const GET_COMMENTS_FAILURE = 'GET_COMMENTS_FAILURE'
export const UPDATE_COMMENT = 'UPDATE_COMMENT'
export const UPDATE_COMMENT_SUCCESS = 'UPDATE_COMMENT_SUCCESS'
export const UPDATE_COMMENT_FAILURE = 'UPDATE_COMMENT_FAILURE'
export const DELETE_COMMENTS = 'DELETE_COMMENTS'
export const DELETE_COMMENTS_SUCCESS = 'DELETE_COMMENTS_SUCCESS'
export const DELETE_COMMENTS_FAILURE = 'DELETE_COMMENTS_FAILURE'
export const IMPORT_COMMENTS = 'IMPORT_COMMENTS'
export const IMPORT_COMMENTS_SUCCESS = 'IMPORT_COMMENTS_SUCCESS'
export const IMPORT_COMMENTS_FAILURE = 'IMPORT_COMMENTS_FAILURE'
export const UPLOAD_COMMENTS = 'UPLOAD_COMMENTS'
export const UPLOAD_COMMENTS_SUCCESS = 'UPLOAD_COMMENTS_SUCCESS'
export const UPLOAD_COMMENTS_FAILURE = 'UPLOAD_COMMENTS_FAILURE'

export const ADD_RESOLUTION = 'ADD_RESOLUTION'
export const ADD_RESOLUTION_SUCCESS = 'ADD_RESOLUTION_SUCCESS'
export const ADD_RESOLUTION_FAILURE = 'ADD_RESOLUTION_FAILURE'
export const UPDATE_RESOLUTIONS = 'UPDATE_RESOLUTIONS'
export const UPDATE_RESOLUTIONS_SUCCESS = 'UPDATE_RESOLUTIONS_SUCCESS'
export const UPDATE_RESOLUTIONS_FAILURE = 'UPDATE_RESOLUTIONS_FAILURE'
export const DELETE_RESOLUTION = 'DELETE_RESOLUTION'
export const DELETE_RESOLUTION_SUCCESS = 'DELETE_RESOLUTION_SUCCESS'
export const DELETE_RESOLUTION_FAILURE = 'DELETE_RESOLUTION_FAILURE'


export const setCommentsFilters = (filters) => {return {type: SET_COMMENTS_FILTERS, filters}}
export const setCommentsSort = (sortBy, sortDirection) => {return {type: SET_COMMENTS_SORT, sortBy, sortDirection}}

const getCommentsLocal = (ballotId) => {return {type: GET_COMMENTS, ballotId}}
const getCommentsSuccess = (comments) => {return {type: GET_COMMENTS_SUCCESS, comments}}
const getCommentsFailure = () => {return {type: GET_COMMENTS_FAILURE}}

export function getComments(ballotId) {
	return async (dispatch) => {
		dispatch(getCommentsLocal(ballotId))
		try {
			const response = await axios.get('/comments', {params: {BallotID: ballotId}})
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(getCommentsFailure()),
					dispatch(setError(response.data.message))
				])
			}
			return dispatch(getCommentsSuccess(response.data.data))
		}
		catch(error) {
			return Promise.all([
				dispatch(getCommentsFailure()),
				dispatch(setError('Unable to get comment list', error.toString()))
			])
		}
	}
}

const updateCommentLocal = (comment) => {return {type: UPDATE_COMMENT, comment}}
const updateCommentSuccess = (comment) => {return {type: UPDATE_COMMENT_SUCCESS, comment}}
const updateCommentFailure = () => {return {type: UPDATE_COMMENT_FAILURE}}

export function updateComment(data) {
	return async (dispatch) => {
		dispatch(updateCommentLocal(data))
		try {
			const response = await axios.put('/comment', data)
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(updateCommentFailure()),
					dispatch(setError(response.data.message))
				])
			}
			return dispatch(updateCommentSuccess(data))
		}
		catch(error) {
			return Promise.all([
				dispatch(updateCommentFailure()),
				dispatch(setError(`Unable to update comment ${data.BallotID}/${data.CommentID}`, error.toString()))
			])
		}
	}
}

const deleteCommentsLocal = (ballotId) => {return {type: DELETE_COMMENTS, ballotId}}
const deleteCommentsSuccess = (ballotId) => {return {type: DELETE_COMMENTS_SUCCESS, ballotId}}
const deleteCommentsFailure = (ballotId) => {return {type: DELETE_COMMENTS_FAILURE, ballotId}}

export function deleteComments(ballotId) {
	return async (dispatch) => {
		dispatch(deleteCommentsLocal(ballotId))
		try {
			const response = await axios.delete('/comments/BallotId', {data: {BallotID: ballotId}})
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(deleteCommentsFailure(ballotId)),
					dispatch(setError(response.data.message))
				])
			}
			const summary = {Count: 0, CommentIDMin: 0, CommentIDMax: 0}
			return Promise.all([
				dispatch(deleteCommentsSuccess(ballotId)),
				// Update the comments summary for the ballot
				dispatch(updateBallotSuccess(ballotId, {BallotID: ballotId, Comments: summary}))
			])
		}
		catch(error) {
			return Promise.all([
				dispatch(deleteCommentsFailure(ballotId)),
				dispatch(setError(`Unable to delete comments with ballotId=${ballotId}`, error.toString()))
			])
		}
	}
}

const importCommentsLocal  = (ballotId) => {return {type: IMPORT_COMMENTS, ballotId}}
const importCommentsSuccess = (ballotId, comments) => {return {type: IMPORT_COMMENTS_SUCCESS, ballotId, comments}}
const importCommentsFailure = (ballotId) => {return {type: IMPORT_COMMENTS_FAILURE, ballotId}}

export function importComments(ballotId, epollNum, startCID) {
	return async (dispatch) => {
		dispatch(importCommentsLocal(ballotId));
		var params = {
			BallotID: ballotId,
			EpollNum: epollNum,
			StartCID: startCID
		}
		try {
			const response = await axios.post('/comments/import', params)
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(importCommentsFailure(ballotId)),
					dispatch(setError(response.data.message))
				])
			}
			const {comments, summary} = response.data.data
			return Promise.all([
				dispatch(importCommentsSuccess(ballotId, comments)),
				// Update the comments summary for the ballot
				dispatch(updateBallotSuccess(ballotId, {BallotID: ballotId, Comments: summary}))
			])
		}
		catch(error) {
			return Promise.all([
				dispatch(importCommentsFailure(ballotId)),
				dispatch(setError(`Unable to import comments for ${ballotId}`, error.toString()))
			])
		}
	}
}

const uploadCommentsLocal = (ballotId) => {return {type: UPLOAD_COMMENTS, ballotId}}
const uploadCommentsSuccess = (ballotId, comments) => {return {type: UPLOAD_COMMENTS_SUCCESS, ballotId, comments}}
const uploadCommentsFailure = () => {return {type: UPLOAD_COMMENTS_FAILURE}}

export function uploadComments(ballotId, type, file) {
	return async (dispatch) => {
		dispatch(uploadCommentsLocal(ballotId));
		const formData = new FormData();
		formData.append("BallotID", ballotId);
		formData.append("Type", type);
		formData.append("CommentsFile", file);
		console.log(file)
		try {
			const response = await axios.post('/comments/upload', formData, {headers: {'Content-Type': 'multipart/form-data'}})
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(uploadCommentsFailure()),
					dispatch(setError(response.data.message))
				])
			}
			const {comments, summary} = response.data.data
			return Promise.all([
				dispatch(uploadCommentsSuccess(ballotId, comments)),
				// Update the comments summary for the ballot
				dispatch(updateBallotSuccess(ballotId, {BallotID: ballotId, Comments: summary}))
			])
		}
		catch(error) {
			return Promise.all([
				dispatch(uploadCommentsFailure()),
				dispatch(setError(`Unable to upload comments for ballot ${ballotId}`, error.toString()))
			])
		}
	}
}

const addResolutionLocal = (resolution) => {return {type: ADD_RESOLUTION, resolution}}
const addResolutionSuccess = (data) => {
	return {
		type: 'ADD_RESOLUTION_SUCCESS',
		ballotId: data.BallotID,
		commentId: data.CommentID,
		resolutionId: data.ResolutionID,
		updatedComments: data.updatedComments
	}
}
const addResolutionFailure = () => {return {type: ADD_RESOLUTION_FAILURE}}

export function addResolution(data) {
	return async (dispatch) => {
		dispatch(addResolutionLocal(data));
		try {
			const response = await axios.post('/resolution', data)
			if (response.data.status !== 'OK') {
				await Promise.all([
					dispatch(addResolutionFailure()),
					dispatch(setError(response.data.message))
				])
				return -1
			}
			await dispatch(addResolutionSuccess(response.data.data))
			//console.log(response.data.data)
			return response.data.data.ResolutionID
		}
		catch(error) {
			await Promise.all([
				dispatch(addResolutionFailure()),
				dispatch(setError(`Unable to add resolution ${data.BallotID}/${data.CommentID}/${data.ResolutionID}`, error.toString()))
			])
			return -1
		}
	}
}

const updateResolutionsLocal = (ballotId, resolutions) => {return {type: UPDATE_RESOLUTIONS, ballotId, resolutions}}
const updateResolutionsSuccess = (ballotId, resolutions) => {return {type: UPDATE_RESOLUTIONS_SUCCESS, ballotId, resolutions}}
const updateResolutionsFailure = () => {return {type: UPDATE_RESOLUTIONS_FAILURE}}

export function updateResolutions(ballotId, resolutions) {
	return async (dispatch) => {
		dispatch(updateResolutionsLocal(ballotId, resolutions));
		try {
			const response = await axios.put('/resolutions', {ballotId, resolutions})
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(updateResolutionsFailure()),
					dispatch(setError(response.data.message))
				])
			}
			return dispatch(updateResolutionsSuccess(ballotId, resolutions))
		}
		catch(error) {
			return Promise.all([
				dispatch(updateResolutionsFailure()),
				dispatch(setError(`Unable to update resolutions for ${ballotId}`, error.toString()))
			])
		}
	}
}

const deleteResolutionLocal = (ballotId, commentId, resolutionId) => {return {type: DELETE_RESOLUTION, ballotId, commentId, resolutionId}}
const deleteResolutionSuccess = (data) => {
	return {
		type: DELETE_RESOLUTION_SUCCESS,
		ballotId: data.BallotID,
		commentId: data.CommentID,
		resolutionId: data.ResolutionID,
		updatedComments: data.updatedComments
	}
}
const deleteResolutionFailure = () => {return {type: DELETE_RESOLUTION_FAILURE}}

export function deleteResolution(data) {
	return async (dispatch) => {
		dispatch(deleteResolutionLocal(data))
		try {
			const response = await axios.delete('/resolution', {data: data})
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(deleteResolutionFailure()),
					dispatch(setError(response.data.message))
				])
			}
			return dispatch(deleteResolutionSuccess(response.data.data))
		}
		catch(error) {
			console.log(error)
			return Promise.all([
				dispatch(deleteResolutionFailure()),
				dispatch(setError(`Unable to delete resolution ${data.BallotID}/${data.CommentID}/${data.ResolutionID}`, error.toString()))
			])
		}
	}
}

export function uploadResolutions(ballotId, matchAlgorithm, matchAll, file) {
	return async (dispatch) => {
		dispatch(uploadCommentsLocal(ballotId));
		try {
			var formData = new FormData()
			formData.append("BallotID", ballotId)
			formData.append("matchAlgorithm", matchAlgorithm)
			formData.append("matchAll", matchAll)
			formData.append("ResolutionsFile", file)
			const response = await axios.post('/resolutions/upload', formData, {headers: {'Content-Type': 'multipart/form-data'}})
			if (response.data.status !== 'OK') {
				return Promise.all([
					dispatch(uploadCommentsFailure()),
					dispatch(setError(`Unable to upload resolutions for ballot ${ballotId}`, response.data.message))
				])
			}
			const {comments, summary} = response.data.data
			return Promise.all([
				dispatch(uploadCommentsSuccess(ballotId, comments)),
				dispatch(updateBallotSuccess(ballotId, {BallotID: ballotId, Comments: summary}))
			])
		}
		catch(error) {
			return Promise.all([
				dispatch(uploadCommentsFailure()),
				dispatch(setError(`Unable to upload resolutions for ballot ${ballotId}`, error.toString()))
			])
		}
	}
}
