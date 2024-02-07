import { v4 as uuid } from "uuid";
import { createSelector, createAction } from "@reduxjs/toolkit";
import type {
	Action,
	PayloadAction,
	EntityId,
	Dictionary,
} from "@reduxjs/toolkit";
import {
	fetcher,
	setError,
	createAppTableDataSlice,
	FieldType,
	getAppTableDataSelectors,
	isObject,
	FieldProperties,
} from "dot11-components";

import type { RootState, AppThunk } from ".";
import { AccessLevel } from "./user";
import {
	updateBallotsLocal,
	selectBallotEntities,
	selectBallot,
	validBallotCommentsSummary,
	BallotCommentsSummary,
} from "./ballots";
import { selectGroupPermissions } from "./groups";
import { offlineFetch } from "./offline";

export type CategoryType = "T" | "E" | "G";

export type Comment = {
	id: number;
	ballot_id: number;
	CommentID: number;
	CommenterSAPIN: number | null;
	CommenterName: string;
	CommenterEmail: string;
	Vote: string;
	Category: CategoryType;
	C_Clause: string;
	C_Page: string;
	C_Line: string;
	C_Index: number;
	MustSatisfy: boolean;
	Clause: string | null;
	Page: number | null;
	Comment: string;
	AdHoc: string;
	AdHocGroupId: string | null;
	Notes: string | null;
	CommentGroup: string;
	ProposedChange: string;
	LastModifiedBy: number | null;
	LastModifiedTime: string | null;
};

export type ResnStatusType = "A" | "V" | "J";
export type EditStatusType = "I" | "N";

export type Resolution = {
	id: string;
	comment_id: number;
	ResolutionID: number;
	AssigneeSAPIN: number | null;
	AssigneeName: string;
	ResnStatus: ResnStatusType | null;
	Resolution: string | null;
	ApprovedByMotion: string;
	ReadyForMotion: boolean;
	Submission: string;
	EditStatus: EditStatusType | null;
	EditNotes: string | null;
	EditInDraft: string;
	LastModifiedBy: number | null;
	LastModifiedTime: string | null;
};

export type ResolutionCreate = Partial<Omit<Resolution, "comment_id">> & {
	comment_id: number;
};

export type ResolutionUpdate = {
	id: string;
	changes: Partial<Resolution>;
};

export type CommentResolution = Omit<Comment, "id"> &
	Omit<Resolution, "id"> & {
		id: any;
		resolution_id: string;
		ResolutionID: number;
		ResolutionCount: number;
		CID: string;
	};

const mustSatisfyOptions = [
	{ value: 0, label: "No" },
	{ value: 1, label: "Yes" },
];

export const categoryMap = {
	T: "Technical",
	E: "Editorial",
	G: "General",
} as const;

const categoryOptions = Object.entries(categoryMap).map(([value, label]) => ({
	value: value as keyof typeof categoryMap,
	label,
}));

export const resnStatusMap: Record<ResnStatusType, string> = {
	A: "ACCEPTED",
	V: "REVISED",
	J: "REJECTED",
} as const;

export const resnStatusOptions: {
	value: ResnStatusType | null;
	label: string;
}[] = (Object.keys(resnStatusMap) as ResnStatusType[]).map(
	(value: ResnStatusType | null) => ({
		value,
		label: resnStatusMap[value!],
	})
);
resnStatusOptions.unshift({ value: null, label: "(Blank)" });

const editStatusOptions = [
	{ value: null, label: "(Blank)" },
	{ value: "I", label: "Implemented" },
	{ value: "N", label: "No change" },
];

const mustSatisfyLabels = mustSatisfyOptions.reduce((obj, o) => {
	obj[o.value] = o.label;
	return obj;
}, {} as Record<number, string>);

export const getCID = (c: CommentResolution) =>
	c.CommentID + (c.ResolutionCount > 1 ? "." + c.ResolutionID : "");

export const commentStatusOrder = [
	"",
	"Assigned",
	"Resolution drafted",
	"Ready for motion",
	"Resolution approved",
] as const;

const commentStatusOptions = commentStatusOrder.map((value) => ({
	value,
	label: value ? value : "(Blank)",
}));

export type CommentStatusType = (typeof commentStatusOrder)[number];

export function getCommentStatus(c: CommentResolution) {
	let Status: CommentStatusType = "";
	if (c.ApprovedByMotion) Status = "Resolution approved";
	else if (c.ReadyForMotion) Status = "Ready for motion";
	else if (c.ResnStatus) Status = "Resolution drafted";
	else if (c.AssigneeName) Status = "Assigned";
	return Status;
}

export const fields: Record<string, FieldProperties> = {
	CID: { label: "CID", type: FieldType.STRING },
	CommenterName: { label: "Commenter" },
	Vote: { label: "Vote" },
	MustSatisfy: {
		label: "MBS",
		dataRenderer: (v: number) => mustSatisfyLabels[v],
		options: mustSatisfyOptions,
		type: FieldType.NUMERIC,
	},
	Category: {
		label: "Category",
		dataRenderer: (v: CategoryType) => categoryMap[v],
		options: categoryOptions,
	},
	Clause: { label: "Clause", type: FieldType.CLAUSE },
	Page: {
		label: "Page",
		type: FieldType.NUMERIC,
		dataRenderer: (v) => v.toFixed(2),
	},
	Comment: { label: "Comment" },
	ProposedChange: { label: "Proposed change" },
	AdHoc: { label: "Ad-hoc" },
	CommentGroup: { label: "Group" },
	Notes: { label: "Notes" },
	AssigneeName: { label: "Assignee" },
	Submission: { label: "Submission" },
	Status: { label: "Status", options: commentStatusOptions },
	ApprovedByMotion: { label: "Approval motion" },
	ResnStatus: { label: "Resn Status", options: resnStatusOptions },
	Resolution: { label: "Resolution" },
	EditStatus: { label: "Editing Status", options: editStatusOptions },
	EditInDraft: { label: "In Draft" },
	EditNotes: { label: "Editing Notes" },
};

//const selectId = (c) => c.id; //c.CID;

export const getField = (entity: CommentResolution, dataKey: string) => {
	if (dataKey === "CID") return getCID(entity);
	if (dataKey === "Status") return getCommentStatus(entity);
	return entity[dataKey as keyof CommentResolution];
};

type Update<T> = {
	id: EntityId;
	changes: Partial<T>;
};

function getResolutionCountUpdates(
	ids: EntityId[],
	entities: Dictionary<CommentResolution>,
	comment_ids: number[]
) {
	const updates: Update<CommentResolution>[] = [];
	for (const comment_id of comment_ids) {
		const comments: CommentResolution[] = [];
		for (const id of ids) {
			const c = entities[id]!;
			if (c.comment_id === comment_id) comments.push(c);
		}
		const ResolutionCount = comments.length;
		updates.push(
			...comments.map((c) => ({ id: c.id, changes: { ResolutionCount } }))
		);
	}
	return updates;
}

const initialState: {
	ballot_id: number | null;
} = {
	ballot_id: null,
};

const dataSet = "comments";
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	sortComparer: (c1: CommentResolution, c2: CommentResolution) =>
		c1.CommentID === c2.CommentID
			? c1.ResolutionID - c2.ResolutionID
			: c1.CommentID - c2.CommentID,
	initialState,
	reducers: {
		setDetails(state, action: PayloadAction<Partial<typeof initialState>>) {
			const changes = action.payload;
			return { ...state, ...changes };
		},
	},
	extraReducers: (builder, dataAdapter) => {
		builder
			.addMatcher(
				(action: Action) => action.type === getPending.toString(),
				(state, action: ReturnType<typeof getPending>) => {
					const { ballot_id } = action.payload;
					if (ballot_id !== state.ballot_id) {
						dataAdapter.removeAll(state);
						state.valid = false;
					}
					state.ballot_id = ballot_id;
				}
			)
			.addMatcher(
				(action: Action) => action.type === clearComments.toString(),
				(state) => {
					dataAdapter.removeAll(state);
					state.valid = false;
				}
			)
			.addMatcher(
				(action) => action.type === getCommit.toString(),
				(state, action: ReturnType<typeof getCommit>) => {
					const comments = action.payload;
					const updates = comments.map((c) => ({
						id: c.id,
						changes: c,
					}));
					dataAdapter.updateMany(state, updates);
				}
			)
			.addMatcher(
				(action) => action.type === updateCommit.toString(), //dataSet + '/updateCommit',
				(state, action: ReturnType<typeof updateCommit>) => {
					const { comments } = action.payload;
					const updates = comments.map((c) => ({
						id: c.id,
						changes: c,
					}));
					dataAdapter.updateMany(state, updates);
				}
			)
			.addMatcher(
				(action) => action.type === addManyRollback.toString(), //.startsWith(dataSet + '/') && /(addManyRollback)$/.test(action.type),
				(state, action: ReturnType<typeof addManyRollback>) => {
					const added_ids = action.payload;
					if (!Array.isArray(added_ids))
						console.error("missing or bad payload; expected array");
					const comment_ids = added_ids.map(
						(id) => state.entities[id]!.comment_id
					);
					dataAdapter.removeMany(state, added_ids);
					const { ids, entities } = state;
					const updates = getResolutionCountUpdates(
						ids,
						entities,
						comment_ids
					);
					dataAdapter.updateMany(state, updates);
				}
			)
			.addMatcher(
				(action) => action.type === removeManyRollback.toString(), //.startsWith(dataSet + '/') && /(removeManyRollback)$/.test(action.type),
				(state, action: ReturnType<typeof removeManyRollback>) => {
					const comments = action.payload;
					if (!Array.isArray(comments))
						console.error("missing or bad payload; expected array");
					dataAdapter.addMany(state, comments);
					const { ids, entities } = state;
					const comment_ids = comments.map((c) => c.comment_id);
					const updates = getResolutionCountUpdates(
						ids,
						entities,
						comment_ids
					);
					dataAdapter.updateMany(state, updates);
				}
			);
	},
});

export default slice;

/* Slice actions */
export const commentsActions = slice.actions;

const {
	setDetails,
	getSuccess,
	getFailure,
	addMany: localAddMany,
	updateMany: localUpdateMany,
	removeMany: localRemoveMany,
	setSelected,
	setUiProperties,
} = slice.actions;

// Overload getPending() with one that sets ballot_id
const getPending = createAction<{ ballot_id: number | null }>(
	dataSet + "/getPending"
);
export const clearComments = createAction(dataSet + "/clear");

const getCommit = createAction<CommentResolution[]>(dataSet + "/getCommit");
const updateCommit = createAction<{ comments: CommentResolution[] }>(
	dataSet + "/updateCommit"
);
const addManyRollback = createAction<EntityId[]>(dataSet + "/addManyRollback");
const removeManyRollback = createAction<CommentResolution[]>(
	dataSet + "/removeManyRollback"
);

export { setUiProperties };

/*
 * Selectors
 */
export const selectCommentsState = (state: RootState) => state[dataSet];
export const selectCommentIds = (state: RootState) =>
	selectCommentsState(state).ids;
export const selectCommentEntities = (state: RootState) =>
	selectCommentsState(state).entities;
export const selectCommentsBallot_id = (state: RootState) =>
	selectCommentsState(state).ballot_id;

export const selectCommentsAccess = (state: RootState) => {
	const { ballot_id } = selectCommentsState(state);
	const ballot = ballot_id ? selectBallot(state, ballot_id) : undefined;
	return (
		(ballot?.groupId &&
			selectGroupPermissions(state, ballot.groupId).comments) ||
		AccessLevel.none
	);
};

const selectCommentsLastModified = createSelector(
	selectCommentIds,
	selectCommentEntities,
	(ids, entities) => {
		let lastModified = 0;
		ids.forEach((id) => {
			const c = entities[id]!;
			const d = c.LastModifiedTime ? Date.parse(c.LastModifiedTime) : 0;
			if (d > lastModified) lastModified = d;
			return lastModified;
		});
		return new Date(lastModified).toISOString();
	}
);

export const commentsSelectors = getAppTableDataSelectors(selectCommentsState, {
	getField,
});

/*
 * Thunk actions
 */
const baseCommentsUrl = "/api/comments";
const baseResolutionsUrl = "/api/resolutions";

function validCommentResolution(c: any): c is CommentResolution {
	return (
		isObject(c) &&
		(typeof c.id === "string" || typeof c.id === "number") &&
		typeof c.comment_id === "number"
	);
}

function validGetResponse(response: any): response is CommentResolution[] {
	return Array.isArray(response) && response.every(validCommentResolution);
}

export const loadComments =
	(ballot_id: number): AppThunk =>
	async (dispatch, getState) => {
		dispatch(getPending({ ballot_id }));
		const url = `${baseCommentsUrl}/${ballot_id}`;
		let response: any;
		try {
			response = await fetcher.get(url);
			if (!validGetResponse(response))
				throw new TypeError("Unexpected response");
		} catch (error) {
			const ballot = selectBallotEntities(getState())[ballot_id];
			const ballotId = ballot?.BallotID || `id=${ballot_id}`;
			dispatch(getFailure());
			dispatch(setError(`Unable to get comments for ${ballotId}`, error));
			return;
		}
		dispatch(getSuccess(response));
	};

export const getCommentUpdates = (): AppThunk => async (dispatch, getState) => {
	const state = getState();
	const ballot_id = selectCommentsBallot_id(state);
	if (!ballot_id) return;
	const lastModified = selectCommentsLastModified(state);
	dispatch(
		offlineFetch({
			effect: {
				url: `${baseCommentsUrl}/${ballot_id}`,
				method: "GET",
				params: { modifiedSince: lastModified },
			},
			commit: { type: getCommit.toString() /*dataSet + '/getCommit'*/ },
		})
	);
};

type CommentUpdate = {
	id: number;
	changes: Partial<Comment>;
};

export const updateComments =
	(updates: CommentUpdate[]): AppThunk =>
	async (dispatch, getState) => {
		const state = getState();
		const { ids, entities, ballot_id } = selectCommentsState(state);
		const lastModified = selectCommentsLastModified(state);

		const localUpdates: Update<CommentResolution>[] = [],
			rollbackUpdates: Update<CommentResolution>[] = [];
		for (const id of ids) {
			const c = entities[id]!;
			const comment_id = c.comment_id;
			const u = updates.find((u) => u.id === comment_id);
			if (u) {
				localUpdates.push({ id, changes: u.changes });
				const changes: Partial<Comment> = {};
				for (const key of Object.keys(
					u.changes
				) as (keyof typeof u.changes)[])
					changes[key] = c[key];
				rollbackUpdates.push({ id, changes });
			}
		}
		dispatch(localUpdateMany(localUpdates));
		dispatch(
			offlineFetch({
				effect: {
					url: `${baseCommentsUrl}/${ballot_id}?modifiedSince=${lastModified}`,
					method: "PATCH",
					params: updates,
				},
				commit: { type: updateCommit.toString() },
				rollback: localUpdateMany(rollbackUpdates), //{type: localUpdateMany.toString(), payload: rollbackUpdates}
			})
		);
	};

export const deleteComments =
	(ballot_id: number): AppThunk =>
	async (dispatch, getState) => {
		if (selectCommentsBallot_id(getState()) === ballot_id)
			await dispatch(clearComments());
		const summary = { Count: 0, CommentIDMin: 0, CommentIDMax: 0 };
		dispatch(updateBallotsLocal([{ id: ballot_id, Comments: summary }]));

		try {
			await fetcher.delete(`${baseCommentsUrl}/${ballot_id}`);
		} catch (error) {
			dispatch(setError(`Unable to delete comments`, error));
		}
	};

function validUploadResponse(response: any): response is {
	comments: CommentResolution[];
	ballot: BallotCommentsSummary;
} {
	return (
		isObject(response) &&
		Array.isArray(response.comments) &&
		response.comments.every(validCommentResolution) &&
		validBallotCommentsSummary(response.ballot)
	);
}

export const importComments =
	(ballot_id: number, startCommentId: number): AppThunk =>
	async (dispatch, getState) => {
		const url = `${baseCommentsUrl}/${ballot_id}/import`;
		let response: any;
		try {
			response = await fetcher.post(url, { startCommentId });
			if (!validUploadResponse(response))
				throw new TypeError("Unexpected response to POST " + url);
		} catch (error) {
			dispatch(setError(`Unable to import comments`, error));
			return;
		}
		const { comments, ballot } = response;
		dispatch(updateBallotsLocal([ballot]));
		if (ballot_id === selectCommentsBallot_id(getState()))
			dispatch(getSuccess(comments));
	};

export const uploadComments =
	(ballot_id: number, file: File): AppThunk =>
	async (dispatch, getState) => {
		const url = `${baseCommentsUrl}/${ballot_id}/upload`;
		const params = {
			params: JSON.stringify({ startCommentId: 1 }),
			CommentsFile: file,
		};
		let response: any;
		try {
			response = await fetcher.postMultipart(url, params);
			if (!validUploadResponse(response))
				throw new TypeError("Unexpected response to POST " + url);
		} catch (error) {
			dispatch(
				setError(`Unable to upload comments for ${ballot_id}`, error)
			);
			return;
		}
		const { comments, ballot } = response;
		dispatch(updateBallotsLocal([ballot]));
		if (ballot_id === selectCommentsBallot_id(getState()))
			dispatch(getSuccess(comments));
	};

export const uploadUserComments =
	(ballot_id: number, sapin: number, file: File): AppThunk =>
	async (dispatch, getState) => {
		const url = `${baseCommentsUrl}/${ballot_id}/userUpload`;
		const params = {
			params: JSON.stringify({ SAPIN: sapin }),
			CommentsFile: file,
		};
		let response: any;
		try {
			response = await fetcher.postMultipart(url, params);
			if (!validUploadResponse(response))
				throw new TypeError("Unexpected response to POST " + url);
		} catch (error) {
			dispatch(
				setError(`Unable to upload comments for ${ballot_id}`, error)
			);
			return;
		}
		const { comments, ballot } = response;
		dispatch(updateBallotsLocal([ballot]));
		if (ballot_id === selectCommentsBallot_id(getState()))
			dispatch(localAddMany(comments));
	};

export const setStartCommentId =
	(ballot_id: number, startCommentId: number): AppThunk =>
	async (dispatch, getState) => {
		const url = `${baseCommentsUrl}/${ballot_id}/startCommentId`;
		let response: any;
		try {
			response = await fetcher.patch(url, { startCommentId });
			if (!validUploadResponse(response))
				throw new TypeError("Unexpected response to PATCH " + url);
		} catch (error) {
			dispatch(setError("Unable to set start CID", error));
			return;
		}
		const { comments, ballot } = response;
		dispatch(updateBallotsLocal([ballot]));
		if (ballot_id === selectCommentsBallot_id(getState()))
			dispatch(getSuccess(comments));
	};

const defaultResolution: Partial<Resolution> = {
	AssigneeSAPIN: 0,
	AssigneeName: "",
	ResnStatus: null,
	Resolution: "",
	Submission: "",
	ReadyForMotion: false,
	ApprovedByMotion: "",
	EditStatus: null,
	EditInDraft: "",
	EditNotes: "",
};

const updateMany =
	(updates: Update<CommentResolution>[]): AppThunk =>
	async (dispatch, getState) => {
		const state = getState();
		const { entities, ballot_id } = selectCommentsState(state);
		const lastModified = selectCommentsLastModified(state);

		const rollbackUpdates = updates.map((u) => {
			const id = u.id;
			const changes: Partial<CommentResolution> = {};
			const entity = entities[id]!;
			for (const key of Object.keys(u.changes) as Array<
				keyof typeof u.changes
			>)
				changes[key] = entity[key];
			return { id, changes };
		});
		dispatch(localUpdateMany(updates));
		dispatch(
			offlineFetch({
				effect: {
					url: `${baseResolutionsUrl}/${ballot_id}?modifiedSince=${lastModified}`,
					method: "PATCH",
					params: updates,
				},
				commit: { type: updateCommit.toString() },
				rollback: localUpdateMany(rollbackUpdates), //{type: localUpdateMany.toString(), payload: rollbackUpdates}
			})
		);
	};

const removeMany =
	(ids: EntityId[]): AppThunk =>
	async (dispatch, getState) => {
		const state = getState();
		const { entities, ballot_id } = selectCommentsState(state);
		const lastModified = selectCommentsLastModified(state);

		const comments = ids.map((id) => entities[id]!);
		dispatch(localRemoveMany(ids));
		dispatch(
			offlineFetch({
				effect: {
					url: `${baseResolutionsUrl}/${ballot_id}?modifiedSince=${lastModified}`,
					method: "DELETE",
					params: ids,
				},
				commit: { type: updateCommit.toString() },
				rollback: removeManyRollback(comments), //{type: dataSet + '/removeManyRollback', payload: comments}
			})
		);
	};

export const addResolutions =
	(resolutions: ResolutionCreate[]): AppThunk =>
	async (dispatch, getState) => {
		const state = getState();
		const { ids, entities, ballot_id } = selectCommentsState(state);
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
				if (c.comment_id === r.comment_id) comments.push(c);
			}

			if (comments.length === 0) {
				console.warn("Invalid comment_id=", r.comment_id);
				continue;
			}

			// Find a unique ResolutionID
			const existingResolutionIDs = new Set(
				comments.map((c) => c.ResolutionID)
			);
			let ResolutionID = 0;
			while (existingResolutionIDs.has(ResolutionID)) ResolutionID++;

			// Generate a resolution
			const resolution_id = uuid();
			const resolution = {
				...defaultResolution,
				...r,
				ResolutionID,
				id: resolution_id,
			};
			remoteAdds.push(resolution);

			// Generate CommentResolution changes
			const ResolutionCount = comments.length + 1;
			const changes = {
				...resolution,
				ResolutionCount,
				resolution_id,
				id: resolution_id,
			};

			if (comments.length === 1 && !comments[0].resolution_id) {
				// Existing comment does not have a resolution; apply changes
				updates.push({ id: comments[0].id, changes });
			} else {
				// Copy the comment fields to produce new CommentResolution entry
				const newComment = { ...comments[0], ...changes };
				adds.push(newComment);

				// Update ResolutionCount for other comments
				updates.push(
					...comments.map((c) => ({
						id: c.id,
						changes: { ResolutionCount },
					}))
				);
			}

			// Select the newly added entry
			selected.push(resolution_id);
		}
		dispatch(localUpdateMany(updates));
		dispatch(localAddMany(adds));
		dispatch(
			offlineFetch({
				effect: {
					url: `${baseResolutionsUrl}/${ballot_id}?modifiedSince=${lastModified}`,
					method: "POST",
					params: remoteAdds,
				},
				commit: { type: updateCommit.toString() },
				rollback: addManyRollback(adds.map((c) => c.id)), //{type: dataSet + '/addManyRollback', payload: adds.map(c => c.id)}
			})
		);
		dispatch(setSelected(selected));
	};

export const updateResolutions = updateMany;

export const deleteResolutions =
	(delete_ids: EntityId[]): AppThunk =>
	async (dispatch, getState) => {
		const { ids, entities } = selectCommentsState(getState());

		// Organize by comment_id
		const toDelete: Record<number, EntityId[]> = {},
			toDeleteCommentIDs: number[] = [];
		for (const id of delete_ids) {
			const comment_id = entities[id]!.comment_id;
			if (toDeleteCommentIDs.includes(comment_id)) {
				toDelete[comment_id].push(id);
			} else {
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
			resolution_ids.sort(
				(id1, id2) =>
					entities[id1]!.ResolutionID - entities[id2]!.ResolutionID
			);

			// Find all comments that would remain
			const remainingComments = ids
				.map((id) => entities[id]!)
				.filter(
					(c) =>
						c.comment_id === comment_id &&
						!resolution_ids.includes(c.id)
				);

			if (remainingComments.length === 0) {
				// No resolutions would remain with this comment_id
				// Update the first to defaults and delete the rest
				const id = resolution_ids.shift()!;
				updates.push({
					id,
					changes: { ...defaultResolution, ResolutionCount: 1 },
				});
				if (resolution_ids.length > 0) deletes.push(...resolution_ids);

				// Select the remaining comment
				selected.push(id);
			} else {
				// Resolutions still exist for this comment_id, delete all
				deletes.push(...resolution_ids);

				// Update the ResolutionCount for the remaining comments
				const ResolutionCount = remainingComments.length;
				commentUpdates.push(
					...remainingComments.map((c) => ({
						id: c.id,
						changes: { ResolutionCount },
					}))
				);

				// Select the first of the remaining comments
				selected.push(remainingComments[0].id);
			}
		}
		if (deletes.length) dispatch(removeMany(deletes));
		if (updates.length) dispatch(updateMany(updates));
		if (commentUpdates.length) dispatch(localUpdateMany(commentUpdates));
		dispatch(setSelected(selected));
	};

export type FieldToUpdate =
	| "cid"
	| "clausepage"
	| "adhoc"
	| "assignee"
	| "resolution"
	| "editing";
export type MatchAlgo = "cid" | "comment" | "elimination";
export type MatchUpdate = "all" | "any" | "add";

export type UploadResult = {
	matched: number[];
	unmatched: number[];
	added: number[];
	remaining: number[];
	updated: number;
};

function validUploadResolutionsResponse(response: any): response is {
	comments: CommentResolution[];
	ballot: BallotCommentsSummary;
} & UploadResult {
	return (
		isObject(response) &&
		Array.isArray(response.comments) &&
		response.comments.every(validCommentResolution) &&
		validBallotCommentsSummary(response.ballot) &&
		Array.isArray(response.matched) &&
		Array.isArray(response.unmatched) &&
		Array.isArray(response.added) &&
		Array.isArray(response.remaining) &&
		typeof response.updated === "number"
	);
}

export const uploadResolutions =
	(
		ballot_id: number,
		toUpdate: FieldToUpdate[],
		matchAlgorithm: MatchAlgo,
		matchUpdate: MatchUpdate,
		sheetName: string,
		file: File
	): AppThunk<UploadResult | undefined> =>
	async (dispatch) => {
		const url = `${baseResolutionsUrl}/${ballot_id}/upload`;
		const parts = {
			params: JSON.stringify({
				toUpdate,
				matchAlgorithm,
				matchUpdate,
				sheetName,
			}),
			ResolutionsFile: file,
		};
		let response: any;
		try {
			response = await fetcher.postMultipart(url, parts);
			if (!validUploadResolutionsResponse(response))
				throw new TypeError("Unexpected response");
		} catch (error) {
			dispatch(setError("Unable to upload resolutions", error));
			return;
		}
		const {
			comments,
			ballot,
			matched,
			unmatched,
			added,
			remaining,
			updated,
		} = response;
		dispatch(getSuccess(comments));
		dispatch(setDetails({ ballot_id }));
		dispatch(updateBallotsLocal([ballot]));
		return { matched, unmatched, added, remaining, updated };
	};

export type CommentsSpreadsheetFormat = "myproject" | "legacy" | "modern";
export type CommentsSpreadsheetStyle =
	| "AllComments"
	| "TabPerAdHoc"
	| "TabPerCommentGroup";

export const exportCommentsSpreadsheet =
	(
		ballot_id: number,
		format: CommentsSpreadsheetFormat,
		style: CommentsSpreadsheetStyle,
		file: File
	): AppThunk =>
	async (dispatch, getState) => {
		const url = `${baseCommentsUrl}/${ballot_id}/export?format=${format}`;
		try {
			await fetcher.postForFile(url, { style }, file);
		} catch (error) {
			const ballot = selectBallotEntities(getState())[ballot_id];
			const ballotId = ballot?.BallotID || `id=${ballot_id}`;
			dispatch(
				setError(
					`Unable to export comments for ballot ${ballotId}`,
					error
				)
			);
		}
	};
