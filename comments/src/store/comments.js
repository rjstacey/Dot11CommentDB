import { v4 as uuid } from 'uuid';
import {fetcher} from 'dot11-components/lib';
//import fetcher from './fetcher';
import {createAppTableDataSlice, SortType} from 'dot11-components/store/appTableData';
import {setError} from 'dot11-components/store/error';

import {updateBallotSuccess, getCurrentBallotId, getBallotsDataSet} from './ballots';

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
const selectId = (c) => c.id; //c.CID;

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
			(action) => action.type.startsWith(dataSet + '/') && /(addManyCommit|updateManyCommit)$/.test(action.type),
			(state, action) => {
				const {comments} = action.payload;
				const updates = comments.map(c => ({id: c.id, changes: {LastModifiedBy: c.LastModifiedBy, LastModifiedTime: c.LastModifiedTime}}));
				dataAdapter.updateMany(state, updates);
			}
		)
		.addMatcher(
			(action) => action.type.startsWith(dataSet + '/') && /(updateManyRollback)$/.test(action.type),
			(state, action) => {
				// Reverse previous updates
				const {updates} = action.meta;
				dataAdapter.updateMany(state, updates);
			}
		)
		.addMatcher(
			(action) => action.type.startsWith(dataSet + '/') && /(addManyRollback)$/.test(action.type),
			(state, action) => {
				const added_ids = action.meta.ids;
				if (!Array.isArray(added_ids))
					console.error('missing or bad action.meta.ids');
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
				const {comments} = action.meta;
				if (!Array.isArray(comments))
					console.error('missing or bad action.meta.comments');
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
	addMany: localAddMany,
	updateMany: localUpdateMany,
	removeMany: localRemoveMany,
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
		catch (error) {
			const ballot = getBallotsDataSet(getState()).entities[ballot_id];
			const ballotId = ballot? ballot.BallotID: `id=${ballot_id}`;
			await Promise.all([
				dispatch(getFailure()),
				dispatch(setError(`Unable to get comments for ${ballotId}`, error))
			]);
			return;
		}
		await dispatch(getSuccess(response));
		await dispatch(setDetails({ballot_id}));
	}

export const clearComments = () =>
	async (dispatch) => {
		await dispatch(removeAll);
		await dispatch(setDetails({ballot_id: 0}));
	}

export const updateComments = (updates) =>
	(dispatch, getState) => {
		const {ids, entities} = getCommentsDataSet(getState());
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
		dispatch({
			type: localUpdateMany.toString(),
			payload: localUpdates,
			meta: {
				offline: {
					effect: {url: '/api/comments', method: 'PATCH', params: updates},
					commit: {type: dataSet + '/updateManyCommit'},
					rollback: {type: dataSet + '/updateManyRollback', meta: {updates: rollbackUpdates}}
				}
			}
		});
	}

/*export const updateComments = (updates) =>
	async (dispatch, getState) => {
		/*const {entities} = getCommentsDataSet(getState());
		const updates = [];
		for (const u of commentUpdates) {
			// Find all entries for this comment_id
			for (const c of Object.values(entities)) {
				if (c.comment_id === u.id)
					updates.push({id: c.id, changes: u.changes});
			}
		}* /
		dispatch(commentsUpdateMany(updates));

		/*try {
			await fetcher.patch(`/api/comments`, commentUpdates);
		}
		catch (error) {
			await dispatch(setError(`Unable to update comment${updates.length > 1? 's': ''}`, error));
		}* /
 	}*/

export const deleteComments = (ballot_id) =>
	async (dispatch, getState) => {
		if (getCommentsDataSet(getState()).ballot_id === ballot_id)
			await dispatch(clearComments());
		const summary = {Count: 0, CommentIDMin: 0, CommentIDMax: 0}
		await dispatch(updateBallotSuccess(ballot_id, {Comments: summary}));

		try {
			await fetcher.delete(`/api/comments/${ballot_id}`)
		}
		catch (error) {
			await dispatch(setError(`Unable to delete comments`, error));
		}
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
			dispatch(getSuccess(comments)),
			dispatch(setDetails({ballot_id})),
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
		if (ballot_id === getCommentsDataSet(getState()).ballot_id) {
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

const addMany = (localAdds, remoteAdds) => ({
	type: localAddMany.toString(),
	payload: localAdds,
	meta: {
		offline: {
			effect: {url: '/api/resolutions', method: 'POST', params: remoteAdds},
			commit: {type: dataSet + '/addManyCommit'},
  			rollback: {type: dataSet + '/addManyRollback', meta: {ids: localAdds.map(c => c.id)}}
  		}
  	}
});

const updateMany = (updates) => 
	(dispatch, getState) => {
		const {entities} = getCommentsDataSet(getState());
		const rollbackUpdates = updates.map(u => {
			const id = u.id;
			const changes = {};
			const entity = entities[id];
			for (const key of Object.keys(u.changes))
				changes[key] = entity[key];
			return {id, changes};
		});
		return dispatch({
			type: localUpdateMany.toString(),
			payload: updates,
			meta: {
				offline: {
					effect: {url: '/api/resolutions', method: 'PATCH', params: updates},
					commit: {type: dataSet + '/updateManyCommit'},
					rollback: {type: dataSet + '/updateManyRollback', meta: {updates: rollbackUpdates}}
				}
			}
		});
	}

const removeMany = (ids) => 
	(dispatch, getState) => {
		const {entities} = getCommentsDataSet(getState());
		const comments = ids.map(id => entities[id]);
		return dispatch({
			type: localRemoveMany.toString(),
			payload: ids,
			meta: {
				offline: {
					effect: {url: '/api/resolutions', method: 'DELETE', params: ids},
					rollback: {type: dataSet + '/removeManyRollback', meta: {comments}}
				}
			}
		});
	}

export const addResolutions = (resolutions) =>
	async (dispatch, getState) => {
		const {ids, entities} = getCommentsDataSet(getState());
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
		dispatch(addMany(adds, remoteAdds));
		dispatch(localUpdateMany(updates));
		dispatch(setSelected(selected));

		/*try {
			fetcher.post('/api/resolutions', {resolutions: remoteAdds});
		}
		catch(error) {
			await dispatch(setError('Unable to add resolutions', error));
		}*/
	}

/*export const updateResolutions = (updates) =>
	(dispatch, getState) => {
		dispatch(updateMany(updates));

		/*try {
			await fetcher.patch('/api/resolutions', updates);
		}
		catch(error) {
			await dispatch(setError(`Unable to update resolution${updates.length > 1? 's': ''}`, error));
		}* /
	}*/

export const updateResolutions = updateMany;

export const deleteResolutions = (delete_ids) =>
	async (dispatch, getState) => {
		const {ids, entities} = getCommentsDataSet(getState());

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

		/*const url = '/api/resolutions';
		try {
			if (deletes.length > 0)
				await fetcher.delete(url, deletes);
			if (updates.length > 0)
				await fetcher.patch(url, updates);
		}
		catch (error) {
			await dispatch(setError(`Unable to delete resolution${ids.length > 1? 's': ''}`, error));
		}*/
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
