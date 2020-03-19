import {updateBallotSuccess} from './ballots'
import {setError} from './error'
import fetcher from '../lib/fetcher'

export const SET_COMMENTS_FILTERS = 'SET_COMMENTS_FILTERS'
export const SET_COMMENTS_SORT = 'SET_COMMENTS_SORT'
export const SET_COMMENTS_SELECTED = 'SET_COMMENTS_SELECTED'
export const SET_COMMENTS_EXPANDED = 'SET_COMMENTS_EXPANDED'

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

export const ADD_RESOLUTIONS = 'ADD_RESOLUTIONS'
export const ADD_RESOLUTIONS_SUCCESS = 'ADD_RESOLUTIONS_SUCCESS'
export const ADD_RESOLUTIONS_FAILURE = 'ADD_RESOLUTIONS_FAILURE'
export const UPDATE_RESOLUTIONS = 'UPDATE_RESOLUTIONS'
export const UPDATE_RESOLUTIONS_SUCCESS = 'UPDATE_RESOLUTIONS_SUCCESS'
export const UPDATE_RESOLUTIONS_FAILURE = 'UPDATE_RESOLUTIONS_FAILURE'
export const DELETE_RESOLUTIONS = 'DELETE_RESOLUTIONS'
export const DELETE_RESOLUTIONS_SUCCESS = 'DELETE_RESOLUTIONS_SUCCESS'
export const DELETE_RESOLUTIONS_FAILURE = 'DELETE_RESOLUTIONS_FAILURE'


export const setCommentsFilters = (filters) => {return {type: SET_COMMENTS_FILTERS, filters}}
export const setCommentsSort = (sortBy, sortDirection) => {return {type: SET_COMMENTS_SORT, sortBy, sortDirection}}
export const setCommentsSelected = (selected) => {return {type: SET_COMMENTS_SELECTED, selected}}
export const setCommentsExpanded = (expanded) => {return {type: SET_COMMENTS_EXPANDED, expanded}}

const getCommentsLocal = (ballotId) => {return {type: GET_COMMENTS, ballotId}}
const getCommentsSuccess = (comments) => {return {type: GET_COMMENTS_SUCCESS, comments}}
const getCommentsFailure = () => {return {type: GET_COMMENTS_FAILURE}}

export function getComments(ballotId) {
	return async (dispatch) => {
		dispatch(getCommentsLocal(ballotId))
		try {
			const comments = await fetcher.get(`/comments/${ballotId}`)
			return dispatch(getCommentsSuccess(comments))
		}
		catch(error) {
			return Promise.all([
				dispatch(getCommentsFailure()),
				dispatch(setError(`Unable to get comments for ${ballotId}`, error))
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
			const updatedComment = await fetcher.put('/comment', data)
			return dispatch(updateCommentSuccess(updatedComment))
		}
		catch(error) {
			return Promise.all([
				dispatch(updateCommentFailure()),
				dispatch(setError(`Unable to update comment ${data.BallotID}/${data.CommentID}`, error))
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
			await fetcher.delete('/comments/BallotId', {BallotID: ballotId})
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
				dispatch(setError(`Unable to delete comments with ballotId=${ballotId}`, error))
			])
		}
	}
}

const importCommentsLocal  = (ballotId) => {return {type: IMPORT_COMMENTS, ballotId}}
const importCommentsSuccess = (ballotId, comments) => {return {type: IMPORT_COMMENTS_SUCCESS, ballotId, comments}}
const importCommentsFailure = (ballotId) => {return {type: IMPORT_COMMENTS_FAILURE, ballotId}}

export function importComments(ballotId, epollNum, startCID) {
	return async (dispatch) => {
		dispatch(importCommentsLocal(ballotId))
		try {
			const {comments, summary} = await fetcher.post(`/comments/importFromEpoll/${ballotId}/${epollNum}`, {StartCID: startCID})
			return Promise.all([
				dispatch(importCommentsSuccess(ballotId, comments)),
				// Update the comments summary for the ballot
				dispatch(updateBallotSuccess(ballotId, {BallotID: ballotId, Comments: summary}))
			])
		}
		catch(error) {
			return Promise.all([
				dispatch(importCommentsFailure(ballotId)),
				dispatch(setError(`Unable to import comments for ${ballotId}`, error))
			])
		}
	}
}

const uploadCommentsLocal = (ballotId) => {return {type: UPLOAD_COMMENTS, ballotId}}
const uploadCommentsSuccess = (ballotId, comments) => {return {type: UPLOAD_COMMENTS_SUCCESS, ballotId, comments}}
const uploadCommentsFailure = () => {return {type: UPLOAD_COMMENTS_FAILURE}}

export function uploadComments(ballotId, type, file) {
	return async (dispatch) => {
		dispatch(uploadCommentsLocal(ballotId))
		try {
			const {comments, summary} = await fetcher.postMultipart(`/comments/upload/${ballotId}/${type}`, {CommentsFile: file})
			return Promise.all([
				dispatch(uploadCommentsSuccess(ballotId, comments)),
				// Update the comments summary for the ballot
				dispatch(updateBallotSuccess(ballotId, {BallotID: ballotId, Comments: summary}))
			])
		}
		catch(error) {
			return Promise.all([
				dispatch(uploadCommentsFailure()),
				dispatch(setError(`Unable to upload comments for ${ballotId}`, error))
			])
		}
	}
}

const addResolutionsLocal = (ballotId, resolutions) => {return {type: ADD_RESOLUTIONS, ballotId, resolutions}}
const addResolutionsSuccess = (ballotId, newComments, updatedComments) => {return {type: ADD_RESOLUTIONS_SUCCESS, ballotId, newComments, updatedComments}}
const addResolutionsFailure = () => {return {type: ADD_RESOLUTIONS_FAILURE}}

export function addResolutions(ballotId, resolutions) {
	return async (dispatch) => {
		dispatch(addResolutionsLocal(ballotId, resolutions))
		try {
			const response = await fetcher.post(`/resolutions/${ballotId}`, resolutions)
			await dispatch(addResolutionsSuccess(ballotId, response.newComments, response.updatedComments))
			return response.newComments
		}
		catch(error) {
			await Promise.all([
				dispatch(addResolutionsFailure()),
				dispatch(setError(`Unable to add resolutions`, error))
			])
			return null
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
			await fetcher.put(`/resolutions/${ballotId}`, {ballotId, resolutions})
			return dispatch(updateResolutionsSuccess(ballotId, resolutions))
		}
		catch(error) {
			return Promise.all([
				dispatch(updateResolutionsFailure()),
				dispatch(setError(`Unable to update resolutions for ${ballotId}`, error))
			])
		}
	}
}

const deleteResolutionsLocal = (ballotId, resolutions) => {return {type: DELETE_RESOLUTIONS, ballotId, resolutions}}
const deleteResolutionsSuccess = (ballotId, updatedComments) => {return {type: DELETE_RESOLUTIONS_SUCCESS, ballotId, updatedComments}}
const deleteResolutionsFailure = () => {return {type: DELETE_RESOLUTIONS_FAILURE}}

export function deleteResolutions(ballotId, resolutions) {
	return async (dispatch) => {
		dispatch(deleteResolutionsLocal(ballotId, resolutions))
		try {
			const response = await fetcher.delete(`/resolutions/${ballotId}`, {resolutions})
			return dispatch(deleteResolutionsSuccess(ballotId, response.updatedComments))
		}
		catch(error) {
			console.log(error)
			return Promise.all([
				dispatch(deleteResolutionsFailure()),
				dispatch(setError(`Unable to delete resolutions`, error))
			])
		}
	}
}

export function uploadResolutions(ballotId, matchAlgorithm, matchAll, file) {
	return async (dispatch) => {
		dispatch(uploadCommentsLocal(ballotId))
		const params = {
			BallotID: ballotId,
			matchAlgorithm,
			matchAll,
			ResolutionsFile: file
		}
		try {
			const {comments, summary} = await fetcher.postMultipart('/resolutions/upload', params)
			return Promise.all([
				dispatch(uploadCommentsSuccess(ballotId, comments)),
				dispatch(updateBallotSuccess(ballotId, {BallotID: ballotId, Comments: summary}))
			])
		}
		catch(error) {
			return Promise.all([
				dispatch(uploadCommentsFailure()),
				dispatch(setError(`Unable to upload resolutions for ballot ${ballotId}`, error))
			])
		}
	}
}
