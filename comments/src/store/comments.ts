import { v4 as uuid } from "uuid";
import { createSelector, createAction } from "@reduxjs/toolkit";
import type { Action, EntityId, Dictionary } from "@reduxjs/toolkit";
import {
	fetcher,
	setError,
	createAppTableDataSlice,
	getAppTableDataSelectors,
	FieldType,
	Fields,
} from "@common";

import type { RootState, AppThunk } from ".";
import {
	updateBallotsLocal,
	selectBallotEntities,
	selectBallot,
	BallotType,
	Ballot,
} from "./ballots";
import { selectGroup, AccessLevel } from "./groups";
import { Effect, offlineFetch } from "./offline";
import {
	Comment,
	CategoryType,
	CommentUpdate,
	CommentResolution,
	commentResolutionsSchema,
	uploadCommentsResponseSchema,
	CommentChange,
	CommentsExportParams,
	CommentsExportFormat,
	CommentsExportStyle,
	AdHocStatus,
	commentStatusOrder,
	getCommentStatus,
	//CommentStatusType,
} from "@schemas/comments";
import {
	Resolution,
	ResnStatusType,
	EditStatusType,
	ResolutionUpdate,
	ResolutionCreate,
	ResolutionChange,
} from "@schemas/resolutions";
import {
	uploadResolutionsResponseSchema,
	UploadResolutionsResponse,
	ResolutionsUploadParams,
} from "@schemas/uploadResolutions";

export type {
	Comment,
	CategoryType,
	Resolution,
	ResnStatusType,
	EditStatusType,
	ResolutionUpdate,
	ResolutionCreate,
	ResolutionChange,
	CommentResolution,
	CommentsExportFormat,
	CommentsExportStyle,
};
export { AdHocStatus, AccessLevel, commentStatusOrder, getCommentStatus };

export type CommentResolutionChange = CommentChange &
	ResolutionChange & { ResolutionCount?: number };
export type CommentResolutionUpdate = {
	id: EntityId;
	changes: CommentResolutionChange;
};

const mustSatisfyOptions = [
	{ value: 0, label: "No" },
	{ value: 1, label: "Yes" },
];

export const categoryMap: Record<CategoryType, string> = {
	T: "Technical",
	E: "Editorial",
	G: "General",
} as const;

const categoryOptions = Object.entries(categoryMap).map(([value, label]) => ({
	value: value as keyof typeof categoryMap,
	label,
}));

export const resnStatusMap: Record<ResnStatusType, string> = {
	"": "",
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

const mustSatisfyLabels = mustSatisfyOptions.reduce(
	(obj, o) => {
		obj[o.value] = o.label;
		return obj;
	},
	{} as Record<number, string>
);

function getCID(b: Ballot | undefined, c: CommentResolution) {
	let CID: string;
	if (b && b.Type === BallotType.SA)
		CID = (b.stage === 0 ? "I" : "R" + b.stage) + "-" + c.CommentID;
	else CID = c.CommentID.toString();
	if (c.ResolutionCount > 1) CID += "." + c.ResolutionID;
	return CID;
}

const commentStatusOptions = commentStatusOrder.map((value) => ({
	value,
	label: value ? value : "(Blank)",
}));

export const fields: Fields = {
	CID: { label: "CID", type: FieldType.NUMERIC },
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

export function getField(entity: CommentResolution, dataKey: string) {
	//if (dataKey === "CID") return getCID(entity);
	if (dataKey === "Status") return getCommentStatus(entity);
	return entity[dataKey as keyof CommentResolution];
}

type Update<T> = {
	id: EntityId;
	changes: Partial<T>;
};

function getResolutionCountUpdates(
	ids: EntityId[],
	entities: Dictionary<CommentResolution>,
	comment_ids: number[]
) {
	const updates: CommentResolutionUpdate[] = [];
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

const initialState = {
	ballot_id: null as number | null,
	lastLoad: null as string | null,
	roleGroupId: undefined as string | null | undefined,
};

const dataSet = "comments";
const sortComparer = (c1: CommentResolution, c2: CommentResolution) =>
	c1.CommentID === c2.CommentID
		? (c1.ResolutionID || 0) - (c2.ResolutionID || 0)
		: c1.CommentID - c2.CommentID;
const slice = createAppTableDataSlice({
	name: dataSet,
	fields,
	sortComparer,
	initialState,
	reducers: {
		setRoleGroupId(state, action: { payload: string | null }) {
			state.roleGroupId = action.payload;
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
						state.roleGroupId = undefined;
					}
					state.ballot_id = ballot_id;
					state.lastLoad = new Date().toISOString();
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
				(action) => action.type === updateCommit.toString(),
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
				(action) => action.type === addManyRollback.toString(),
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
				(action) => action.type === removeManyRollback.toString(),
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
	getSuccess,
	getFailure,
	addMany: localAddMany,
	updateMany: localUpdateMany,
	removeMany: localRemoveMany,
	setSelected,
	setUiProperties,
	setRoleGroupId,
	setPanelIsSplit,
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

export { setSelected, setUiProperties, setRoleGroupId, setPanelIsSplit };

/*
 * Selectors
 */
export const selectCommentsState = (state: RootState) => state[dataSet];
const selectCommentsAge = (state: RootState) => {
	const lastLoad = selectCommentsState(state).lastLoad;
	if (!lastLoad) return NaN;
	return new Date().valueOf() - new Date(lastLoad).valueOf();
};
export const selectCommentIds = (state: RootState) =>
	selectCommentsState(state).ids;
export const selectCommentEntities = (state: RootState) =>
	selectCommentsState(state).entities;
export const selectCommentsBallot_id = (state: RootState) =>
	selectCommentsState(state).ballot_id;
export const selectRoleGroupId = (state: RootState) =>
	selectCommentsState(state).roleGroupId;

export const selectCommentsBallot = (state: RootState) => {
	const ballot_id = selectCommentsBallot_id(state);
	return ballot_id ? selectBallot(state, ballot_id) : undefined;
};

export const selectCommentsAccess = (state: RootState) => {
	const ballot = selectCommentsBallot(state);
	if (ballot) {
		const group = selectGroup(state, ballot.groupId);
		return group?.permissions.comments || AccessLevel.ro;
	}
	return AccessLevel.ro;
};

export const selectCommentsRoleAccess = (state: RootState) => {
	const roleGroupId = selectRoleGroupId(state);
	const ballot = selectCommentsBallot(state);
	if (roleGroupId) {
		const group = selectGroup(state, roleGroupId);
		// if the role is for a the ballot group or parent of ballot group, use the group permissions
		if (group && ballot && group.parent_id !== ballot.groupId) {
			return group.permissionsRaw?.comments || AccessLevel.ro;
		}
	}
	return AccessLevel.ro;
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

export const selectSyncedCommentEntities = createSelector(
	selectCommentIds,
	selectCommentEntities,
	selectBallotEntities,
	(ids, entitiesIn, ballotEntities): Record<EntityId, CommentResolution> => {
		const entities = entitiesIn as Record<EntityId, CommentResolution>;
		const changedEntities: Record<EntityId, CommentResolution> = {};
		for (const id of ids) {
			const c = entities[id]!;
			const b = ballotEntities[c.ballot_id];
			const CID = getCID(b, c);
			if (c.CID !== CID) changedEntities[id] = { ...c, CID };
		}
		if (Object.keys(changedEntities).length > 0) {
			return { ...entities, ...changedEntities };
		}
		return entities;
	}
);

export const commentsSelectors = getAppTableDataSelectors(selectCommentsState, {
	selectEntities: selectSyncedCommentEntities,
	getField,
});

export const selectCommentsSearch = createSelector(
	(state: RootState) => selectCommentsState(state).selected,
	selectCommentEntities,
	(state: RootState) =>
		commentsSelectors.selectCurrentPanelConfig(state).isSplit,
	(selected, entities, isSplit) => {
		const searchParams = new URLSearchParams();
		if (isSplit) searchParams.append("detail", "1");
		selected
			.map((id) => {
				const entity = entities[id];
				return entity ? entity.CID : null;
			})
			.forEach((cid) => {
				if (cid) searchParams.append("cid", cid);
			});
		return searchParams.toString();
	}
);

/*
 * Thunk actions
 */
const baseCommentsUrl = "/api/comments";
const baseResolutionsUrl = "/api/resolutions";

const AGE_STALE = 60 * 60 * 1000; // 1 hour
let loading = false;
let loadingPromise: Promise<void>;
export const loadComments =
	(ballot_id: number, force = false): AppThunk =>
	async (dispatch, getState) => {
		const state = getState();
		const currentBallot_id = selectCommentsState(state).ballot_id;
		if (currentBallot_id === ballot_id) {
			if (loading) return loadingPromise;
			const age = selectCommentsAge(state);
			if (!force && age && age < AGE_STALE) return Promise.resolve();
		}
		dispatch(getPending({ ballot_id }));
		// Default role groupId is the ballot group
		if (selectRoleGroupId(getState()) === undefined) {
			const ballot = selectBallot(state, ballot_id);
			dispatch(setRoleGroupId(ballot?.groupId || null));
		}
		const url = `${baseCommentsUrl}/${ballot_id}`;
		loading = true;
		loadingPromise = fetcher
			.get(url)
			.then((response: unknown) => {
				if (selectCommentsBallot_id(getState()) !== ballot_id) return;
				const comments = commentResolutionsSchema.parse(response);
				dispatch(getSuccess(comments));
			})
			.catch((error: unknown) => {
				if (selectCommentsBallot_id(getState()) !== ballot_id) return;
				dispatch(getFailure());
				dispatch(setError("GET " + url, error));
			})
			.finally(() => {
				loading = false;
			});
		return loadingPromise;
	};

export const getCommentUpdates = (): AppThunk => async (dispatch, getState) => {
	const state = getState();
	const ballot_id = selectCommentsBallot_id(state);
	if (!ballot_id) return;
	const modifiedSince = selectCommentsLastModified(state);
	const url = `${baseCommentsUrl}/${ballot_id}`;
	const effect: Effect = {
		url,
		method: "GET",
		params: { modifiedSince },
	};
	const commit: Action = { type: getCommit.toString() };
	dispatch(offlineFetch({ effect, commit }));
};

export const updateComments =
	(updates: CommentUpdate[]): AppThunk =>
	async (dispatch, getState) => {
		const state = getState();
		const { ids, entities, ballot_id } = selectCommentsState(state);
		const lastModified = selectCommentsLastModified(state);

		const localUpdates: CommentResolutionUpdate[] = [],
			rollbackUpdates: CommentResolutionUpdate[] = [];
		for (const id of ids) {
			const c = entities[id]!;
			const comment_id = c.comment_id;
			const u = updates.find((u) => u.id === comment_id);
			if (u) {
				localUpdates.push({ id, changes: u.changes });
				const changes: CommentResolutionChange = {};
				for (const key of Object.keys(
					u.changes
				) as (keyof CommentResolution)[]) {
					// @ts-expect-error - 2322
					changes[key] = c[key];
				}
				rollbackUpdates.push({ id, changes });
			}
		}
		dispatch(localUpdateMany(localUpdates));
		const url = `${baseCommentsUrl}/${ballot_id}?modifiedSince=${lastModified}`;
		const effect: Effect = { url, method: "PATCH", params: updates };
		const commit: Action = { type: updateCommit.toString() };
		const rollback: Action = localUpdateMany(rollbackUpdates);
		dispatch(offlineFetch({ effect, commit, rollback }));
	};

export const deleteComments =
	(ballot_id: number): AppThunk =>
	async (dispatch, getState) => {
		if (selectCommentsBallot_id(getState()) === ballot_id)
			dispatch(clearComments());
		const summary = { Count: 0, CommentIDMin: 0, CommentIDMax: 0 };
		dispatch(updateBallotsLocal([{ id: ballot_id, Comments: summary }]));
		const url = `${baseCommentsUrl}/${ballot_id}`;
		try {
			await fetcher.delete(url);
		} catch (error) {
			dispatch(setError("DELETE " + url, error));
		}
	};

export const importComments =
	(ballot_id: number, startCommentId: number): AppThunk =>
	async (dispatch, getState) => {
		const url = `${baseCommentsUrl}/${ballot_id}/import`;
		try {
			const response = await fetcher.post(url, { startCommentId });
			const { comments, ballot } =
				uploadCommentsResponseSchema.parse(response);
			dispatch(updateBallotsLocal([ballot]));
			if (ballot_id === selectCommentsBallot_id(getState()))
				dispatch(localAddMany(comments));
		} catch (error) {
			dispatch(setError("POST " + url, error));
		}
	};

export const uploadComments =
	(ballot_id: number, file: File): AppThunk =>
	async (dispatch, getState) => {
		const url = `${baseCommentsUrl}/${ballot_id}/upload`;
		const params = { startCommentId: 1 };
		try {
			const response = await fetcher.postFile(url, file, params);
			const { comments, ballot } =
				uploadCommentsResponseSchema.parse(response);
			dispatch(updateBallotsLocal([ballot]));
			if (ballot_id === selectCommentsBallot_id(getState()))
				dispatch(localAddMany(comments));
		} catch (error) {
			dispatch(setError("POST " + url, error));
		}
	};

export const uploadUserComments =
	(ballot_id: number, sapin: number, file: File): AppThunk =>
	async (dispatch, getState) => {
		const url = `${baseCommentsUrl}/${ballot_id}/userUpload`;
		const params = { SAPIN: sapin };
		try {
			const response = await fetcher.postFile(url, file, params);
			const { comments, ballot } =
				uploadCommentsResponseSchema.parse(response);
			dispatch(updateBallotsLocal([ballot]));
			if (ballot_id === selectCommentsBallot_id(getState()))
				dispatch(localAddMany(comments));
		} catch (error) {
			dispatch(setError("POST " + url, error));
		}
	};

export const uploadPublicReviewComments =
	(ballot_id: number, file: File): AppThunk =>
	async (dispatch, getState) => {
		const url = `${baseCommentsUrl}/${ballot_id}/publicReviewUpload`;
		try {
			const response = await fetcher.postFile(url, file);
			const { comments, ballot } =
				uploadCommentsResponseSchema.parse(response);
			dispatch(updateBallotsLocal([ballot]));
			if (ballot_id === selectCommentsBallot_id(getState()))
				dispatch(localAddMany(comments));
		} catch (error) {
			dispatch(setError("POST " + url, error));
		}
	};

export const setStartCommentId =
	(ballot_id: number, startCommentId: number): AppThunk =>
	async (dispatch, getState) => {
		const url = `${baseCommentsUrl}/${ballot_id}/startCommentId`;
		try {
			const response = await fetcher.patch(url, { startCommentId });
			const { comments, ballot } =
				uploadCommentsResponseSchema.parse(response);
			dispatch(updateBallotsLocal([ballot]));
			if (ballot_id === selectCommentsBallot_id(getState()))
				dispatch(localAddMany(comments));
		} catch (error) {
			dispatch(setError("PATCH " + url, error));
		}
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
			for (const key of Object.keys(
				u.changes
			) as (keyof CommentResolution)[]) {
				// @ts-expect-error - abcd
				changes[key] = entity[key];
			}
			return { id, changes };
		});
		dispatch(localUpdateMany(updates));
		const url = `${baseResolutionsUrl}/${ballot_id}?modifiedSince=${lastModified}`;
		const effect: Effect = { url, method: "PATCH", params: updates };
		const commit: Action = { type: updateCommit.toString() };
		const rollback: Action = localUpdateMany(rollbackUpdates);
		dispatch(offlineFetch({ effect, commit, rollback }));
	};

const removeMany =
	(ids: EntityId[]): AppThunk =>
	async (dispatch, getState) => {
		const state = getState();
		const { entities, ballot_id } = selectCommentsState(state);
		const lastModified = selectCommentsLastModified(state);

		const comments = ids.map((id) => entities[id]!);
		dispatch(localRemoveMany(ids));
		const url = `${baseResolutionsUrl}/${ballot_id}?modifiedSince=${lastModified}`;
		const effect: Effect = { url, method: "DELETE", params: ids };
		const commit: Action = { type: updateCommit.toString() };
		const rollback: Action = removeManyRollback(comments);
		dispatch(offlineFetch({ effect, commit, rollback }));
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
		const url = `${baseResolutionsUrl}/${ballot_id}?modifiedSince=${lastModified}`;
		const effect: Effect = { url, method: "POST", params: remoteAdds };
		const commit: Action = { type: updateCommit.toString() };
		const rollback: Action = addManyRollback(adds.map((c) => c.id));
		dispatch(offlineFetch({ effect, commit, rollback }));
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
					(entities[id1]!.ResolutionID || 0) -
					(entities[id2]!.ResolutionID || 0)
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
	added: string[];
	remaining: string[];
	updated: number;
};

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
		const params: ResolutionsUploadParams = {
			toUpdate,
			matchAlgorithm,
			matchUpdate,
			sheetName,
		};
		console.log(params);
		let r: UploadResolutionsResponse;
		try {
			const response = await fetcher.postFile(url, file, params);
			r = uploadResolutionsResponseSchema.parse(response);
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
		} = r;
		dispatch(getPending({ ballot_id }));
		dispatch(getSuccess(comments));
		dispatch(updateBallotsLocal([ballot]));
		return { matched, unmatched, added, remaining, updated };
	};

export const exportCommentsSpreadsheet =
	(
		ballot_id: number,
		format: CommentsExportFormat,
		style: CommentsExportStyle,
		file?: File,
		appendSheets = false
	): AppThunk =>
	async (dispatch) => {
		const params: CommentsExportParams = {
			format,
			style,
			appendSheets: appendSheets ? "true" : "false",
		};
		const url = `${baseCommentsUrl}/${ballot_id}/export`;
		try {
			await fetcher.patchFile(url, file, params);
		} catch (error) {
			dispatch(setError("PATCH " + url, error));
		}
	};
