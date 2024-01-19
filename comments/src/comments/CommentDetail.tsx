import * as React from "react";

import {
	ActionButton,
	Row,
	shallowDiff,
	recursivelyDiffObjects,
	Multiple,
	ConfirmModal,
} from "dot11-components";

import CommentHistory from "./CommentHistory";
import CommentEdit from "./CommentEdit";
import ResolutionEdit from "./ResolutionEdit";
import EditingEdit from "./EditingEdit";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	addResolutions,
	updateResolutions,
	deleteResolutions,
	updateComments,
	setUiProperties,
	selectCommentsState,
	selectCommentsAccess,
	getCID,
	CommentResolution,
	Comment,
	Resolution,
	ResolutionUpdate,
	ResolutionCreate,
	selectCommentEntities,
} from "../store/comments";
import { selectGroupEntities } from "../store/groups";
import { AccessLevel, selectUser } from "../store/user";
import { useDebounce } from "../components/useDebounce";

function renderAccess(access: number) {
	if (access === AccessLevel.admin) return "admin";
	if (access === AccessLevel.rw) return "rw";
	if (access === AccessLevel.ro) return "ro";
	return "none";
}

function CommentResolutionEdit({
	selected,
	readOnly,
	commentsAccess,
	resolutionsAccess,
}: {
	selected: string[];
	readOnly: boolean;
	commentsAccess: number;
	resolutionsAccess: number;
}) {
	const dispatch = useAppDispatch();
	const entities = useAppSelector(selectCommentEntities);
	const [edited, setEdited] =
		React.useState<MultipleCommentResolution | null>();
	const [saved, setSaved] =
		React.useState<MultipleCommentResolution | null>();
	const [comments, setComments] = React.useState<CommentResolution[]>([]);

	React.useEffect(() => {
		let diff = {},
			comments: CommentResolution[] = [];
		selected.forEach((id) => {
			const comment = entities[id];
			if (comment) {
				diff = recursivelyDiffObjects(diff, comment);
				comments.push(comment);
			}
		});
		setSaved(diff as MultipleCommentResolution);
		setEdited(diff as MultipleCommentResolution);
		setComments(comments);
	}, [entities, selected]);

	const triggerSave = useDebounce(() => {
		/* Find changes */
		const commentChanges: Partial<Comment> = {},
			resolutionChanges: Partial<Resolution> = {};
		const d = shallowDiff(saved, edited) as Partial<CommentResolution>;
		for (let k in d) {
			if (
				k in
				[
					"AdHocGroupId",
					"AdHoc",
					"CommentGroup",
					"Notes",
					"Page",
					"Clause",
				]
			)
				commentChanges[k] = d[k];
			else resolutionChanges[k] = d[k];
		}
		if (Object.keys(commentChanges).length > 0) {
			const updates = comments.map((c) => ({
				id: c.comment_id,
				changes: commentChanges,
			}));
			dispatch(updateComments(updates));
		}
		if (Object.keys(resolutionChanges).length > 0) {
			const updates: ResolutionUpdate[] = [];
			const adds: ResolutionCreate[] = [];
			for (const c of comments) {
				if (c.resolution_id)
					updates.push({
						id: c.resolution_id,
						changes: resolutionChanges,
					});
				else
					adds.push({
						comment_id: c.comment_id,
						...resolutionChanges,
					});
			}
			if (updates.length > 0) dispatch(updateResolutions(updates));
			if (adds.length > 0) dispatch(addResolutions(adds));
		}
		setSaved(edited);
	});

	const updateResolution = (changes: Partial<CommentResolution>) => {
		if (resolutionsAccess < AccessLevel.rw || readOnly) {
			console.warn("Insufficient access to update resolution");
			return;
		}
		// merge in the edits and trigger save
		setEdited((edited) => ({ ...edited, ...changes }));
		triggerSave();
	};

	if (!edited) return null;

	return (
		<>
			<CommentEdit
				cids={comments.map(getCID)}
				comment={edited}
				updateComment={updateResolution}
				readOnly={readOnly || commentsAccess < AccessLevel.rw}
			/>
			{edited.ResolutionID !== null && (
				<>
					<ResolutionEdit
						resolution={edited}
						updateResolution={updateResolution}
						readOnly={
							readOnly || resolutionsAccess < AccessLevel.rw
						}
						commentsAccess={commentsAccess}
					/>
					<EditingEdit
						resolution={edited}
						updateResolution={updateResolution}
						readOnly={readOnly || commentsAccess < AccessLevel.rw}
					/>
				</>
			)}
		</>
	);
}

const Placeholder = (props: React.ComponentProps<"span">) => (
	<div className="placeholder">
		<span {...props} />
	</div>
);

export type MultipleCommentResolution = Multiple<CommentResolution>;
export type MultipleComment = Multiple<Comment>;
export type MultipleResolution = Multiple<Resolution>;

function CommentDetail({ readOnly }: { readOnly?: boolean }) {
	const dispatch = useAppDispatch();

	const user = useAppSelector(selectUser);
	const { entities, loading, selected } = useAppSelector(selectCommentsState);
	const groupEntities = useAppSelector(selectGroupEntities);
	const access = useAppSelector(selectCommentsAccess);

	const [commentsAccess, setCommentsAccess] = React.useState<number>(
		AccessLevel.none
	);
	const [resolutionsAccess, setResolutionsAccess] = React.useState<number>(
		AccessLevel.none
	);

	const editComment: boolean | undefined =
		useAppSelector(selectCommentsState).ui.editComment;
	const toggleEditComment = () =>
		dispatch(setUiProperties({ editComment: !editComment }));

	React.useEffect(() => {
		const comments = selected.map((id) => entities[id]);

		/* User has read-write comments access if the user is an officer of the assigned ad-hoc */
		let commentsAccess = access;
		if (commentsAccess <= AccessLevel.ro) {
			const rw = comments.every((c) => {
				const group = c.AdHocGroupId
					? groupEntities[c.AdHocGroupId]
					: undefined;
				if (group) {
					const access =
						group.permissions.comments || AccessLevel.none;
					if (access >= AccessLevel.rw) return true;
				}
				return false;
			});
			if (rw) commentsAccess = AccessLevel.rw;
		}
		setCommentsAccess(commentsAccess);

		/* User has read-write resolutions access if the user has been assigned the comment
		 * and the comment does not have an approved resolution. */
		let resolutionsAccess = commentsAccess;
		if (
			resolutionsAccess <= AccessLevel.ro &&
			comments.every(
				(c) => c.AssigneeSAPIN === user.SAPIN && !c.ApprovedByMotion
			)
		) {
			resolutionsAccess = AccessLevel.rw;
		}
		setResolutionsAccess(resolutionsAccess);
	}, [selected, entities, groupEntities, access, user]);

	const handleAddResolutions = async () => {
		if (commentsAccess < AccessLevel.rw || !editComment) {
			console.warn("Update in read only component");
			return;
		}

		const comments = selected.map((id) => entities[id]);
		if (comments.find((c) => c.ApprovedByMotion)) {
			const msg =
				comments.length > 1
					? "One of the comments has an approved resolution."
					: "The comment has an approved resolution.";
			const ok = await ConfirmModal.show(
				msg + " Are you sure you want to add another resolution?"
			);
			if (!ok) return;
		}

		// Add only one entry per comment_id
		const resolutions: ResolutionCreate[] = [];
		for (const c of comments) {
			if (!resolutions.find((r) => r.comment_id === c.comment_id))
				resolutions.push({ comment_id: c.comment_id });
		}
		await dispatch(addResolutions(resolutions));
	};

	const handleDeleteResolutions = async () => {
		if (commentsAccess < AccessLevel.rw || !editComment) {
			console.warn("Update in read only component");
			return;
		}
		const ids = selected
			.map((id) => entities[id])
			.filter((c) => c.resolution_id) // only those with resolutions
			.map((c) => c.id);
		await dispatch(deleteResolutions(ids));
	};

	let placeholder: string | undefined;
	if (loading) placeholder = "Loading...";
	else if (selected.length === 0) placeholder = "Nothing selected";

	const disableButtons = !!placeholder; // disable buttons if displaying string
	const disableEditButtons = disableButtons || readOnly || !editComment;

	const actionElements = (
		<>
			<CommentHistory />
			{!readOnly &&
				(commentsAccess >= AccessLevel.rw ||
					resolutionsAccess >= AccessLevel.rw) && (
					<ActionButton
						name="edit"
						title="Edit resolution"
						disabled={disableButtons}
						isActive={editComment}
						onClick={toggleEditComment}
					/>
				)}
			{!readOnly && commentsAccess >= AccessLevel.rw && (
				<>
					<ActionButton
						name="add"
						title="Create alternate resolution"
						disabled={disableEditButtons}
						onClick={handleAddResolutions}
					/>
					<ActionButton
						name="delete"
						title="Delete resolution"
						disabled={disableEditButtons}
						onClick={handleDeleteResolutions}
					/>
				</>
			)}
		</>
	);
	return (
		<>
			<div className="top-row justify-right">{actionElements}</div>
			<div className="main">
				{placeholder ? (
					<Placeholder>{placeholder}</Placeholder>
				) : (
					<CommentResolutionEdit
						selected={selected as string[]}
						commentsAccess={commentsAccess}
						resolutionsAccess={resolutionsAccess}
						readOnly={readOnly}
					/>
				)}
				<Row style={{ justifyContent: "flex-end", opacity: 0.5 }}>
					{`${renderAccess(commentsAccess)} / ${renderAccess(
						resolutionsAccess
					)}`}
				</Row>
			</div>
		</>
	);
}

export default CommentDetail;
