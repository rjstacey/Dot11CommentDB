import {createSlice, createEntityAdapter} from '@reduxjs/toolkit'

import fetcher from 'dot11-components/lib/fetcher'
import sortsSlice, {initSorts, SortDirection, SortType} from 'dot11-components/store/sort'
import filtersSlice, {initFilters, FilterType} from 'dot11-components/store/filters'
import selectedSlice, {setSelected} from 'dot11-components/store/selected'
import expandedSlice, {setExpanded} from 'dot11-components/store/expanded'
import uiSlice from 'dot11-components/store/ui'
import {getData} from 'dot11-components/store/dataSelectors'
import {setError} from 'dot11-components/store/error'

import {updateBallotSuccess} from './ballots'

const MustSatisfyOptions = {
	0: 'No',
	1: 'Yes'
};

export const fields = {
	CID: {
		label: 'CID',
		sortType: SortType.NUMERIC
	},
	CommenterName: {
		label: 'Commenter'
	},
	Vote: {
		label: 'Vote'
	},
	MustSatisfy: {
		label: 'Must Satisfy',
		dataRenderer: v => MustSatisfyOptions[v],
		options: Object.entries(MustSatisfyOptions).map(([k, v]) => ({value: k, label: v}))
	},
	Category: {label: 'Category'},
	Clause: {label: 'Clause', sortType: SortType.CLAUSE},
	Page: {label: 'Page', sortType: SortType.NUMERIC},
	Comment: {label: 'Comment'},
	ProposedChange: {label: 'Proposed Change'},
	AdHoc: {label: 'Ad-hoc'},
	CommentGroup: {label: 'Group'},
	Notes: {label: 'Notes'},
	AssigneeName: {label: 'Assignee'},
	Submission: {label: 'Submission'},
	Status: {label: 'Status'},
	ApprovedByMotion: {label: 'Motion Number'},
	ResnStatus: {label: 'Resn Status'},
	Resolution: {label: 'Resolution'},
	EditStatus: {label: 'Editing Status'},
	EditInDraft: {label: 'In Draft'},
	EditNotes: {label: 'Editing Notes'}
};

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
	//selectId: (c) => c.ResolutionCount <= 1? `${c.comment_id}`: `${c.comment_id}-${c.resolution_id}`,
	sortComparer: (c1, c2) => c1.CommentID === c2.CommentID? c1.ResolutionID - c2.ResolutionID: c1.CommentID - c2.CommentID 
})

const dataSet = 'comments';

const slice = createSlice({
	name: dataSet,
	initialState: dataAdapter.getInitialState({
		ballotId: '',
		valid: false,
		loading: false,
		[sortsSlice.name]: sortsSlice.reducer(undefined, initSorts(fields)),
		[filtersSlice.name]: filtersSlice.reducer(undefined, initFilters(fields)),
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
			let updates = comments.map(c => ({id: c.id, changes: c}));
			dataAdapter.updateMany(state, updates);
			updates = [];
			for (const id of comments.map(c => c.id)) {
				const comment = state.entities[id];
				if (comment) {
					const Status = getCommentStatus(comment);
					if (comment.Status !== Status)
						updates.push({id: comment.id, changes: {Status}});
				}
			}
			dataAdapter.updateMany(state, updates);
			state[selectedSlice.name] = filterIdList(state[selectedSlice.name], state.ids);
			state[expandedSlice.name] = filterIdList(state[expandedSlice.name], state.ids);
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
			const {comments} = action.payload;
			const deletes = [];
			let selected = state[selectedSlice.name].slice();
			const selected_comment_ids = [];
			// Remove comments with affected comment_ids and then add them again
			for (const id of state.ids) {
				const {comment_id} = state.entities[id];
				if (comments.find(c => c.comment_id === comment_id)) {
					deletes.push(id);
					const i = selected.indexOf(id);
					if (i >= 0) {
						// Remove the id from the selected list
						selected.splice(i, 1);
						// If the associated comment_id appears in the updated list, then add it again as the last entry with this comment_id
						const x = comments.filter(c => c.comment_id === comment_id);
						if (x.length) {
							const newId = x[x.length - 1].id;
							if (!selected.includes(newId)) {
								selected.push(newId);
							}
						}
					}
				}
			}
			dataAdapter.removeMany(state, deletes);
			dataAdapter.upsertMany(state, updateCommentsStatus(comments));
			state[selectedSlice.name] = selected;
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
		let response;
		try {
			response = await fetcher.get(`/api/comments/${ballotId}`);
			if (!Array.isArray(response))
				throw new TypeError("Unexpected response to GET: /api/comments")
		}
		catch(error) {
			await Promise.all([
				dispatch(getFailure({ballotId})),
				dispatch(setError(`Unable to get comments for ${ballotId}`, error))
			]);
			return;
		}
		await dispatch(getSuccess({ballotId, comments: response}));
	}

const {updatePending, updateFailure, updateMany} = slice.actions;

export const updateComments = (comments) =>
	async (dispatch) => {
		dispatch(updatePending())
		let response;
		try {
			response = await fetcher.put(`/api/comments`, {comments});
			if (!response.hasOwnProperty('comments') || !Array.isArray(response.comments))
				throw new TypeError("Unexpected response to PUT: /api/comments")
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
		dispatch(updatePending({ballotId}));
		const url = `/api/comments/importFromEpoll/${ballotId}/${epollNum}`;
		let response;
		try {
			response = await fetcher.post(url, {StartCID: startCID});
			if (!response.hasOwnPropery('comments') || !Array.isArray(response.comments) ||
				!response.hasOwnProperty('ballot') || typeof response.ballot !== 'object')
				throw new TypeError(`Unexpected response to POST: ${url}`);
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
		const url = `/api/comments/upload/${ballotId}/${type}`;
		let response;
		try {
			response = await fetcher.postMultipart(url, {CommentsFile: file});
			if (!response.hasOwnPropery('comments') || !Array.isArray(response.comments) ||
				!response.hasOwnProperty('ballot') || typeof response.ballot !== 'object')
				throw new TypeError(`Unexpected response to POST: ${url}`);
		}
		catch(error) {
			await Promise.all([
				dispatch(updateFailure({ballotId})),
				dispatch(setError(`Unable to upload comments for ${ballotId}`, error))
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

export const setStartCommentId = (ballotId, startCommentId) =>
	async (dispatch) => {
		dispatch(updatePending({ballotId}));
		const url = `/api/comments/startCommentId/${ballotId}`;
		let response;
		try {
			response = await fetcher.patch(url, {StartCommentID: startCommentId});
			if (!Array.isArray(response))
				throw new TypeError("Unexpected response to PATCH: /api/comments")
		}
		catch(error) {
			await Promise.all([
				dispatch(updateFailure({ballotId})),
				dispatch(setError(`Unable to start CID for ${ballotId}`, error))
			]);
			return;
		}
		await Promise.all([
			dispatch(setSelected(dataSet, [])),
			dispatch(setExpanded(dataSet, [])),
			dispatch(getSuccess({ballotId, comments: response}))
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

export const updateResolutions = (resolutions) =>
	async (dispatch) => {
		dispatch(updatePending());
		let response;
		try {
			response = await fetcher.put('/api/resolutions', {resolutions});
			if (!response.hasOwnProperty('comments') || !Array.isArray(response.comments))
				throw new TypeError('Unexpected response to PUT: /api/resolutions');
		}
		catch(error) {
			await Promise.all([
				dispatch(updateFailure()),
				dispatch(setError(`Unable to update resolution${resolutions.length > 1? 's': ''}`, error))
			]);
			return;
		}
		await dispatch(updateMany(response));
	}

export const deleteResolutions = (resolutions) =>
	async (dispatch) => {
		dispatch(updatePending());
		const url = '/api/resolutions';
		let response;
		try {
			response = await fetcher.delete(url, {resolutions});
			if (!response.hasOwnProperty('comments') || !Array.isArray(response.comments))
				throw new TypeError('Unexpected response to DELETE: ' + url);
		}
		catch(error) {
			console.log(error)
			await Promise.all([
				dispatch(updateFailure()),
				dispatch(setError(`Unable to delete resolution${resolutions.length > 1? 's': ''}`, error))
			]);
			return;
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
