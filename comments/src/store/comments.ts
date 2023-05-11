import { v4 as uuid } from 'uuid';
import {createSelector} from '@reduxjs/toolkit';
import type { EntityId, Dictionary } from '@reduxjs/toolkit';
import {
	fetcher,
	setError,
	createAppTableDataSlice, SortType, getAppTableDataSelectors, isObject,
} from 'dot11-components';

import type { RootState, AppThunk } from '.';

import { updateBallotSuccess, selectBallotEntities, validBallot, Ballot } from './ballots';
import { offlineFetch } from './offline';


export type Comment = {
	id: number;
	ballot_id: number;
	CommentID: number;
	CommenterSAPIN: number | null;
	CommenterName: string;
	CommenterEmail: string;
	Category: string;
	C_Clause: string;
	C_Page: string;
	C_Line: string;
	C_Index: number;
	MustSatisfy: boolean;
	Clause: string;
	Page: string | null;
	Comment: string;
	AdHoc: string;
	Notes: string;
	CommentGroup: string;
	ProposedChange: string;
	LastModifiedBy: number | null;
	LastModifiedTime: string | null;
}

export type ResnStatusType = 'A' | 'V' | 'J';

export type Resolution = {
	id: string;
	comment_id: number;
	ResolutionID: number;
	AssigneeSAPIN: number | null;
	AssigneeName: string | null;
	ResnStatus: ResnStatusType | null;
	Resolution: string | null;
	ApprovedByMotion: string;
	ReadyForMotion: boolean;
	Submission: string;
	EditStatus: string;
	EditNotes: string;
	EditInDraft: string;
	LastModifiedBy: number | null;
	LastModifiedTime: string | null;
}

export type ResolutionCreate = Partial<Omit<Resolution, "comment_id">> & {comment_id: number};

export type ResolutionUpdate = {
	id: string;
	changes: Partial<Resolution>;
}

export type CommentResolution = Omit<Comment, "id"> & Omit<Resolution, "id"> & {
	id: any;
	resolution_id: string;
	ResolutionID: number;
	ResolutionCount: number;
	CID: string;
	Vote: string;
}

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

export const getField = (entity: CommentResolution, dataKey: string) => {
	if (dataKey === 'CID')
		return getCID(entity);
	if (dataKey === 'Status')
		return getCommentStatus(entity);
	return entity[dataKey];
}

type Update<T> = {
	id: EntityId;
	changes: Partial<T>;
}

function getResolutionCountUpdates(ids: EntityId[], entities: Dictionary<CommentResolution>, comment_ids: number[]) {
	const updates: Update<CommentResolution>[] = [];
	for (const comment_id of comment_ids) {
		const comments: CommentResolution[] = [];
		for (const id of ids) {
			const c = entities[id]!;
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
	sortComparer: (c1: CommentResolution, c2: CommentResolution) => c1.CommentID === c2.CommentID? c1.ResolutionID - c2.ResolutionID: c1.CommentID - c2.CommentID,
	initialState,
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
				const comment_ids = added_ids.map(id => state.entities[id]!.comment_id);
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

export default slice;

/*
 * Selectors
 */
export const selectCommentsState = (state: RootState) => state[dataSet];
export const selectCommentsIds = (state: RootState) => selectCommentsState(state).ids;
export const selectCommentsEntities = (state: RootState) => selectCommentsState(state).entities;
export const selectCommentsBallotId = (state: RootState) => selectCommentsState(state).ballot_id;

const selectCommentsLastModified = createSelector(
	selectCommentsIds,
	selectCommentsEntities,
	(ids, entities) => {
		let lastModified = 0;
		ids.forEach(id => {
			const c = entities[id]!;
			const d = c.LastModifiedTime? Date.parse(c.LastModifiedTime): 0;
			if (d > lastModified)
				lastModified = d;
			return lastModified;
		});
		return new Date(lastModified).toISOString();
	}
);

export const commentsSelectors = getAppTableDataSelectors(selectCommentsState);

/*
 * Actions
 */
export const commentsActions = slice.actions;

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
	setUiProperties
} = slice.actions;

export {setUiProperties};

export const getCID = (c: CommentResolution) => c.CommentID + (c.ResolutionCount > 1? '.' + c.ResolutionID: '');

export function getCommentStatus(c: CommentResolution) {
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

const baseCommentsUrl = '/api/comments';

function validCommentResolution(c: any): c is CommentResolution {
	return isObject(c) &&
		(typeof c.id === 'string' || typeof c.id === 'number') &&
		typeof c.comment_id === 'number';
}

function validGetResponse(response: any): response is CommentResolution[] {
	return Array.isArray(response) && response.every(validCommentResolution);
}

export const loadComments = (ballot_id: number): AppThunk =>
	async (dispatch, getState) => {
		dispatch(getPending());
		const url = `${baseCommentsUrl}/${ballot_id}`;
		let response: any;
		try {
			response = await fetcher.get(url);
			if (!validGetResponse(response))
				throw new TypeError("Unexpected response");
		}
		catch (error) {
			const ballot = selectBallotEntities(getState())[ballot_id];
			const ballotId = ballot?.BallotID || `id=${ballot_id}`;
			dispatch(getFailure());
			dispatch(setError(`Unable to get comments for ${ballotId}`, error));
			return;
		}
		dispatch(getSuccess(response));
		dispatch(setDetails({ballot_id}));
	}

export const getCommentUpdates = (): AppThunk =>
	async (dispatch, getState) => {
		const state = getState();
		const ballot_id = selectCommentsBallotId(state);
		if (!ballot_id)
			return;
		const lastModified = selectCommentsLastModified(state);
		dispatch(offlineFetch({
			effect: {url: `${baseCommentsUrl}/${ballot_id}`, method: 'GET', params: {modifiedSince: lastModified}},
			commit: {type: dataSet + '/getCommit'},
		}));
	}

export const clearComments = (): AppThunk =>
	async (dispatch) => {
		dispatch(removeAll());
		dispatch(setDetails({ballot_id: 0}));
	}

export const updateComments = (updates): AppThunk =>
	async (dispatch, getState) => {
		const state = getState();
		const {ids, entities, ballot_id} = selectCommentsState(state);
		const lastModified = selectCommentsLastModified(state);

		const localUpdates: Update<CommentResolution>[] = [], 
		      rollbackUpdates: Update<CommentResolution>[] = [];
		for (const id of ids) {
			const c = entities[id]!;
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
			effect: {url: baseCommentsUrl, method: 'PATCH', params: {updates, ballot_id, modifiedSince: lastModified}},
			commit: {type: dataSet + '/updateCommit'},
			rollback: {type: localUpdateMany.toString(), payload: rollbackUpdates} 
		}));
	}

export const deleteComments = (ballot_id: number): AppThunk =>
	async (dispatch, getState) => {
		if (selectCommentsBallotId(getState()) === ballot_id)
			await dispatch(clearComments());
		const summary = {Count: 0, CommentIDMin: 0, CommentIDMax: 0};
		dispatch(updateBallotSuccess(ballot_id, {Comments: summary}));

		try {
			await fetcher.delete(`${baseCommentsUrl}/${ballot_id}`);
		}
		catch (error) {
			dispatch(setError(`Unable to delete comments`, error));
		}
	}

function validImportReponse(response: any): response is {ballot: Ballot} {
	return isObject(response) && validBallot(response.ballot);
}

export const importComments = (ballot_id: number, epollNum: number, startCID: number): AppThunk =>
	async (dispatch) => {
		const url = `/api/comments/${ballot_id}/importFromEpoll/${epollNum}`;
		let response: any;
		try {
			response = await fetcher.post(url, {StartCID: startCID});
			if (!validImportReponse(response)) {
				throw new TypeError('Unexpected response to POST: ' + url);
			}
		}
		catch (error) {
			dispatch(setError(`Unable to import comments`, error));
			return;
		}
		dispatch(updateBallotSuccess(ballot_id, response.ballot));
	}

function validUploadResponse(response: any): response is {comments: CommentResolution[]; ballot: Ballot} {
	return isObject(response) &&
		Array.isArray(response.comments) && response.comments.every(validCommentResolution) &&
		validBallot(response.ballot);
}

export const uploadComments = (ballot_id: number, type, file): AppThunk =>
	async (dispatch) => {
		const url = `${baseCommentsUrl}/${ballot_id}/upload`;
		let response: any;
		try {
			response = await fetcher.postMultipart(url, {CommentsFile: file});
			if (!validUploadResponse(response))
				throw new TypeError("Unexpected response");
		}
		catch (error) {
			dispatch(setError(`Unable to upload comments for ${ballot_id}`, error));
			return;
		}
		const {comments, ballot} = response;
		dispatch(getSuccess(comments));
		dispatch(setDetails({ballot_id}));
		dispatch(updateBallotSuccess(ballot.id, ballot));
	}

export const setStartCommentId = (ballot_id: number, startCommentId: number): AppThunk =>
	async (dispatch, getState) => {
		const url = `${baseCommentsUrl}/${ballot_id}/startCommentId`;
		let response: any;
		try {
			response = await fetcher.patch(url, {StartCommentID: startCommentId});
			if (!validUploadResponse(response))
				throw new TypeError("Unexpected response");
		}
		catch (error) {
			dispatch(setError("Unable to set start CID", error));
			return;
		}
		const {comments, ballot} = response;
		dispatch(updateBallotSuccess(ballot.id, ballot));
		if (ballot_id === selectCommentsBallotId(getState())) {
			dispatch(getSuccess(comments));
		}
	}

const defaultResolution: Partial<Resolution> = {
	AssigneeSAPIN: 0,
	AssigneeName: '',
	ResnStatus: null,
	Resolution: '',
	Submission: '',
	ReadyForMotion: false,
	ApprovedByMotion: '',
	EditStatus: '',
	EditInDraft: '',
	EditNotes: '',
};

const updateMany = (updates: Update<CommentResolution>[]): AppThunk => 
	async (dispatch, getState) => {
		const state = getState();
		const {entities, ballot_id} = selectCommentsState(state);
		const lastModified = selectCommentsLastModified(state);

		const rollbackUpdates = updates.map(u => {
			const id = u.id;
			const changes = {};
			const entity = entities[id]!;
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

const removeMany = (ids: EntityId[]): AppThunk => 
	async (dispatch, getState) => {
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

export const addResolutions = (resolutions: ResolutionCreate[]): AppThunk =>
	async (dispatch, getState) => {
		const state = getState();
		const {ids, entities, ballot_id} = selectCommentsState(state);
		const lastModified = selectCommentsLastModified(state);

		const selected: EntityId[] = [],
			  updates: Update<CommentResolution>[] = [],
			  adds: CommentResolution[] = [],
			  remoteAdds: ResolutionCreate[] = [];
		for (const r of resolutions) {
			// Find all entries for this comment_id
			const comments: CommentResolution[] = [];
			for (const id of ids) {
				const c = entities[id]!;
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

export const deleteResolutions = (delete_ids: any[]): AppThunk =>
	async (dispatch, getState) => {
		const {ids, entities} = selectCommentsState(getState());

		// Organize by comment_id
		const toDelete = {},
		      toDeleteCommentIDs: number[] = [];
		for (const id of delete_ids) {
			const comment_id = entities[id]!.comment_id;
			if (toDeleteCommentIDs.includes(comment_id)) {
				toDelete[comment_id].push(id);
			}
			else {
				toDelete[comment_id] = [id];
				toDeleteCommentIDs.push(comment_id);
			}
		}

		const deletes: EntityId[] = [],
		      updates: Update<CommentResolution>[] = [],
		      commentUpdates: Update<CommentResolution>[] = [],
		      selected: EntityId[] = [];
		for (const comment_id of toDeleteCommentIDs) {
			const resolution_ids = toDelete[comment_id];

			// Sort by ResolutionID
			resolution_ids.sort(id => entities[id]!.ResolutionID);

			// Find all comments that would remain
			const remainingComments: CommentResolution[] = [];
			for (const id of ids) {
				const c = entities[id]!;
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

export type UploadResult = {
	matched: number[];
	unmatched: number[];
	added: number[];
	remaining: number[];
	updated: number;
}
export const uploadResolutions = (ballot_id: number, toUpdate, matchAlgorithm, matchUpdate, sheetName: string, file): AppThunk<UploadResult | undefined> =>
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
			dispatch(setError("Unable to upload resolutions", error));
			return;
		}
		const {comments, ballot, matched, unmatched, added, remaining, updated} = response;
		dispatch(getSuccess(comments));
		dispatch(setDetails({ballot_id}));
		dispatch(updateBallotSuccess(ballot.id, ballot));
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

export const exportCommentsSpreadsheet = (ballot_id: number, file: any, format: string, style: string): AppThunk =>
	async (dispatch, getState) => {
		try {
			let Filename: string | undefined;
			if (file)
				Filename = file.name;
			const url = `${baseCommentsUrl}/${ballot_id}/export/` + format;
			await fetcher.postForFile(url, {Filename, Style: style}, file);
		}
		catch(error) {
			const ballot = selectBallotEntities(getState())[ballot_id];
			const ballotId = ballot?.BallotID || `id=${ballot_id}`;
			dispatch(setError(`Unable to export comments for ballot ${ballotId}`, error));
		}
	}
