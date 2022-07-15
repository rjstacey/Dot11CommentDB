import { v4 as uuid } from 'uuid';
import {createSelector} from '@reduxjs/toolkit';
import {fetcher} from 'dot11-components/lib';
import {createAppTableDataSlice, SortType, selectCurrentPanelConfig, setPanelIsSplit} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';

import {updateBallotSuccess, selectBallot} from './ballots';
import {offlineFetch} from './offline';

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
	CommenterName: {label: 'Commenter'},
	Vote: {label: 'Vote'},
	MustSatisfy: {
		label: 'Must satisfy',
		dataRenderer: v => mustSatisfyLabels[v],
		options: mustSatisfyOptions,
		sortType: SortType.NUMERIC
	},
	Category: {label: 'Category'},
	Clause: {label: 'Clause', sortType: SortType.CLAUSE},
	Page: {label: 'Page', sortType: SortType.NUMERIC},
	Comment: {label: 'Comment'},
	ProposedChange: {label: 'Proposed change'},
	AdHoc: {label: 'Ad-hoc'},
	CommentGroup: {label: 'Group'},
	Notes: {label: 'Notes'},
	AssigneeName: {label: 'Assignee'},
	Submission: {label: 'Submission'},
	Status: {label: 'Status'},
	ApprovedByMotion: {label: 'Approval motion'},
	ResnStatus: {label: 'Resn Status'},
	Resolution: {label: 'Resolution'},
	EditStatus: {label: 'Editing Status'},
	EditInDraft: {label: 'In Draft'},
	EditNotes: {label: 'Editing Notes'}
};

export const dataSet = 'comments';
//const selectId = (c) => c.id; //c.CID;

export const getField = (entity, dataKey) => {
	if (dataKey === 'CID')
		return getCID(entity);
	if (dataKey === 'Status')
		return getCommentStatus(entity);
	return entity[dataKey];
}

function getResolutionCountUpdates(ids, entities, comment_ids) {
	const updates = [];
	for (const comment_id of comment_ids) {
		const comments = [];
		for (const id of ids) {
			const c = entities[id];
			if (c.comment_id === comment_id)
				comments.push(c);
		}
		const ResolutionCount = comments.length;
		updates.push(...comments.map(c => ({id: c.id, changes: {ResolutionCount}})));
	}
	return updates;
}

const initialState = {
	ballot_id: 0
};

const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	//selectId,
	sortComparer: (c1, c2) => c1.CommentID === c2.CommentID? c1.ResolutionID - c2.ResolutionID: c1.CommentID - c2.CommentID,
	initialState,
	selectField: getField,
	reducers: {
		setDetails(state, action) {
			const changes = action.payload;
			return {...state, ...changes};
		}
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
		.addMatcher(
			(action) => action.type === dataSet + '/getCommit',
			(state, action) => {
				const comments = action.payload;
				const updates = comments.map(c => ({id: c.id, changes: c}));
				dataAdapter.updateMany(state, updates);
			}
		)
		.addMatcher(
			(action) => action.type === dataSet + '/updateCommit',
			(state, action) => {
				const {comments} = action.payload;
				//const updates = comments.map(c => ({id: c.id, changes: {LastModifiedBy: c.LastModifiedBy, LastModifiedTime: c.LastModifiedTime}}));
				const updates = comments.map(c => ({id: c.id, changes: c}));
				dataAdapter.updateMany(state, updates);
			}
		)
		.addMatcher(
			(action) => action.type.startsWith(dataSet + '/') && /(addManyRollback)$/.test(action.type),
			(state, action) => {
				const added_ids = action.payload;
				if (!Array.isArray(added_ids))
					console.error('missing or bad payload; expected array');
				const comment_ids = added_ids.map(id => state.entities[id].comment_id);
				dataAdapter.removeMany(state, added_ids);
				const {ids, entities} = state;
				const updates = getResolutionCountUpdates(ids, entities, comment_ids);
				dataAdapter.updateMany(state, updates);
			}
		)
		.addMatcher(
			(action) => action.type.startsWith(dataSet + '/') && /(removeManyRollback)$/.test(action.type),
			(state, action) => {
				const comments = action.payload;
				if (!Array.isArray(comments))
					console.error('missing or bad payload; expected array');
				dataAdapter.addMany(state, comments);
				const {ids, entities} = state;
				const comment_ids = comments.map(c => c.comment_id);
				const updates = getResolutionCountUpdates(ids, entities, comment_ids);
				dataAdapter.updateMany(state, updates);
			}
		)
	}
});

/*
 * Reducer
 */
export default slice.reducer;

/*
 * Selectors
 */
export const selectCommentsState = state => state[dataSet];
const selectCommentsIds = state => state[dataSet].ids;
const selectCommentsEntities = state => state[dataSet].entities;
const selectCommentsBallotId = state => state[dataSet].ballot_id;

const selectCommentsLastModified = createSelector(
	selectCommentsIds,
	selectCommentsEntities,
	(ids, entities) => {
		let lastModified = 0;
		for (const id of ids) {
			const c = entities[id];
			const d = Date.parse(c.LastModifiedTime)
			if (d > lastModified)
				lastModified = d;
		}
		return new Date(lastModified).toISOString();
	}
);

export const selectCommentsCurrentPanelConfig = (state) => selectCurrentPanelConfig(state, dataSet);

/*
 * Actions
 */

export const setCommentsCurrentPanelIsSplit = (value) => setPanelIsSplit(dataSet, undefined, value);

const {
	setDetails,
	getPending,
	getSuccess,
	getFailure,
	addMany: localAddMany,
	updateMany: localUpdateMany,
	removeMany: localRemoveMany,
	removeAll,
	setSelected,
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
		catch (error) {
			const ballot = selectBallot(getState(), ballot_id);
			const ballotId = ballot? ballot.BallotID: `id=${ballot_id}`;
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError(`Unable to get comments for ${ballotId}`, error))
			]);
			return;
		}
		dispatch(getSuccess(response));
		dispatch(setDetails({ballot_id}));
	}

export const getCommentUpdates = () =>
	(dispatch, getState) => {
		const state = getState();
		const ballot_id = selectCommentsBallotId(state);
		if (!ballot_id)
			return;
		const lastModified = selectCommentsLastModified(state);
		dispatch(offlineFetch({
			effect: {url: `/api/comments/${ballot_id}`, method: 'GET', params: {modifiedSince: lastModified}},
			commit: {type: dataSet + '/getCommit'},
		}));
	}

export const clearComments = () =>
	async (dispatch) => {
		await dispatch(removeAll);
		await dispatch(setDetails({ballot_id: 0}));
	}

export const updateComments = (updates) =>
	(dispatch, getState) => {
		const state = getState();
		const {ids, entities, ballot_id} = selectCommentsState(state);
		const lastModified = selectCommentsLastModified(state);

		const localUpdates = [], 
		      rollbackUpdates = [];
		for (const id of ids) {
			const c = entities[id];
			const comment_id = c.comment_id;
			const u = updates.find(u => u.id === comment_id);
			if (u) {
				localUpdates.push({id, changes: u.changes});
				const changes = {};
				for (const key of Object.keys(u.changes))
					changes[key] = c[key];
				rollbackUpdates.push({id, changes});
			}
		}
		dispatch(localUpdateMany(localUpdates));
		dispatch(offlineFetch({
			effect: {url: '/api/comments', method: 'PATCH', params: {updates, ballot_id, modifiedSince: lastModified}},
			commit: {type: dataSet + '/updateCommit'},
			rollback: {type: localUpdateMany.toString(), payload: rollbackUpdates} 
		}));
	}

export const deleteComments = (ballot_id) =>
	async (dispatch, getState) => {
		if (selectCommentsBallotId(getState()) === ballot_id)
			await dispatch(clearComments());
		const summary = {Count: 0, CommentIDMin: 0, CommentIDMax: 0};
		await dispatch(updateBallotSuccess(ballot_id, {Comments: summary}));

		try {
			await fetcher.delete(`/api/comments/${ballot_id}`);
		}
		catch (error) {
			await dispatch(setError(`Unable to delete comments`, error));
		}
	}

export const importComments = (ballot_id, epollNum, startCID) =>
	async (dispatch) => {
		const url = `/api/comments/${ballot_id}/importFromEpoll/${epollNum}`;
		let response;
		try {
			response = await fetcher.post(url, {StartCID: startCID});
			if (typeof response !== 'object' ||
				typeof response.ballot !== 'object') {
				throw new TypeError('Unexpected response to POST: ' + url);
			}
		}
		catch (error) {
			await dispatch(setError(`Unable to import comments`, error));
			return;
		}
		await dispatch(updateBallotSuccess(ballot_id, response.ballot));
	}

export const uploadComments = (ballot_id, type, file) =>
	async (dispatch) => {
		const url = `/api/comments/${ballot_id}/upload`;
		let response;
		try {
			response = await fetcher.postMultipart(url, {CommentsFile: file});
			if (!response.hasOwnProperty('comments') || !Array.isArray(response.comments) ||
				!response.hasOwnProperty('ballot') || typeof response.ballot !== 'object')
				throw new TypeError('Unexpected response to POST: ' + url);
		}
		catch (error) {
			await dispatch(setError(`Unable to upload comments for ${ballot_id}`, error));
			return;
		}
		const {comments, ballot} = response;
		dispatch(getSuccess(comments));
		dispatch(setDetails({ballot_id}));
		dispatch(updateBallotSuccess(ballot.id, ballot));
	}

export const setStartCommentId = (ballot_id, startCommentId) =>
	async (dispatch, getState) => {
		const url = `/api/comments/${ballot_id}/startCommentId`;
		let response;
		try {
			response = await fetcher.patch(url, {StartCommentID: startCommentId});
			if (!response.hasOwnProperty('comments') || !Array.isArray(response.comments) ||
				!response.hasOwnProperty('ballot') || typeof response.ballot !== 'object')
				throw new TypeError('Unexpected response to PATCH: ' + url);
		}
		catch (error) {
			await dispatch(setError("Unable to set start CID", error));
			return;
		}
		const {comments, ballot} = response;
		dispatch(updateBallotSuccess(ballot.id, ballot));
		if (ballot_id === selectCommentsBallotId(getState())) {
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

const updateMany = (updates) => 
	(dispatch, getState) => {
		const state = getState();
		const {entities, ballot_id} = selectCommentsState(state);
		const lastModified = selectCommentsLastModified(state);

		const rollbackUpdates = updates.map(u => {
			const id = u.id;
			const changes = {};
			const entity = entities[id];
			for (const key of Object.keys(u.changes))
				changes[key] = entity[key];
			return {id, changes};
		});
		dispatch(localUpdateMany(updates));
		dispatch(offlineFetch({
			effect: {url: '/api/resolutions', method: 'PATCH', params: {updates, ballot_id, modifiedSince: lastModified}},
			commit: {type: dataSet + '/updateCommit'},
			rollback: {type: localUpdateMany.toString(), payload: rollbackUpdates}
		}));
	}

const removeMany = (ids) => 
	(dispatch, getState) => {
		const state = getState();
		const {entities, ballot_id} = selectCommentsState(state);
		const lastModified = selectCommentsLastModified(state);

		const comments = ids.map(id => entities[id]);
		dispatch(localRemoveMany(ids));
		dispatch(offlineFetch({
			effect: {url: '/api/resolutions', method: 'DELETE', params: {ids, ballot_id, modifiedSince: lastModified}},
			commit: {type: dataSet + '/updateCommit'},
			rollback: {type: dataSet + '/removeManyRollback', payload: comments}
		}));
	}

export const addResolutions = (resolutions) =>
	async (dispatch, getState) => {
		const state = getState();
		const {ids, entities, ballot_id} = selectCommentsState(state);
		const lastModified = selectCommentsLastModified(state);

		const selected = [],
			  updates = [],
			  adds = [],
			  remoteAdds = [];
		for (const r of resolutions) {
			// Find all entries for this comment_id
			const comments = [];
			for (const id of ids) {
				const c = entities[id];
				if (c.comment_id === r.comment_id)
					comments.push(c);
			}

			if (comments.length === 0) {
				console.warn('Invalid comment_id=', r.comment_id);
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
		dispatch(localUpdateMany(updates));
		dispatch(localAddMany(adds));
		dispatch(offlineFetch({
			effect: {url: '/api/resolutions', method: 'POST', params: {entities: remoteAdds, ballot_id, modifiedSince: lastModified}},
			commit: {type: dataSet + '/updateCommit'},
			rollback: {type: dataSet + '/addManyRollback', payload: adds.map(c => c.id)}
		}));
		dispatch(setSelected(selected));
	}

export const updateResolutions = updateMany;

export const deleteResolutions = (delete_ids) =>
	async (dispatch, getState) => {
		const {ids, entities} = selectCommentsState(getState());

		// Organize by comment_id
		const toDelete = {},
		      toDeleteCommentIDs = [];
		for (const id of delete_ids) {
			const comment_id = entities[id].comment_id;
			if (toDeleteCommentIDs.includes(comment_id)) {
				toDelete[comment_id].push(id);
			}
			else {
				toDelete[comment_id] = [id];
				toDeleteCommentIDs.push(comment_id);
			}
		}

		const deletes = [],
		      updates = [],
		      commentUpdates = [],
		      selected = [];
		for (const comment_id of toDeleteCommentIDs) {
			const resolution_ids = toDelete[comment_id];

			// Sort by ResolutionID
			resolution_ids.sort(id => entities[id].ResolutionID);

			// Find all comments that would remain
			const remainingComments = [];
			for (const id of ids) {
				const c = entities[id];
				if (c.comment_id === comment_id && !resolution_ids.includes(c.id))
					remainingComments.push(c);
			}

			if (remainingComments.length === 0) {
				// No resolutions would remain with this comment_id
				// Update the first to defaults and delete the rest
				const id = resolution_ids.shift();
				updates.push({id, changes: defaultResolution});
				if (resolution_ids.length > 0)
					deletes.push(...resolution_ids);

				// Select the remaining comment
				selected.push(id);
			}
			else {
				// Resolutions still exist for this comment_id, delete all
				deletes.push(...resolution_ids);

				// Update the ResolutionCount for the remaining comments
				const ResolutionCount = remainingComments.length;
				commentUpdates.push(...remainingComments.map(c => ({id: c.id, changes: {ResolutionCount}})));

				// Select the first of the remaining comments
				selected.push(remainingComments[0].id);
			}
		}
		if (deletes.length)
			dispatch(removeMany(deletes));
		if (updates.length)
			dispatch(updateMany(updates));
		if (commentUpdates.length)
			dispatch(localUpdateMany(commentUpdates));
		dispatch(setSelected(selected));
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
			if (!Array.isArray(response.comments) || typeof response.ballot !== 'object')
				throw new TypeError('Unexpected response');
		}
		catch (error) {
			await dispatch(setError("Unable to upload resolutions", error));
			return;
		}
		const {comments, ballot, matched, unmatched, added, remaining, updated} = response;
		await dispatch(getSuccess(comments));
		await dispatch(setDetails({ballot_id}));
		await dispatch(updateBallotSuccess(ballot.id, ballot));
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
			const ballot = selectBallot(getState(), ballot_id);
			const ballotId = ballot? ballot.BallotID: `id=${ballot_id}`;
			await dispatch(setError(`Unable to export comments for ballot ${ballotId}`, error));
		}
	}
