import {fetcher} from 'dot11-components/lib';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';
import {updateBallotSuccess} from './ballots';

const MustSatisfyLabels = {
	0: 'No',
	1: 'Yes'
};

const MustSatisfyOptions = Object.entries(MustSatisfyLabels).map(([k, v]) => ({value: k, label: v}));

export const fields = {
	CID: {
		label: 'CID',
		isId: true,
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
		dataRenderer: v => MustSatisfyLabels[v],
		options: MustSatisfyOptions
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


export const dataSet = 'comments';
const selectId = (c) => c.CID;

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	selectId,
	sortComparer: (c1, c2) => c1.CommentID === c2.CommentID? c1.ResolutionID - c2.ResolutionID: c1.CommentID - c2.CommentID,
	initialState: {
		ballot_id: 0,
	},
	reducers: {
		setDetails(state, action) {
  			const {ballot_id} = action.payload;
			state.ballot_id = ballot_id;
		},
	},
	extraReducers: (builder, dataAdapter) => {
		builder
		.addMatcher(
			(action) => action.type === 'ballots/setCurrentId',
			(state, action) => {
				const id = action.payload;
				if (state.ballot_id !== id) {
					state.valid = false;
					state.ballot_id = 0;
					dataAdapter.removeAll(state);
				}
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
const {
	setDetails,
	getPending,
	getSuccess,
	getFailure,
	updateMany,
	upsertMany,
	removeMany,
	removeAll,
	setSelected
} = slice.actions;

function getCommentStatus(c) {
	let Status = '';
	if (c.ApprovedByMotion)
		Status = 'Resolution approved';
	else if (c.ReadyForMotion)
		Status = 'Ready for motion';
	else if (c.ResnStatus)
		Status = 'Resolution drafted';
	else if (c.AssigneeName)
		Status = 'Assigned';
	return Status;
}

function getCommentUpdates(state, comments) {
	const updates = [];
	for (let changes of comments) {
		const id = selectId(changes);
		const comment = state.entities[id];
		if (comment) {
			const Status = getCommentStatus({...comment, ...changes});
			if (comment.Status !== Status)
				changes = {...changes, Status};
		}
		else {
			changes = {...changes, Status: getCommentStatus(changes)};
		}
		updates.push({id, changes});
	}
	return updates;
}

const updateCommentsStatus = (comments) =>
	comments.map(c => {
		const Status = getCommentStatus(c);
		return c.Status !== Status? {...c, Status}: c;
	});

export const loadComments = (ballot_id) =>
	async (dispatch, getState) => {
		dispatch(getPending());
		const url = `/api/comments/${ballot_id}`;
		let response;
		try {
			response = await fetcher.get(url);
			if (!Array.isArray(response))
				throw new TypeError("Unexpected response to GET: " + url);
		}
		catch(error) {
			const ballot = getState()[dataSet].entities[ballot_id];
			const ballotId = ballot? ballot.BallotID: `id=${ballot_id}`;
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError(`Unable to get comments for ${ballotId}`, error))
			]);
			return;
		}
		await dispatch(getSuccess(updateCommentsStatus(response)));
		await dispatch(setDetails({ballot_id}));
	}

export const clearComments = () =>
	async (dispatch) => {
		await dispatch(removeAll);
		await dispatch(setDetails({ballot_id: 0}));
	}

export const updateComments = (updates) =>
	async (dispatch, getState) => {
		let response;
		try {
			response = await fetcher.patch(`/api/comments`, updates);
			if (!response.hasOwnProperty('comments') || !Array.isArray(response.comments))
				throw new TypeError("Unexpected response to PATCH: /api/comments")
		}
		catch(error) {
			await dispatch(setError(`Unable to update comment${updates.length > 1? 's': ''}`, error));
			return;
		}
		await dispatch(updateMany(getCommentUpdates(getState()[dataSet], response.comments)));
	}

export const uploadComments = (ballotId, type, file) =>
	async (dispatch) => {
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

export const setStartCommentId = (ballot_id, startCommentId) =>
	async (dispatch) => {
		dispatch(updatePending());
		const url = `/api/comments/${ballot_id}/startCommentId`;
		let response;
		try {
			response = await fetcher.patch(url, {StartCommentID: startCommentId});
			if (!Array.isArray(response))
				throw new TypeError("Unexpected response to PATCH: " + url)
		}
		catch(error) {
			await Promise.all([
				dispatch(updateFailure()),
				dispatch(setError("Unable to set start CID", error))
			]);
			return;
		}
		await Promise.all([
			dispatch(setSelected(dataSet, [])),
			dispatch(setExpanded(dataSet, [])),
			dispatch(getSuccess(response.comments))
		]);
	}

async function afterAddOrDeleteResolutions(dispatch, state, comments) {
	const deletes = [];
	let selected = state.selected.slice();
	const selected_comment_ids = [];
	// Remove comments with affected comment_ids and then add them again
	for (const id of state.ids) {
		const {comment_id, CID} = state.entities[id];
		if (comments.find(c => c.comment_id === comment_id)) {
			deletes.push(id);
			const i = selected.indexOf(id);
			if (i >= 0) {
				// Remove from the selected list
				selected.splice(i, 1);
				// If the associated comment_id appears in the updated list, then add it again as the last entry with this comment_id
				const x = comments.filter(c => c.comment_id === comment_id);
				if (x.length) {
					const newId = selectId(x[x.length - 1]);
					if (!selected.includes(newId))
						selected.push(newId);
				}
			}
		}
	}
	await Promise.all([
		dispatch(removeMany(deletes)),
		dispatch(upsertMany(updateCommentsStatus(comments))),
		dispatch(setSelected(selected))
	]);
}

export const addResolutions = (resolutions) =>
	async (dispatch, getState) => {
		let response;
		try {
			response = await fetcher.post('/api/resolutions', {resolutions})
			if (!response.hasOwnProperty('comments') || !Array.isArray(response.comments))
				throw new TypeError('Missing comments array in response');
			if (!response.hasOwnProperty('newCIDs') || !Array.isArray(response.newCIDs))
				throw new TypeError('Missing newCIDs array in response');
		}
		catch(error) {
			await dispatch(setError('Unable to add resolutions', error));
			return;
		}
		await afterAddOrDeleteResolutions(dispatch, getState()[dataSet], response.comments);
		return response.newComments;
	}

export const updateResolutions = (ids, changes) =>
	async (dispatch, getState) => {
		let response;
		try {
			response = await fetcher.put('/api/resolutions', {ids, changes});
			if (!response.hasOwnProperty('comments') || !Array.isArray(response.comments))
				throw new TypeError('Unexpected response to PUT: /api/resolutions');
		}
		catch(error) {
			await dispatch(setError(`Unable to update resolution${ids.length > 1? 's': ''}`, error));
			return;
		}
		await dispatch(updateMany(getCommentUpdates(getState()[dataSet], response.comments)));
	}

export const deleteResolutions = (resolutions) =>
	async (dispatch, getState) => {
		const url = '/api/resolutions';
		let response;
		try {
			response = await fetcher.delete(url, {resolutions});
			if (!response.hasOwnProperty('comments') || !Array.isArray(response.comments))
				throw new TypeError('Unexpected response to DELETE: ' + url);
		}
		catch(error) {
			await dispatch(setError(`Unable to delete resolution${resolutions.length > 1? 's': ''}`, error));
			return;
		}
		await afterAddOrDeleteResolutions(dispatch, getState()[dataSet], response.comments);
	}

export const FieldsToUpdate = {
	CID: 'cid',
	ClausePage: 'clausepage',
	AdHoc: 'adhoc',
	Assignee: 'assignee',
	Resolution: 'resolution',
	Editing: 'editing'
};

export const MatchAlgorithm = {
	Elimination: 'elimination',
	Comment: 'comment',
	CID: 'cid'
};

export const MatchUpdate = {
	All: 'all',
	Any: 'any',
	Add: 'add'
};

export const uploadResolutions = (ballot_id, toUpdate, matchAlgorithm, matchUpdate, sheetName, file) =>
	async (dispatch) => {
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
			response = await fetcher.postMultipart(`/api/resolutions/${ballot_id}/upload`, params);
		}
		catch (error) {
			await dispatch(setError("Unable to upload resolutions", error));
			return;
		}
		const {comments, ballot, matched, unmatched, added, remaining, updated} = response;
		await Promise.all([
			dispatch(getSuccess(updateCommentsStatus(response.comments))),
			dispatch(setDetails({ballot_id})),
			dispatch(updateBallotSuccess(ballot.id, ballot))
		]);
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
};

export const exportCommentsSpreadsheet = (ballot_id, file, format, style) =>
	async (dispatch, getState) => {
		try {
			let Filename;
			if (file)
				Filename = file.name;
			const url = `/api/comments/${ballot_id}/export/` + format;
			await fetcher.postForFile(url, {Filename, Style: style}, file);
		}
		catch(error) {
			const ballot = getState()[dataSet].entities[ballot_id];
			const ballotId = ballot? ballot.BallotID: `id=${ballot_id}`;
			await dispatch(setError(`Unable to export comments for ${ballotId}`, error));
		}
	}

/*
 * Selectors
 */
export const getCommentsDataSet = (state) => state[dataSet];
