import React from "react";
import {
	ConfirmModal,
	shallowDiff,
	Multiple,
	deepMergeTagMultiple,
	useDebounce,
} from "@common";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	selectCommentsState,
	CommentResolution,
	Comment,
	CommentChange,
	Resolution,
	ResolutionUpdate,
	ResolutionCreate,
	ResolutionChange,
	updateResolutions,
	addResolutions,
	AccessLevel,
	updateComments,
	deleteResolutions,
} from "@/store/comments";
import { useCommentsAccess } from "./useCommentsAccess";

export type MultipleCommentResolution = Multiple<CommentResolution>;
export type MultipleComment = Multiple<Comment>;
export type MultipleResolution = Multiple<Resolution>;

type CommentsEditState =
	| {
			action: null;
			message: string;
	  }
	| {
			action: "update";
			commentsEdited: MultipleComment;
			commentsSaved: MultipleComment;
			resolutionsEdited: MultipleResolution;
			resolutionsSaved: MultipleResolution;
			comments: Comment[];
			resolutions: Resolution[];
			commentResolutions: CommentResolution[];
	  };

function commentFromCommentResolution(cr: CommentResolution): Comment {
	return {
		id: cr.comment_id,
		ballot_id: cr.ballot_id,
		CommentID: cr.CommentID,
		C_Index: cr.C_Index,
		C_Clause: cr.C_Clause,
		C_Page: cr.C_Page,
		C_Line: cr.C_Line,
		Clause: cr.Clause,
		Page: cr.Page,
		Category: cr.Category,
		MustSatisfy: cr.MustSatisfy,
		AdHoc: cr.AdHoc,
		AdHocGroupId: cr.AdHocGroupId,
		AdHocStatus: cr.AdHocStatus,
		Notes: cr.Notes,
		CommentGroup: cr.CommentGroup,
		Comment: cr.Comment,
		ProposedChange: cr.ProposedChange,
		CommenterSAPIN: cr.CommenterSAPIN,
		CommenterName: cr.CommenterName,
		CommenterEmail: cr.CommenterEmail,
		Vote: cr.Vote,
		LastModifiedBy: cr.LastModifiedBy,
		LastModifiedTime: cr.LastModifiedTime,
	} satisfies Comment;
}

function resolutionFromCommentResolution(cr: CommentResolution): Resolution {
	return {
		id: cr.resolution_id!,
		comment_id: cr.comment_id,
		ResolutionID: cr.ResolutionID!,
		ResnStatus: cr.ResnStatus,
		Resolution: cr.Resolution,
		ApprovedByMotion: cr.ApprovedByMotion,
		ReadyForMotion: cr.ReadyForMotion,
		AssigneeSAPIN: cr.AssigneeSAPIN,
		AssigneeName: cr.AssigneeName,
		Submission: cr.Submission,
		EditStatus: cr.EditStatus,
		EditInDraft: cr.EditInDraft,
		EditNotes: cr.EditNotes,
		LastModifiedBy: cr.LastModifiedBy,
		LastModifiedTime: cr.LastModifiedTime,
	} satisfies Resolution;
}

export function useCommentsEdit(readOnly: boolean) {
	const dispatch = useAppDispatch();
	const { selected, entities, loading, valid } =
		useAppSelector(selectCommentsState);
	const commentResolutions = React.useMemo(
		() => selected.map((id) => entities[id]!).filter(Boolean),
		[selected, entities]
	);
	const [commentsAccess, resolutionsAccess] =
		useCommentsAccess(commentResolutions);

	const initState = React.useCallback((): CommentsEditState => {
		let message: string;
		if (loading && !valid) {
			message = "Loading...";
		} else if (commentResolutions.length === 0) {
			message = "Nothing selected";
		} else {
			const comments: Comment[] = [];
			const resolutions: Resolution[] = [];
			for (const cr of commentResolutions) {
				if (!comments.find((c) => c.id === cr.comment_id))
					comments.push(commentFromCommentResolution(cr));
				if (cr.resolution_id)
					resolutions.push(resolutionFromCommentResolution(cr));
			}
			let commentsEdited = {} as Multiple<Comment>;
			for (const c of comments)
				commentsEdited = deepMergeTagMultiple(commentsEdited, c);
			let resolutionsEdited = {} as Multiple<Resolution>;
			for (const r of resolutions)
				resolutionsEdited = deepMergeTagMultiple(resolutionsEdited, r);

			return {
				action: "update",
				commentsEdited,
				commentsSaved: commentsEdited,
				resolutionsEdited,
				resolutionsSaved: resolutionsEdited,
				comments,
				resolutions,
				commentResolutions,
			} satisfies CommentsEditState;
		}
		return {
			action: null,
			message,
		} satisfies CommentsEditState;
	}, [commentResolutions, loading, valid]);

	const [state, setState] = React.useState<CommentsEditState>(initState);

	const triggerSave = useDebounce(() => {
		if (state.action !== "update") return;
		const c_changes = shallowDiff(
			state.commentsSaved,
			state.commentsEdited
		) as CommentChange;
		if (Object.keys(c_changes).length > 0) {
			const updates = state.comments.map((c) => ({
				id: c.id,
				changes: c_changes,
			}));
			dispatch(updateComments(updates));
		}
		const r_changes: ResolutionChange = shallowDiff(
			state.resolutionsSaved,
			state.resolutionsEdited
		) as ResolutionChange;
		if (Object.keys(r_changes).length > 0) {
			const updates: ResolutionUpdate[] = [];
			for (const r of state.resolutions) {
				if ("id" in r)
					updates.push({
						id: r.id,
						changes: r_changes,
					});
			}
			if (updates.length > 0) dispatch(updateResolutions(updates));
		}
		const adds: ResolutionCreate[] = [];
		for (const r of state.resolutions) {
			if (!("id" in r)) adds.push(r);
		}
		if (adds.length > 0) dispatch(addResolutions(adds));
		setState({
			...state,
			commentsSaved: state.commentsEdited,
			resolutionsSaved: state.resolutionsEdited,
		});
	});

	React.useEffect(() => {
		if (
			state.action === "update" &&
			(state.commentsEdited !== state.commentsSaved ||
				state.resolutionsEdited !== state.resolutionsSaved)
		) {
			triggerSave.flush();
		}
		setState(initState());
	}, [initState]);

	const onChangeComments = React.useCallback(
		(changes: CommentChange) => {
			setState((state) => {
				if (readOnly) {
					console.warn("onChangeComments: state is readOnly");
					return state;
				}
				if (state.action !== "update") {
					console.warn("onChangeComments: bad state");
					return state;
				}
				triggerSave();
				const commentsEdited = { ...state.commentsEdited, ...changes };
				return { ...state, commentsEdited };
			});
		},
		[readOnly, setState, triggerSave]
	);

	const onChangeResolutions = React.useCallback(
		(changes: ResolutionChange) => {
			setState((state) => {
				if (readOnly) {
					console.warn("onChangeResolutions: state is readOnly");
					return state;
				}
				if (state.action !== "update") {
					console.warn("onChangeResolutions: bad state");
					return state;
				}
				triggerSave();
				const resolutionsEdited = {
					...state.resolutionsEdited,
					...changes,
				};
				return { ...state, resolutionsEdited };
			});
		},
		[readOnly, setState, triggerSave]
	);

	const onAddResolutions = async () => {
		if (commentsAccess < AccessLevel.rw) {
			console.warn("onAddResolutions: state is readOnly");
			return;
		}
		if (state.action !== "update") {
			console.warn("onAddResolutions: bad state");
			return;
		}

		if (state.resolutions.find((r) => r.ApprovedByMotion)) {
			const msg =
				state.resolutions.length > 1
					? "One of the comments has an approved resolution."
					: "The comment has an approved resolution.";
			const ok = await ConfirmModal.show(
				msg + " Are you sure you want to add another resolution?"
			);
			if (!ok) return;
		}

		// Add one entry per comment_id
		const resolutions: ResolutionCreate[] = state.comments.map((c) => ({
			comment_id: c.id,
		}));
		await dispatch(addResolutions(resolutions));
	};

	const onDeleteResolutions = async () => {
		if (commentsAccess < AccessLevel.rw) {
			console.warn("onDeleteResolutions: state is readOnly");
			return;
		}
		if (state.action !== "update") {
			console.warn("onDeleteResolutions: bad state");
			return;
		}
		const ids = state.resolutions
			.filter((r) => "id" in r) // only those with resolutions
			.map((r) => r.id);
		await dispatch(deleteResolutions(ids));
	};

	return {
		state,
		commentsAccess,
		resolutionsAccess,
		onChangeComments,
		onChangeResolutions,
		onAddResolutions,
		onDeleteResolutions,
	};
}
