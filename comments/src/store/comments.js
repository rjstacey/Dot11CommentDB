import { v4 as uuid } from 'uuid';
import {fetcher} from 'dot11-components/lib';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';
import {updateBallotSuccess, getCurrentBallotId} from './ballots';

const mustSatisfyOptions = [
	{value: 0, label: 'No'},
	{value: 1, label: 'Yes'}
];

const mustSatisfyLabels = mustSatisfyOptions.reduce((obj, o) => {
	obj[o.value] = o.label;
	return obj;
}, {});

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
		dataRenderer: v => mustSatisfyLabels[v],
		options: mustSatisfyOptions,
		sortType: SortType.NUMERIC
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
const selectId = (c) => c.id; //c.CID;

export const getField = (entity, dataKey) => {
	if (dataKey === 'CID')
		return getCID(entity);
	if (dataKey === 'Status')
		return getCommentStatus(entity);
	return entity[dataKey];
}

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	//selectId,
	sortComparer: (c1, c2) => c1.CommentID === c2.CommentID? c1.ResolutionID - c2.ResolutionID: c1.CommentID - c2.CommentID,
	initialState: {
		ballot_id: 0,
	},
	selectField: getField,
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
	addMany,
	addOne,
	upsertMany,
	removeMany,
	removeAll,
	setSelected,
	setExpanded
} = slice.actions;

export const getCID = (c) => c.CommentID + (c.ResolutionCount > 1? '.' + c.ResolutionID: '');

export function getCommentStatus(c) {
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
		response.forEach(c => delete c.Status);
		await dispatch(getSuccess(response));
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
		updates = response.comments.map(c => ({id: selectId(c), changes: c}));
		await dispatch(updateMany(updates));
	}

export const deleteComments = (ballot_id) =>
	async (dispatch) => {
		try {
			await fetcher.delete(`/api/comments/${ballot_id}`)
		}
		catch(error) {
			await dispatch(setError(`Unable to delete comments`, error));
			return;
		}
		const summary = {Count: 0, CommentIDMin: 0, CommentIDMax: 0}
		await dispatch(updateBallotSuccess(ballot_id, {Comments: summary}));
	}

export const importComments = (ballot_id, epollNum, startCID) =>
	async (dispatch) => {
		const url = `/api/comments/${ballot_id}/importFromEpoll//${epollNum}`;
		let response;
		try {
			response = await fetcher.post(url, {StartCID: startCID});
			if (typeof response !== 'object' ||
				typeof response.ballot !== 'object') {
				throw 'Unexpected response to POST: ' + url;
			}
		}
		catch (error) {
			await dispatch(setError(`Unable to import comments`, error));
			return;
		}
		await dispatch(updateBallotSuccess(ballot_id, response.ballot))
	}

export const uploadComments = (ballotId, type, file) =>
	async (dispatch) => {
		const url = `/api/comments/upload/${ballotId}/${type}`;
		let response;
		try {
			response = await fetcher.postMultipart(url, {CommentsFile: file});
			if (!response.hasOwnProperty('comments') || !Array.isArray(response.comments) ||
				!response.hasOwnProperty('ballot') || typeof response.ballot !== 'object')
				throw new TypeError(`Unexpected response to POST: ${url}`);
		}
		catch (error) {
			await dispatch(setError(`Unable to upload comments for ${ballotId}`, error));
			return;
		}
		const {comments, ballot} = response;
		await Promise.all([
			dispatch(getSuccess({ballotId, comments})),
			dispatch(updateBallotSuccess(ballot.id, ballot))
		]);
	}

export const setStartCommentId = (ballot_id, startCommentId) =>
	async (dispatch, getState) => {
		const url = `/api/comments/${ballot_id}/startCommentId`;
		let response;
		try {
			response = await fetcher.patch(url, {StartCommentID: startCommentId});
			if (!response.hasOwnProperty('comments') || !Array.isArray(response.comments) ||
				!response.hasOwnProperty('ballot') || typeof response.ballot !== 'object')
				throw new TypeError(`Unexpected response to PATCH: ${url}`);
		}
		catch (error) {
			await dispatch(setError("Unable to set start CID", error));
			return;
		}
		const {comments, ballot} = response;
		dispatch(updateBallotSuccess(ballot.id, ballot));
		const currentBallotId = getCurrentBallotId(getState());
		if (ballot.id === currentBallotId) {
			dispatch(getSuccess(comments));
		}
	}

const defaultResolution = {
	AssigneeSAPIN: 0,
	AssigneeName: '',
	ResnStatus: '',
	Resolution: '',
	Submission: '',
	ReadyForMotion: 0,
	ApprovedByMotion: '',
	EditStatus: '',
	EditInDraft: '',
	EditNotes: '',
};

export const addResolutions = (resolutions) =>
	async (dispatch, getState) => {

		const selected = [],
			  updates = [],
			  adds = [],
			  remoteAdds = [];
		const {entities} = getCommentsDataSet(getState());
		for (const r of resolutions) {
			// Find all entries for this comment_id
			const comments = [];
			for (const c of Object.values(entities)) {
				if (c.comment_id === r.comment_id)
					comments.push(c);
			}

			if (comments.length === 0) {
				console.error('Invalid comment_id=', r.comment_id);
				continue;
			}

			// Find a unique ResolutionID
			const existingResolutionIDs = new Set(comments.map(c => c.ResolutionID));
			let ResolutionID = 0;
			while (existingResolutionIDs.has(ResolutionID))
				ResolutionID++;

			const resolution_id = uuid();
			const resolution = {
				...defaultResolution,
				...r,
				ResolutionID,
				id: resolution_id,
			};
			remoteAdds.push(resolution);
			const ResolutionCount = comments.length + 1;
			const newComment = {
				...comments[0],		// Duplicate the comment fields
				...resolution,
				ResolutionCount,
				resolution_id,
				id: resolution_id
			}
			adds.push(newComment);
			// Update ResolutionCount for other comments
			updates.push(...comments.map(c => ({id: c.id, changes: {ResolutionCount}})));
			// Select the newly added entry
			selected.push(resolution_id);
		}
		dispatch(addMany(adds));
		dispatch(updateMany(updates));
		dispatch(setSelected(selected));

		try {
			fetcher.post('/api/resolutions', {resolutions: remoteAdds});
		}
		catch(error) {
			await dispatch(setError('Unable to add resolutions', error));
		}
	}

export const updateResolutions = (updates) =>
	async (dispatch, getState) => {
		await dispatch(updateMany(updates));
		try {
			await fetcher.patch('/api/resolutions', updates);
		}
		catch(error) {
			await dispatch(setError(`Unable to update resolution${updates.length > 1? 's': ''}`, error));
		}
	}

export const deleteResolutions = (ids) =>
	async (dispatch, getState) => {
		const selected = [];
		let entities = getCommentsDataSet(getState()).entities;
		// Keep a copy of the resolutions about to be deleted
		const resolutions = [];
		for (const id of ids)
			resolutions.push(entities[id]);
		// Order by ResolutionID so that we keep the resolution with the lowest ResolutionID.
		resolutions.sort(r => r.ResolutionID);	// order by ResolutionID
		// Delete them
		await dispatch(removeMany(ids));
		// Re-add a single entry with defaults if all deleted otherwise update ResolutionCount
		// For the remote entries, delete if there are multiple, update if there is only one
		const deletes = [];
		const updates = [];
		for (const r of resolutions) {
			entities = getCommentsDataSet(getState()).entities;
			const comments = [];
			for (const c of Object.values(entities)) {
				if (c.comment_id === r.comment_id)
					comments.push(c);
			}
			if (comments.length === 0) {
				// No resolutions remain for this comment_id
				// Re-add a resolution with defatuls locally (same id) and update it remotely (i.e., don't delete the remote copy)
				updates.push({id: r.id, changes: defaultResolution});
				const resolution = {
					...r,
					...defaultResolution,
					ResolutionID: 0,
					ResolutionCount: 1
				}
				await dispatch(addOne(resolution));
				selected.push(resolution.id);
			}
			else {
				// Resolutions still exist for this comment_id
				// Delete the remote entries
				deletes.push(r.id);
				// Update the ResolutionCount for the local copies with the same comment_id
				const commentUpdates = comments.map(c => ({id: c.id, changes: {ResolutionCount: comments.length}}));
				await dispatch(updateMany(commentUpdates));
				if (updates.length)
					selected.push(updates[0].id);
			}
		}
		dispatch(setSelected(selected));

		const url = '/api/resolutions';
		try {
			if (deletes.length > 0)
				await fetcher.delete(url, deletes);
			if (updates.length > 0)
				await fetcher.patch(url, updates);
		}
		catch (error) {
			await dispatch(setError(`Unable to delete resolution${ids.length > 1? 's': ''}`, error));
		}
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
			dispatch(getSuccess(response.comments)),
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
