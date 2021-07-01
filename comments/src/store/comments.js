import {createSlice, createEntityAdapter} from '@reduxjs/toolkit'

import fetcher from 'dot11-common/lib/fetcher'
import sortsSlice, {sortInit, SortDirection, SortType} from 'dot11-common/store/sort'
import filtersSlice, {filtersInit, FilterType} from 'dot11-common/store/filters'
import selectedSlice, {setSelected} from 'dot11-common/store/selected'
import expandedSlice, {setExpanded} from 'dot11-common/store/expanded'
import uiSlice from 'dot11-common/store/ui'
import {getData} from 'dot11-common/store/dataSelectors'
import {setError} from 'dot11-common/store/error'

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
	Notes: 'Notes',
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

const updateCommentsStatus = (comments) =>
	comments.map(c => {
		const Status = getCommentStatus(c)
		return c.Status !== Status? {...c, Status}: c
	});

/*
 * Remove entries that no longer exist from a list. If there
 * are no changes, return the original list.
 */
function filterIdList(idList, allIds) {
	const newList = idList.filter(id => allIds.includes(id));
	return newList.length === idList.length? idList: newList;
}

const dataAdapter = createEntityAdapter({
	selectId: (c) => c.CID,
	sortComparer: (c1, c2) => c1.CommentID === c2.CommentID? c1.ResolutionID - c2.ResolutionID: c1.CommentID - c2.CommentID 
})

const dataSet = 'comments';

const slice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		ballotId: '',
		valid: false,
		loading: false,
		[sortsSlice.name]: sortsSlice.reducer(undefined, sortInit(defaultSortEntries)),
		[filtersSlice.name]: filtersSlice.reducer(undefined, filtersInit(defaultFiltersEntries)),
		[selectedSlice.name]: selectedSlice.reducer(undefined, {}),
		[expandedSlice.name]: expandedSlice.reducer(undefined, {}),
		[uiSlice.name]: uiSlice.reducer(undefined, {})
	}),
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
			dataAdapter.setAll(state, updateCommentsStatus(comments));
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
			state[expandedSlice.name] = filterIdList(state[expandedSlice.name], state.ids);
		},
		getFailure(state, action) {
			state.loading = false;
		},
		updateMany(state, action) {
			const {comments} = action.payload;
			const updates = comments.map(c => ({id: c.CID, changes: c}));
			dataAdapter.updateMany(state, updates);
		},
		deleteAll(state, action) {
			const {ballotId} = actions.payload;
			if (state.ballotId === ballotId) {
				dataAdapter.setAll(state, []);
				state.valid = false;
				state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
				state[expandedSlice.name] = filterIdList(state[expandedSlice.name], state.ids);
			}
		},
		updatePending(state, action) {
			state.updateComment = true;
		},
		updateFailure(state, action) {
			state.updateComment = false;
		},
		afterAddOrDeleteResolutions(state, action) {
			// Concat new comments
			const {comments} = action.payload;
			let newComments = [];
			for (const id of state.ids) {
				const c1 = state.entities[id];
				if (!comments.find(c2 => c2.comment_id === c1.comment_id))
					newComments.push(c1);
			}
			newComments = newComments.concat(comments);
			dataAdapter.setAll(state, newComments);
			state.updateComment = false;
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
			state[expandedSlice.name] = filterIdList(state[expandedSlice.name], state.ids);
		},
		afterUpdateResolutions(state, action) {
			const {comments} = action.payload;
			const updates = updateCommentsStatus(comments).map(c => ({id: c.CID, changes: c}));
			dataAdapter.updateMany(state, updates);
			state.updateComment = false;
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
			state[expandedSlice.name] = filterIdList(state[expandedSlice.name], state.ids);
		}
	},
	extraReducers: builder => {
		builder
		.addMatcher(
			(action) => action.type.startsWith(dataSet + '/'),
			(state, action) => {
				const sliceAction = {...action, type: action.type.replace(dataSet + '/', '')}
				state[sortsSlice.name] = sortsSlice.reducer(state[sortsSlice.name], sliceAction);
				state[filtersSlice.name] = filtersSlice.reducer(state[filtersSlice.name], sliceAction);
				state[selectedSlice.name] = selectedSlice.reducer(state[selectedSlice.name], sliceAction);
				state[expandedSlice.name] = expandedSlice.reducer(state[expandedSlice.name], sliceAction);
				state[uiSlice.name] = uiSlice.reducer(state[uiSlice.name], sliceAction);
			}
		)
	}
});

/*
 * Export reducer as default
 */
export default slice.reducer;

/*
 * Actions
 */

const {getPending, getSuccess, getFailure} = slice.actions;

export const loadComments = (ballotId) =>
	async (dispatch, getState) => {
		dispatch(getPending({ballotId}));
		let comments;
		try {
			comments = await fetcher.get(`/api/comments/${ballotId}`)
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure({ballotId})),
				dispatch(setError(`Unable to get comments for ${ballotId}`, error))
			]);
			return;
		}
		await dispatch(getSuccess({ballotId, comments}));
	}

const {updatePending, updateFailure, updateMany} = slice.actions;

export const updateComments = (comments) =>
	async (dispatch) => {
		dispatch(updatePending())
		let response;
		try {
			response = await fetcher.put(`/api/comments`, {comments})
		}
		catch(error) {
			await Promise.all([
				dispatch(updateFailure()),
				dispatch(setError(`Unable to update comment${comments.length > 1? 's': ''}`, error))
			]);
			return;
		}
		await dispatch(updateMany(response));
	}

export const deleteComments = (ballotId) =>
	async (dispatch, getState) => {
		dispatch(updatePending({ballotId}))
		try {
			await fetcher.delete(`/api/comments/${ballotId}`)
		}
		catch(error) {
			await Promise.all([
				dispatch(updateFailure({ballotId})),
				dispatch(setError(`Unable to delete comments with ballotId=${ballotId}`, error))
			]);
			return;
		}
		await dispatch(deleteAll({ballotId}));
		const summary = {Count: 0, CommentIDMin: 0, CommentIDMax: 0}
		await updateBallotSuccess(ballotId, {BallotID: ballotId, Comments: summary});
	}

export const importComments = (ballotId, epollNum, startCID) =>
	async (dispatch) => {
		dispatch(updatePending({ballotId}))
		let response;
		try {
			response = await fetcher.post(`/api/comments/importFromEpoll/${ballotId}/${epollNum}`, {StartCID: startCID})
		}
		catch(error) {
			await Promise.all([
				dispatch(updateFailure({ballotId})),
				dispatch(setError(`Unable to import comments for ${ballotId}`, error))
			]);
			return;
		}
		const {comments, ballot} = response;
		await Promise.all([
			dispatch(getSuccess({ballotId, comments})),
			// Update the comments summary for the ballot
			dispatch(updateBallotSuccess(ballot.id, ballot))
		]);
	}

export const uploadComments = (ballotId, type, file) =>
	async (dispatch) => {
		dispatch(updatePending({ballotId}));
		let response;
		try {
			response = await fetcher.postMultipart(`/api/comments/upload/${ballotId}/${type}`, {CommentsFile: file});
		}
		catch(error) {
			await Promise.all([
				dispatch(updateFailure({ballotId})),
				dispatch(setError(`Unable to upload comments for ${ballotId}`, error))
			]);
			return
		}
		const {comments, ballot} = response;
		await Promise.all([
			dispatch(getSuccess({ballotId, comments})),
			// Update the comments summary for the ballot
			dispatch(updateBallotSuccess(ballot.id, ballot))
		]);
	}

export const setStartCommentId = (ballotId, startCommentId) =>
	async (dispatch) => {
		dispatch(updatePending({ballotId}));
		let comments;
		try {
			comments = await fetcher.patch(`/api/comments/startCommentId/${ballotId}`, {StartCommentID: startCommentId});
		}
		catch(error) {
			await Promise.all([
				dispatch(updateFailure({ballotId})),
				dispatch(setError(`Unable to start CID for ${ballotId}`, error))
			]);
			return
		}
		await Promise.all([
			dispatch(setSelected(dataSet, [])),
			dispatch(setExpanded(dataSet, [])),
			dispatch(getSuccess({ballotId, comments}))
		]);
	}

const {afterAddOrDeleteResolutions} = slice.actions;

export const addResolutions = (resolutions) =>
	async (dispatch) => {
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
			]);
			return null;
		}
		await dispatch(afterAddOrDeleteResolutions(response));
		return response.newComments;
	}

const {afterUpdateResolutions} = slice.actions;

export const updateResolutions = (resolutions) =>
	async (dispatch) => {
		dispatch(updatePending());
		let response;
		try {
			response = await fetcher.put('/api/resolutions', {resolutions});
		}
		catch(error) {
			await Promise.all([
				dispatch(updateFailure()),
				dispatch(setError(`Unable to update resolution${resolutions.length > 1? 's': ''}`, error))
			]);
			return;
		}
		await dispatch(afterUpdateResolutions(response));
	}

export const deleteResolutions = (resolutions) =>
	async (dispatch) => {
		dispatch(updatePending());
		let response;
		try {
			response = await fetcher.delete(`/api/resolutions`, {resolutions});
			if (!response.hasOwnProperty('comments') || !Array.isArray(response.comments))
				throw new TypeError('Missing comments array in response')
		}
		catch(error) {
			console.log(error)
			await Promise.all([
				dispatch(updateFailure()),
				dispatch(setError(`Unable to delete resolution${resolutions.length > 1? 's': ''}`, error))
			]);
			return
		}
		await dispatch(afterAddOrDeleteResolutions(response))
	}

export const FieldsToUpdate = {
	CID: 'cid',
	ClausePage: 'clausepage',
	AdHoc: 'adhoc',
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

export const uploadResolutions = (ballotId, toUpdate, matchAlgorithm, matchUpdate, sheetName, file) =>
	async (dispatch) => {
		dispatch(updatePending({ballotId}));
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
		const {comments, ballot, matched, unmatched, added, remaining, updated} = response;
		await Promise.all([
			dispatch(getSuccess({ballotId, comments})),
			dispatch(updateBallotSuccess(ballot.id, ballot))
		])
		return {matched, unmatched, added, remaining, updated};
	}

export const CommentsSpreadsheetFormat = {
	MyProject: 'MyProject',
	Legacy: 'Legacy',
	Modern: 'Modern'
};

export const CommentsSpreadsheetStyle = {
	AllComments: 'AllComments',
	TabPerAdHoc: 'TabPerAdHoc',
	TabPerCommentGroup: 'TabPerCommentGroup'
}

export const exportCommentsSpreadsheet = (ballotId, file, format, style) =>
	async (dispatch) => {
		try {
			let Filename;
			if (file)
				Filename = file.name
			const url = '/api/comments/export/' + format
			await fetcher.postForFile(url, {BallotID: ballotId, Filename, Style: style}, file)
		}
		catch(error) {
			await dispatch(setError(`Unable to export comments for ${ballotId}`, error));
		}
	}
