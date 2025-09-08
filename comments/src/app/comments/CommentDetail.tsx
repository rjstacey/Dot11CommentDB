import * as React from "react";
import { Button, Row, Col, Form } from "react-bootstrap";
import {
	shallowDiff,
	ConfirmModal,
	deepMergeTagMultiple,
	useDebounce,
	type Multiple,
	isMultiple,
	MULTIPLE,
} from "@common";

import CommentHistory from "./CommentHistory";
import CommentEdit from "./CommentEdit";
import ResolutionEdit from "./ResolutionEdit";
import EditingEdit from "./ResolutionEditingEdit";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	addResolutions,
	updateResolutions,
	deleteResolutions,
	setUiProperties,
	selectCommentsState,
	selectCommentsAccess,
	CommentResolution,
	CommentResolutionChange,
	Comment,
	Resolution,
	ResolutionUpdate,
	ResolutionCreate,
	getCommentStatus,
} from "@/store/comments";
import { selectGroupEntities } from "@/store/groups";
import { AccessLevel, selectUser } from "@/store/user";

function renderAccess(access: number) {
	if (access === AccessLevel.admin) return "admin";
	if (access === AccessLevel.rw) return "rw";
	if (access === AccessLevel.ro) return "ro";
	return "none";
}

function renderCommentsStatus(comments: CommentResolution[]) {
	let status: string | typeof MULTIPLE = "";
	comments.forEach((c) => {
		const s = getCommentStatus(c);
		if (!status) status = s;
		else if (status !== s) status = MULTIPLE;
	});
	if (isMultiple(status))
		return <span style={{ fontStyle: "italic" }}>(Multiple)</span>;
	else return status;
}

function CommentResolutionEdit({
	comments,
	readOnly,
	commentsAccess,
	resolutionsAccess,
}: {
	comments: CommentResolution[];
	readOnly: boolean;
	commentsAccess: number;
	resolutionsAccess: number;
}) {
	const dispatch = useAppDispatch();
	const [edited, setEdited] =
		React.useState<Multiple<CommentResolution> | null>(null);
	const [saved, setSaved] =
		React.useState<Multiple<CommentResolution> | null>(null);
	const [editedComments, setEditedComments] = React.useState<
		CommentResolution[]
	>([]);

	const key = editedComments.map((c) => c.id).join();

	React.useEffect(() => {
		if (
			comments.map((c) => c.id).join() ===
			editedComments.map((c) => c.id).join()
		)
			return;

		let diff: Multiple<CommentResolution> | null = null;
		comments.forEach((comment) => {
			diff = deepMergeTagMultiple(diff || {}, comment);
		});
		setSaved(diff);
		setEdited(diff);
		setEditedComments(comments);
	}, [comments, editedComments]);

	const triggerSave = useDebounce(() => {
		/* Find changes */
		const changes = shallowDiff(saved!, edited!) as CommentResolutionChange;
		if (Object.keys(changes).length > 0) {
			const updates: ResolutionUpdate[] = [];
			const adds: ResolutionCreate[] = [];
			comments.forEach((c) => {
				if (c.resolution_id)
					updates.push({
						id: c.resolution_id,
						changes,
					});
				else
					adds.push({
						comment_id: c.comment_id,
						...changes,
					});
			});
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
		setEdited((edited) => ({ ...edited!, ...changes }));
		triggerSave();
	};

	if (!edited || edited.ResolutionID === null) return null;

	return (
		<>
			<ResolutionEdit
				key={"1" + key}
				resolution={edited}
				updateResolution={updateResolution}
				readOnly={readOnly || resolutionsAccess < AccessLevel.rw}
				commentsAccess={commentsAccess}
			/>
			<EditingEdit
				key={"2" + key}
				resolution={edited}
				updateResolution={updateResolution}
				readOnly={readOnly || commentsAccess < AccessLevel.rw}
			/>
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
	const comments = React.useMemo(
		() => selected.map((id) => entities[id]!).filter(Boolean),
		[selected, entities]
	);
	const groupEntities = useAppSelector(selectGroupEntities);
	const access = useAppSelector(selectCommentsAccess);

	const cids = comments.map((c) => c.CID /*getCID(c)*/);
	const cidsStr = cids.join(", ");
	const cidsLabel = cids.length > 1 ? "CIDs:" : "CID:";

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
	}, [comments, groupEntities, access, user]);

	const handleAddResolutions = async () => {
		if (commentsAccess < AccessLevel.rw || !editComment) {
			console.warn("Update in read only component");
			return;
		}

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
		const ids = comments
			.filter((c) => c.resolution_id) // only those with resolutions
			.map((c) => c.id);
		await dispatch(deleteResolutions(ids));
	};

	let placeholder: string | undefined;
	if (loading) placeholder = "Loading...";
	else if (comments.length === 0) placeholder = "Nothing selected";

	const disableButtons = !!placeholder; // disable buttons if displaying string
	const disableEditButtons = disableButtons || readOnly || !editComment;

	const actionElements = (
		<>
			<CommentHistory />
			{!readOnly &&
				(commentsAccess >= AccessLevel.rw ||
					resolutionsAccess >= AccessLevel.rw) && (
					<Button
						variant="outline-primary"
						className="bi-pencil"
						title="Edit resolution"
						disabled={disableButtons}
						active={editComment}
						onClick={toggleEditComment}
					/>
				)}
			{!readOnly && commentsAccess >= AccessLevel.rw && (
				<>
					<Button
						variant="outline-primary"
						className="bi-plus-lg"
						title="Create alternate resolution"
						disabled={disableEditButtons}
						onClick={handleAddResolutions}
					/>
					<Button
						variant="outline-primary"
						className="bi-trash"
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
			<Row>
				<Col className="d-flex justify-content-end gap-2">
					{actionElements}
				</Col>
			</Row>
			<div className="main">
				{placeholder ? (
					<Placeholder>{placeholder}</Placeholder>
				) : (
					<>
						<Row className="align-items-center mb-3">
							<Form.Label as="span" column xs="auto">
								{cidsLabel}
							</Form.Label>
							<Col>
								<div>{cidsStr}</div>
							</Col>
							<Col xs="auto">
								{renderCommentsStatus(comments)}
							</Col>
						</Row>
						<CommentEdit
							comments={comments}
							readOnly={
								readOnly ||
								!editComment ||
								commentsAccess < AccessLevel.rw
							}
						/>
						<CommentResolutionEdit
							comments={comments}
							commentsAccess={commentsAccess}
							resolutionsAccess={resolutionsAccess}
							readOnly={readOnly || !editComment}
						/>
					</>
				)}
				<Row style={{ justifyContent: "flex-end", opacity: 0.5 }}>
					<Col
						className="d-flex justify-content-end"
						style={{ opacity: 0.5 }}
					>
						{`${renderAccess(commentsAccess)} / ${renderAccess(
							resolutionsAccess
						)}`}
					</Col>
				</Row>
			</div>
		</>
	);
}

export default CommentDetail;
