import {createSlice} from '@reduxjs/toolkit'

import {setError} from './error'
import fetcher from './lib/fetcher'

import sortReducer, {sortInit, SortDirection} from './sort'
import {SortType} from './lib/sort'
import filtersReducer, {filtersInit, FilterType} from './filters'
import selectedReducer, {setSelected} from './selected'
import expandedReducer, {setExpanded} from './expanded'
import uiReducer from './ui'

import {updateBallotSuccess} from './ballots'

const commentFields = {
	CID: 'CID',
	CommenterName: 'Commenter',
	Vote: 'Vote',
	MustSatisfy: 'Must Satisfy',
	Category: 'Category',
	Clause: 'Clause',
	Page: 'Page',
	Comment: 'Comment',
	ProposedChange: 'Proposed Change',
	AdHoc: 'Ad-hoc',
	CommentGroup: 'Group',
	AssigneeName: 'Assignee',
	Submission: 'Submission',
	Status: 'Status',
	ApprovedByMotion: 'Motion Number',
	ResnStatus: 'Resn Status',
	Resolution: 'Resolution',
	EditStatus: 'Editing Status',
	EditInDraft: 'In Draft',
	EditNotes: 'Editing Notes'
}

/*
 * Generate a filter for each field (table column)
 */
const defaultFiltersEntries = Object.keys(commentFields).reduce((entries, dataKey) => {
	let options
	if (dataKey === 'MustSatisfy')
		options = [{value: 0, label: 'No'}, {value: 1, label: 'Yes'}]
	return {...entries, [dataKey]: {options}}
}, {});


/*
 * Generate object that describes the initial sort state
 */
const defaultSortEntries = Object.keys(commentFields).reduce((entries, dataKey) => {
	let type
	switch (dataKey) {
		case 'CommentID':
		case 'CID':
		case 'Page':
			type = SortType.NUMERIC
			break
		case 'Clause':
			type = SortType.CLAUSE
			break
		default:
			type = SortType.STRING
	}
	const direction = SortDirection.NONE;
	return {...entries, [dataKey]: {type, direction}}
}, {});


const doCommentsUpdate = (comments, updatedComments) => (
	/* Replace comments with the modified CommentID, maintaining increasing CommentID order */
	comments
		.filter(c1 => !updatedComments.find(c2 => c2.comment_id === c1.comment_id))
		.concat(updatedComments)
		.sort((c1, c2) => c1.CommentID === c2.CommentID? c1.ResolutionID - c2.ResolutionID: c1.CommentID - c2.CommentID)
)

function getCommentStatus(c) {
	let Status = ''
	if (c.ApprovedByMotion)
		Status = 'Resolution approved'
	else if (c.ReadyForMotion)
		Status = 'Ready for motion'
	else if (c.ResnStatus)
		Status = 'Resolution drafted'
	else if (c.AssigneeName)
		Status = 'Assigned'
	return Status
}

const updateCommentsStatus = (comments) => (
	comments.map(c => {
		const Status = getCommentStatus(c)
		return c.Status !== Status? {...c, Status}: c
	})
)

const dataSet = 'comments';

const commentsSlice = createSlice({
	name: dataSet,
	initialState: {
		ballotId: '',
		valid: false,
		loading: false,
		comments: [],
		sort: sortReducer(undefined, sortInit(defaultSortEntries)),
		filters: filtersReducer(undefined, filtersInit(defaultFiltersEntries)),
		selected: selectedReducer(undefined, {}),
		expanded: expandedReducer(undefined, {}),
		ui: uiReducer(undefined, {})
	},
	reducers: {
		getPending(state, action) {
			const {ballotId} = action.payload;
			state.loading = true;
			state.ballotId = ballotId;
		},
  		getSuccess(state, action) {
  			const {comments} = action.payload;
			state.loading = false;
			state.valid = true;
			state.comments = updateCommentsStatus(comments)
		},
		getFailure(state, action) {
			state.loading = false;
		},
		updateMany(state, action) {
			const {comments} = action.payload;
			let newComments = state.comments.map(c1 => {
				const c2 = comments.find(c2 => c2.id === c1.id)
				return c2? {...c1, ...c2}: c1
			});
			newComments = updateCommentsStatus(newComments);
			state.comments = newComments;
		},
		deleteAll(state, action) {
			const {ballotId} = actions.payload;
			if (state.ballotId === ballotId) {
				state.comments = [];
				state.valid = false;
			}
		},
		updatePending(state, action) {
			state.updateComment = true;
		},
		updateFailure(state, action) {
			state.updateComment = false;
		},
		addResolutions(state, action) {
			// Concat new comments
			const {comments} = actions.payload;
			let newComments = doCommentsUpdate(state.comments, comments);
			newComments = updateCommentsStatus(newComments);
			state.comments = newComments;
			state.updateComment = false;
		},
		updateResolutions(state, action) {
			const {comments} = actions.payload;
			let newComments = state.comments.map(c1 => {
				const c2 = comments.find(c2 => c1.resolution_id === c2.resolution_id)
				return c2? {...c1, ...c2}: c1;
			})
			newComments = updateCommentsStatus(newComments);
			state.comments = newComments;
			state.updateComment = false;
		},
		deleteResolutions(state, action) {
			const {comments} = actions.payload;
			let newComments = doCommentsUpdate(state.comments, comments)
			newComments = updateCommentsStatus(newComments)
			state.comments = newComments;
			state.updateComment = false;
		}
	},
	extraReducers: builder => {
		builder
		.addMatcher(
			(action) => action.type.startsWith(dataSet + '/'),
			(state, action) => {
				const sliceAction = {...action, type: action.type.replace(dataSet + '/', '')}
				state.sort = sortReducer(state.sort, sliceAction);
				state.filters = filtersReducer(state.filters, sliceAction);
				state.selected = selectedReducer(state.selected, sliceAction);
				state.ui = uiReducer(state.ui, sliceAction);
			}
		)
	}
});

/*
 * Export reducer as default
 */
export default commentsSlice.reducer;

/*
 * Actions
 */
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

const {getPending, getSuccess, getFailure} = commentsSlice.actions;

export function getComments(ballotId) {
	return async (dispatch, getState) => {
		dispatch(getPending({ballotId}));
		let comments;
		try {
			comments = await fetcher.get(`/api/comments/${ballotId}`)
		}
		catch(error) {
			return Promise.all([
				dispatch(getFailure({ballotId})),
				dispatch(setError(`Unable to get comments for ${ballotId}`, error))
			]);
		}
		const promises = []
		promises.push(dispatch(getSuccess({ballotId, comments})))
		const {selected, expanded} = getState()[dataSet]
		const newSelected = updateIdList(comments, selected)
		if (newSelected !== selected)
			promises.push(dispatch(setSelected(dataSet, newSelected)))
		const newExpanded = updateIdList(comments, expanded)
		if (newExpanded !== expanded)
			promises.push(dispatch(setExpanded(dataSet, newExpanded)))
		return Promise.all(promises)
	}
}

const {updatePending, updateFailure, updateMany} = commentsSlice.actions;

export function updateComments(comments) {
	return async (dispatch) => {
		dispatch(updatePending({ballotId}))
		let response;
		try {
			response = await fetcher.put(`/api/comments`, {comments})
		}
		catch(error) {
			return Promise.all([
				dispatch(updateFailure({ballotId})),
				dispatch(setError(`Unable to update comment${comments.length > 1? 's': ''}`, error))
			])
		}
		const {comments} = response;
		return dispatch(updateMany({comments}))
	}
}

export function deleteComments(ballotId) {
	return async (dispatch, getState) => {
		dispatch(updatePending({ballotId}))
		try {
			await fetcher.delete(`/api/comments/${ballotId}`)
		}
		catch(error) {
			return Promise.all([
				dispatch(updateFailure({ballotId})),
				dispatch(setError(`Unable to delete comments with ballotId=${ballotId}`, error))
			])
		}
		const promises = []
		const {selected, expanded} = getState()[dataSet]
		if (selected.length)
			promises.push(dispatch(setSelected(dataSet, [])))
		if (expanded.length)
			promises.push(dispatch(setExpanded(dataSet, [])))
		promises.push(dispatch(deleteAll({ballotId})))
		const summary = {Count: 0, CommentIDMin: 0, CommentIDMax: 0}
		promises.push(updateBallotSuccess(ballotId, {BallotID: ballotId, Comments: summary}))
		return Promise.all(promises)
	}
}

export function importComments(ballotId, epollNum, startCID) {
	return async (dispatch) => {
		dispatch(updatePending({ballotId}))
		let response;
		try {
			response = await fetcher.post(`/api/comments/importFromEpoll/${ballotId}/${epollNum}`, {StartCID: startCID})
		}
		catch(error) {
			return Promise.all([
				dispatch(updateFailure({ballotId})),
				dispatch(setError(`Unable to import comments for ${ballotId}`, error))
			])
		}
		const {comments, summary} = response;
		return Promise.all([
			dispatch(getSuccess({ballotId, comments})),
			// Update the comments summary for the ballot
			dispatch(updateBallotSuccess(ballotId, {BallotID: ballotId, Comments: summary}))
		])
	}
}

export function uploadComments(ballotId, type, file) {
	return async (dispatch) => {
		dispatch(updatePending({ballotId}));
		let response;
		try {
			response = await fetcher.postMultipart(`/api/comments/upload/${ballotId}/${type}`, {CommentsFile: file})
			
		}
		catch(error) {
			return Promise.all([
				dispatch(updateFailure({ballotId})),
				dispatch(setError(`Unable to upload comments for ${ballotId}`, error))
			])
		}
		const {comments, summary} = response;
		return Promise.all([
			dispatch(getSuccess({ballotId, comments})),
			// Update the comments summary for the ballot
			dispatch(updateBallotSuccess(ballotId, {BallotID: ballotId, Comments: summary}))
		])
	}
}

export function setStartCommentId(ballotId, startCommentId) {
	return async (dispatch, getState) => {
		dispatch(updatePending({ballotId}))
		let comments;
		try {
			comments = await fetcher.patch(`/api/comments/startCommentId/${ballotId}`, {StartCommentID: startCommentId})
		}
		catch(error) {
			return Promise.all([
				dispatch(updateFailure({ballotId})),
				dispatch(setError(`Unable to start CID for ${ballotId}`, error))
			]);
		}
		return Promise.all([
			dispatch(setSelected(dataSet, [])),
			dispatch(setExpanded(dataSet, [])),
			dispatch(getSuccess({ballotId, comments}))
		]);
	}
}

export function addResolutions(resolutions) {
	return async (dispatch, getState) => {
		dispatch(updatePending())
		let response;
		try {
			response = await fetcher.post('/api/resolutions', {resolutions})
			if (!response.hasOwnProperty('comments') || !Array.isArray(response.comments))
				throw new TypeError('Missing comments array in response')
			if (!response.hasOwnProperty('newCIDs') || !Array.isArray(response.newCIDs))
				throw new TypeError('Missing newCIDs array in response')
		}
		catch(error) {
			await Promise.all([
				dispatch(updateFailure()),
				dispatch(setError('Unable to add resolutions', error))
			])
			return null
		}
		await dispatch(addResolutions(response))

		const promises = []
		const {comments, expanded} = getState()[dataSet]
		const newSelected = response.newCIDs;
		promises.push(dispatch(setSelected(dataSet, newSelected)))
		const newExpanded = updateIdList(comments, expanded)
		if (newExpanded !== expanded)
			promises.push(dispatch(setExpanded(dataSet, newExpanded)))
		await Promise.all(promises)
		return response.newComments
	}
}

export function updateResolutions(resolutions) {
	return async (dispatch, getState) => {
		dispatch(updatePending())
		let response;
		try {
			response = await fetcher.put('/api/resolutions', {resolutions})
		}
		catch(error) {
			return Promise.all([
				dispatch(updateFailure()),
				dispatch(setError(`Unable to update resolution${resolutions.length > 1? 's': ''}`, error))
			])
		}
		await dispatch(updateResolutions(response));

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
}

const deleteResolutionsLocal = (resolutions) => ({type: RESOLUTIONS_DELETE, resolutions})
const deleteResolutionsSuccess = (comments) => ({type: RESOLUTIONS_DELETE_SUCCESS, comments})
const deleteResolutionsFailure = () => ({type: RESOLUTIONS_DELETE_FAILURE})

export function deleteResolutions(resolutions) {
	return async (dispatch, getState) => {
		dispatch(updatePending())
		let response;
		try {
			response = await fetcher.delete(`/api/resolutions`, {resolutions})
			if (!response.hasOwnProperty('comments') || !Array.isArray(response.comments))
				throw new TypeError('Missing comments array in response')
		}
		catch(error) {
			console.log(error)
			return Promise.all([
				dispatch(updateFailure()),
				dispatch(setError(`Unable to delete resolution${resolutions.length > 1? 's': ''}`, error))
			])
		}
		await dispatch(deleteResolutions(response))

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
}

export const FieldsToUpdate = {
	CID: 'cid',
	ClausePage: 'clausepage',
	AdHoc: 'adhoc',
	CommentGroup: 'commentgroup',
	Assignee: 'assignee',
	Resolution: 'resolution',
	Editing: 'editing'
}

export const MatchAlgorithm = {
	Elimination: 'elimination',
	Comment: 'comment',
	CID: 'cid'
}

export const MatchUpdate = {
	All: 'all',
	Any: 'any',
	Add: 'add'
}

export function uploadResolutions(ballotId, toUpdate, matchAlgorithm, matchUpdate, sheetName, file) {
	return async (dispatch) => {
		dispatch(updatePending({ballotId}))
		const params = {
			params: JSON.stringify({
				toUpdate,
				matchAlgorithm,
				matchUpdate,
				sheetName
			}),
			ResolutionsFile: file
		}
		let response;
		try {
			response = await fetcher.postMultipart(`/api/resolutions/upload/${ballotId}`, params)
		}
		catch (error) {
			await Promise.all([
				dispatch(updateFailure({ballotId})),
				dispatch(setError(`Unable to upload resolutions for ballot ${ballotId}`, error))
			])
			return null
		}
		const {comments, summary, matched, unmatched, added, remaining, updated} = response;
		await Promise.all([
			dispatch(getSuccess({ballotId, comments})),
			dispatch(updateBallotSuccess(ballotId, {BallotID: ballotId, Comments: summary}))
		])
		return {matched, unmatched, added, remaining, updated};
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