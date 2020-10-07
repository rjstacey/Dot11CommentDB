import {updateBallotSuccess} from './ballots'
import {setError} from './error'
import fetcher from '../lib/fetcher'

export const GET_COMMENTS = 'GET_COMMENTS'
export const GET_COMMENTS_SUCCESS = 'GET_COMMENTS_SUCCESS'
export const GET_COMMENTS_FAILURE = 'GET_COMMENTS_FAILURE'
export const UPDATE_COMMENTS = 'UPDATE_COMMENTS'
export const UPDATE_COMMENTS_SUCCESS = 'UPDATE_COMMENTS_SUCCESS'
export const UPDATE_COMMENTS_FAILURE = 'UPDATE_COMMENTS_FAILURE'
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


const getCommentsLocal = (ballotId) => ({type: GET_COMMENTS, ballotId})
const getCommentsSuccess = (comments) => ({type: GET_COMMENTS_SUCCESS, comments})
const getCommentsFailure = () => ({type: GET_COMMENTS_FAILURE})

export function getComments(ballotId) {
	return async (dispatch) => {
		dispatch(getCommentsLocal(ballotId))
		try {
			const comments = await fetcher.get(`/api/comments/${ballotId}`)
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

const updateCommentsLocal = (ballotId, commentIds, comments) => ({type: UPDATE_COMMENTS, ballotId, commentIds, comments})
const updateCommentsSuccess = (ballotId, commentIds, comments) => ({type: UPDATE_COMMENTS_SUCCESS, ballotId, commentIds, comments})
const updateCommentsFailure = () => ({type: UPDATE_COMMENTS_FAILURE})

export function updateComments(ballotId, comments) {
	return async (dispatch) => {
		const commentIds = comments.map(c => c.CommentID)
		dispatch(updateCommentsLocal(ballotId, commentIds, comments))
		try {
			const {updatedComments} = await fetcher.put(`/api/comments/${ballotId}`, {commentIds, comments})
			return dispatch(updateCommentsSuccess(ballotId, commentIds, updatedComments))
		}
		catch(error) {
			return Promise.all([
				dispatch(updateCommentsFailure()),
				dispatch(setError(`Unable to update comments for ${ballotId}`, error))
			])
		}
	}
}

const deleteCommentsLocal = (ballotId) => ({type: DELETE_COMMENTS, ballotId})
const deleteCommentsSuccess = (ballotId) => ({type: DELETE_COMMENTS_SUCCESS, ballotId})
const deleteCommentsFailure = (ballotId) => ({type: DELETE_COMMENTS_FAILURE, ballotId})

export function deleteComments(ballotId) {
	return async (dispatch) => {
		dispatch(deleteCommentsLocal(ballotId))
		try {
			await fetcher.delete('/api/comments/BallotId', {BallotID: ballotId})
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

const importCommentsLocal  = (ballotId) => ({type: IMPORT_COMMENTS, ballotId})
const importCommentsSuccess = (ballotId, comments) => ({type: IMPORT_COMMENTS_SUCCESS, ballotId, comments})
const importCommentsFailure = (ballotId) => ({type: IMPORT_COMMENTS_FAILURE, ballotId})

export function importComments(ballotId, epollNum, startCID) {
	return async (dispatch) => {
		dispatch(importCommentsLocal(ballotId))
		try {
			const {comments, summary} = await fetcher.post(`/api/comments/importFromEpoll/${ballotId}/${epollNum}`, {StartCID: startCID})
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

const uploadCommentsLocal = (ballotId) => ({type: UPLOAD_COMMENTS, ballotId})
const uploadCommentsSuccess = (ballotId, comments) => ({type: UPLOAD_COMMENTS_SUCCESS, ballotId, comments})
const uploadCommentsFailure = () => ({type: UPLOAD_COMMENTS_FAILURE})

export function uploadComments(ballotId, type, file) {
	return async (dispatch) => {
		dispatch(uploadCommentsLocal(ballotId))
		try {
			const {comments, summary} = await fetcher.postMultipart(`/api/comments/upload/${ballotId}/${type}`, {CommentsFile: file})
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

const addResolutionsLocal = (ballotId, resolutions) => ({type: ADD_RESOLUTIONS, ballotId, resolutions})
const addResolutionsSuccess = (ballotId, newComments, updatedComments) => ({type: ADD_RESOLUTIONS_SUCCESS, ballotId, newComments, updatedComments})
const addResolutionsFailure = () => ({type: ADD_RESOLUTIONS_FAILURE})

export function addResolutions(ballotId, resolutions) {
	return async (dispatch) => {
		dispatch(addResolutionsLocal(ballotId, resolutions))
		try {
			const response = await fetcher.post(`/api/resolutions/${ballotId}`, resolutions)
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

const updateResolutionsLocal = (ballotId, resolutions) => ({type: UPDATE_RESOLUTIONS, ballotId, resolutions})
const updateResolutionsSuccess = (ballotId, resolutions) => ({type: UPDATE_RESOLUTIONS_SUCCESS, ballotId, resolutions})
const updateResolutionsFailure = () => ({type: UPDATE_RESOLUTIONS_FAILURE})

export function updateResolutions(ballotId, resolutions) {
	return async (dispatch) => {
		dispatch(updateResolutionsLocal(ballotId, resolutions))
		try {
			const response = await fetcher.put(`/api/resolutions/${ballotId}`, {ballotId, resolutions})
			return dispatch(updateResolutionsSuccess(ballotId, response))
		}
		catch(error) {
			return Promise.all([
				dispatch(updateResolutionsFailure()),
				dispatch(setError(`Unable to update resolutions for ${ballotId}`, error))
			])
		}
	}
}

const deleteResolutionsLocal = (ballotId, resolutions) => ({type: DELETE_RESOLUTIONS, ballotId, resolutions})
const deleteResolutionsSuccess = (ballotId, updatedComments) => ({type: DELETE_RESOLUTIONS_SUCCESS, ballotId, updatedComments})
const deleteResolutionsFailure = () => ({type: DELETE_RESOLUTIONS_FAILURE})

export function deleteResolutions(ballotId, resolutions) {
	return async (dispatch) => {
		dispatch(deleteResolutionsLocal(ballotId, resolutions))
		try {
			const response = await fetcher.delete(`/api/resolutions/${ballotId}`, {resolutions})
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

export const FieldsToUpdate = {
	CID: 'cid',
	Comment: 'comment',
	AdHoc: 'adhoc',
	CommentGroup: 'commentgroup',
	Assignee: 'assignee',
	Resolution: 'resolution',
	Editing: 'editing'
}

export const MatchAlgorithm = {
	Ellimination: 'ellimination',
	Perfect: 'perfect',
	CID: 'cid'
}

export function uploadResolutions(ballotId, toUpdate, matchAlgorithm, matchAll, sheetName, file) {
	return async (dispatch) => {
		dispatch(uploadCommentsLocal(ballotId))
		const params = {
			params: JSON.stringify({
				toUpdate,
				matchAlgorithm,
				matchAll,
				sheetName
			}),
			ResolutionsFile: file
		}
		try {
			const {comments, summary, unmatched} = await fetcher.postMultipart(`/api/uploadResolutions/${ballotId}`, params)
			await Promise.all([
				dispatch(uploadCommentsSuccess(ballotId, comments)),
				dispatch(updateBallotSuccess(ballotId, {BallotID: ballotId, Comments: summary}))
			])
			return unmatched
		}
		catch(error) {
			await Promise.all([
				dispatch(uploadCommentsFailure()),
				dispatch(setError(`Unable to upload resolutions for ballot ${ballotId}`, error))
			])
			return null
		}
	}
}

export const CommentsSpreadsheetFormat = {
	MyProject: 'MyProject',
	AllComments: 'AllComments',
	TabPerAdHoc: 'TabPerAdHoc',
	TabPerCommentGroup: 'TabPerCommentGroup'
}

export function exportCommentsSpreadsheet(ballotId, file, format) {
	return async (dispatch) => {
		try {
			let Filename;
			if (file)
				Filename = file.name
			await fetcher.postForFile('/api/comments/exportSpreadsheet', {BallotID: ballotId, Filename, Format: format}, file)
			return null
		}
		catch(error) {
			dispatch(setError(`Unable to export comments for ${ballotId}`, error))
		}
	}
}
