import {updateBallotSuccess} from './ballots'
import {setError} from './error'
import fetcher from '../lib/fetcher'
import {setSelected} from './select'
import {setExpanded} from './expand'

export const dataSet = 'comments'

export const COMMENTS_PREFIX = 'COMMENTS_'

export const COMMENTS_GET = COMMENTS_PREFIX + 'GET'
export const COMMENTS_GET_SUCCESS = COMMENTS_PREFIX + 'GET_SUCCESS'
export const COMMENTS_GET_FAILURE = COMMENTS_PREFIX + 'GET_FAILURE'

export const COMMENTS_UPDATE = COMMENTS_PREFIX + 'UPDATE'
export const COMMENTS_UPDATE_SUCCESS = COMMENTS_PREFIX + 'UPDATE_SUCCESS'
export const COMMENTS_UPDATE_FAILURE = COMMENTS_PREFIX + 'UPDATE_FAILURE'

export const COMMENTS_DELETE = COMMENTS_PREFIX + 'DELETE'
export const COMMENTS_DELETE_SUCCESS = COMMENTS_PREFIX + 'DELETE_SUCCESS'
export const COMMENTS_DELETE_FAILURE = COMMENTS_PREFIX + 'DELETE_FAILURE'

export const COMMENTS_IMPORT = COMMENTS_PREFIX + 'IMPORT'
export const COMMENTS_IMPORT_SUCCESS = COMMENTS_PREFIX + 'IMPORT_SUCCESS'
export const COMMENTS_IMPORT_FAILURE = COMMENTS_PREFIX + 'IMPORT_FAILURE'

export const COMMENTS_UPLOAD = COMMENTS_PREFIX + 'UPLOAD'
export const COMMENTS_UPLOAD_SUCCESS = COMMENTS_PREFIX + 'UPLOAD_SUCCESS'
export const COMMENTS_UPLOAD_FAILURE = COMMENTS_PREFIX + 'UPLOAD_FAILURE'

export const COMMENTS_SET_START_COMMENTID = COMMENTS_PREFIX + 'SET_START_COMMENTID'
export const COMMENTS_SET_START_COMMENTID_SUCCESS = COMMENTS_PREFIX + 'SET_START_COMMENTID_SUCCESS'
export const COMMENTS_SET_START_COMMENTID_FAILURE = COMMENTS_PREFIX + 'SET_START_COMMENTID_FAILURE'

export const ADD_RESOLUTIONS = 'ADD_RESOLUTIONS'
export const ADD_RESOLUTIONS_SUCCESS = 'ADD_RESOLUTIONS_SUCCESS'
export const ADD_RESOLUTIONS_FAILURE = 'ADD_RESOLUTIONS_FAILURE'
export const UPDATE_RESOLUTIONS = 'UPDATE_RESOLUTIONS'
export const UPDATE_RESOLUTIONS_SUCCESS = 'UPDATE_RESOLUTIONS_SUCCESS'
export const UPDATE_RESOLUTIONS_FAILURE = 'UPDATE_RESOLUTIONS_FAILURE'
export const DELETE_RESOLUTIONS = 'DELETE_RESOLUTIONS'
export const DELETE_RESOLUTIONS_SUCCESS = 'DELETE_RESOLUTIONS_SUCCESS'
export const DELETE_RESOLUTIONS_FAILURE = 'DELETE_RESOLUTIONS_FAILURE'


function updateIdList(comments, selected) {
	const changed = selected.reduce(
		(result, id) => result || !comments.find(c => c.CID === id),
		false
	);

	if (!changed)
		return selected

	let newSelected = []
	for (let s of selected) {
		if (comments.find(c => c.CID === s)) {
			// Keep it if it matches a comment exactly
			newSelected.push(s)
		}
		else {
			// If it is just the comment ID, then keep CIDs for all those comments
			const cids = comments.filter(c => c.CommentID.toString() === s).map(c => c.CID)
			newSelected = newSelected.concat(cids)
		}
	}
	return newSelected
}

const getCommentsLocal = (ballotId) => ({type: COMMENTS_GET, ballotId})
const getCommentsSuccess = (comments) => ({type: COMMENTS_GET_SUCCESS, comments})
const getCommentsFailure = () => ({type: COMMENTS_GET_FAILURE})

export function getComments(ballotId) {
	return async (dispatch, getState) => {
		if (getState()[dataSet].ballotId !== ballotId) {
			// If we get comments for a different ballot then the selected and expaded arrays no longer apply
			dispatch(setSelected(dataSet, []));
			dispatch(setExpanded(dataSet, []));
		}
		dispatch(getCommentsLocal(ballotId));
		try {
			const comments = await fetcher.get(`/api/comments/${ballotId}`)
			const promises = []
			const {selected, expanded} = getState()[dataSet]
			const newSelected = updateIdList(comments, selected)
			if (newSelected !== selected)
				promises.push(dispatch(setSelected(dataSet, newSelected)))
			const newExpanded = updateIdList(comments, expanded)
				promises.push(dispatch(setExpanded(dataSet, newExpanded)))
			promises.push(dispatch(getCommentsSuccess(comments)))
			return Promise.all(promises)
		}
		catch(error) {
			return Promise.all([
				dispatch(getCommentsFailure()),
				dispatch(setError(`Unable to get comments for ${ballotId}`, error))
			])
		}
	}
}

const updateCommentsLocal = (ballotId, commentIds, comments) => ({type: COMMENTS_UPDATE, ballotId, commentIds, comments})
const updateCommentsSuccess = (ballotId, commentIds, comments) => ({type: COMMENTS_UPDATE_SUCCESS, ballotId, commentIds, comments})
const updateCommentsFailure = () => ({type: COMMENTS_UPDATE_FAILURE})

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

const deleteCommentsLocal = (ballotId) => ({type: COMMENTS_DELETE, ballotId})
const deleteCommentsSuccess = (ballotId) => ({type: COMMENTS_DELETE_SUCCESS, ballotId})
const deleteCommentsFailure = (ballotId) => ({type: COMMENTS_DELETE_FAILURE, ballotId})

export function deleteComments(ballotId) {
	return async (dispatch, getState) => {
		dispatch(deleteCommentsLocal(ballotId))
		try {
			await fetcher.delete('/api/comments/BallotId', {BallotID: ballotId})
			const promises = []
			const {selected, expanded} = getState()[dataSet]
			if (selected.length)
				promises.push(dispatch(setSelected(dataSet, [])))
			if (expanded.length)
				promises.push(dispatch(setExpanded(dataSet, [])))
			promises.push(dispatch(deleteCommentsSuccess(ballotId)))
			const summary = {Count: 0, CommentIDMin: 0, CommentIDMax: 0}
			promises.push(updateBallotSuccess(ballotId, {BallotID: ballotId, Comments: summary}))
			return Promise.all(promises)
		}
		catch(error) {
			return Promise.all([
				dispatch(deleteCommentsFailure(ballotId)),
				dispatch(setError(`Unable to delete comments with ballotId=${ballotId}`, error))
			])
		}
	}
}

const importCommentsLocal  = (ballotId) => ({type: COMMENTS_IMPORT, ballotId})
const importCommentsSuccess = (ballotId, comments) => ({type: COMMENTS_IMPORT_SUCCESS, ballotId, comments})
const importCommentsFailure = (ballotId) => ({type: COMMENTS_IMPORT_FAILURE, ballotId})

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

const uploadCommentsLocal = (ballotId) => ({type: COMMENTS_UPLOAD, ballotId})
const uploadCommentsSuccess = (ballotId, comments) => ({type: COMMENTS_UPLOAD_SUCCESS, ballotId, comments})
const uploadCommentsFailure = () => ({type: COMMENTS_UPLOAD_FAILURE})

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

const setStartCommentIdLocal = (ballotId, startCommentId) => ({type: COMMENTS_SET_START_COMMENTID, ballotId, startCommentId})
const setStartCommentIdFailure = () => ({type: COMMENTS_SET_START_COMMENTID_FAILURE})

export function setStartCommentId(ballotId, startCommentId) {
	return async (dispatch, getState) => {
		dispatch(setStartCommentIdLocal(ballotId, startCommentId))
		try {
			const comments = await fetcher.patch(`/api/comments/startCommentId/${ballotId}`, {StartCommentID: startCommentId})
			return Promise.all([
				dispatch(setSelected(dataSet, [])),
				dispatch(setExpanded(dataSet, [])),
				dispatch(getCommentsSuccess(comments))
			]);
		}
		catch(error) {
			return Promise.all([
				dispatch(setStartCommentIdFailure()),
				dispatch(setError(`Unable to start CID for ${ballotId}`, error))
			]);
		}
	}
}

const addResolutionsLocal = (ballotId, resolutions) => ({type: ADD_RESOLUTIONS, ballotId, resolutions})
const addResolutionsSuccess = (ballotId, newComments, updatedComments) => ({type: ADD_RESOLUTIONS_SUCCESS, ballotId, newComments, updatedComments})
const addResolutionsFailure = () => ({type: ADD_RESOLUTIONS_FAILURE})

export function addResolutions(ballotId, resolutions) {
	return async (dispatch, getState) => {
		dispatch(addResolutionsLocal(ballotId, resolutions))
		try {
			const response = await fetcher.post(`/api/resolutions/${ballotId}`, resolutions)
			await dispatch(addResolutionsSuccess(ballotId, response.newComments, response.updatedComments))

			const promises = []
			const {comments, expanded} = getState()[dataSet]
			const newSelected = response.newComments.map(c => c.CID)
			promises.push(dispatch(setSelected(dataSet, newSelected)))
			const newExpanded = updateIdList(comments, expanded)
			if (newExpanded !== expanded)
				promises.push(dispatch(setExpanded(dataSet, newExpanded)))
			await Promise.all(promises)
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
	return async (dispatch, getState) => {
		dispatch(updateResolutionsLocal(ballotId, resolutions))
		try {
			const response = await fetcher.put(`/api/resolutions/${ballotId}`, {ballotId, resolutions})
			await dispatch(updateResolutionsSuccess(ballotId, response))

			const promises = []
			const {comments, selected, expanded} = getState()[dataSet]
			const newSelected = updateIdList(comments, selected)
			if (newSelected !== selected)
				promises.push(dispatch(setSelected(dataSet, newSelected)))
			const newExpanded = updateIdList(comments, expanded)
			if (newExpanded !== expanded)
				promises.push(dispatch(setExpanded(dataSet, newExpanded)))
			return Promise.all(promises)
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
const deleteResolutionsSuccess = (ballotId, deletedComments, updatedComments) => ({type: DELETE_RESOLUTIONS_SUCCESS, ballotId, deletedComments, updatedComments})
const deleteResolutionsFailure = () => ({type: DELETE_RESOLUTIONS_FAILURE})

export function deleteResolutions(ballotId, resolutions) {
	return async (dispatch, getState) => {
		dispatch(deleteResolutionsLocal(ballotId, resolutions))
		try {
			const response = await fetcher.delete(`/api/resolutions/${ballotId}`, {resolutions})
			await dispatch(deleteResolutionsSuccess(ballotId, resolutions, response.updatedComments))
			const promises = []
			const {comments, selected, expanded} = getState()[dataSet]
			const newSelected = updateIdList(comments, selected)
			if (newSelected !== selected)
				promises.push(dispatch(setSelected(dataSet, newSelected)))
			const newExpanded = updateIdList(comments, expanded)
			if (newExpanded !== expanded)
				promises.push(dispatch(setExpanded(dataSet, newExpanded)))
			return Promise.all(promises)
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
	Elimination: 'elimination',
	Perfect: 'perfect',
	CID: 'cid'
}

export const MatchUpdate = {
	All: 'all',
	Any: 'any',
	Add: 'add'
}

export function uploadResolutions(ballotId, toUpdate, matchAlgorithm, matchUpdate, sheetName, file) {
	return async (dispatch) => {
		dispatch(uploadCommentsLocal(ballotId))
		const params = {
			params: JSON.stringify({
				toUpdate,
				matchAlgorithm,
				matchUpdate,
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
			const url = '/api/comments/' + (format === CommentsSpreadsheetFormat.MyProject? 'exportForMyProject': 'exportSpreadsheet')
			await fetcher.postForFile(url, {BallotID: ballotId, Filename, Format: format}, file)
			return null
		}
		catch(error) {
			dispatch(setError(`Unable to export comments for ${ballotId}`, error))
		}
	}
}
