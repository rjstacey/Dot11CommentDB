import * as React from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import { ConfirmModal, type Multiple } from "@common";

import CommentHistory from "./CommentHistory";
import { CommentResolutionEdit } from "./CommentResolutionEdit";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	addResolutions,
	deleteResolutions,
	setUiProperties,
	selectCommentsState,
	CommentResolution,
	Comment,
	Resolution,
	ResolutionCreate,
} from "@/store/comments";
import { AccessLevel } from "@/store/user";

import { RoleSelect } from "./RoleSelect";
import { useCommentsAccess } from "./useCommentsAccess";

function renderAccess(access: number) {
	if (access === AccessLevel.admin) return "admin";
	if (access === AccessLevel.rw) return "rw";
	if (access === AccessLevel.ro) return "ro";
	return "none";
}

const Placeholder = (props: React.ComponentProps<"span">) => (
	<div className="details-panel-placeholder">
		<span {...props} />
	</div>
);

export type MultipleCommentResolution = Multiple<CommentResolution>;
export type MultipleComment = Multiple<Comment>;
export type MultipleResolution = Multiple<Resolution>;

function CommentDetail() {
	const dispatch = useAppDispatch();

	const { entities, loading, selected } = useAppSelector(selectCommentsState);
	const comments = React.useMemo(
		() => selected.map((id) => entities[id]!).filter(Boolean),
		[selected, entities]
	);

	const [commentsAccess, resolutionsAccess] = useCommentsAccess(comments);

	const editMode: boolean | undefined =
		useAppSelector(selectCommentsState).ui.editMode;
	const toggleEditMode = () =>
		dispatch(setUiProperties({ editMode: !editMode }));

	const [showHistory, setShowHistory] = React.useState(false);
	const toggleShowHistory = () => setShowHistory(!showHistory);

	const handleAddResolutions = async () => {
		if (commentsAccess < AccessLevel.rw || !editMode) {
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
		if (commentsAccess < AccessLevel.rw || !editMode) {
			console.warn("Update in read only component");
			return;
		}
		const ids = comments
			.filter((c) => c.resolution_id) // only those with resolutions
			.map((c) => c.id);
		await dispatch(deleteResolutions(ids));
	};

	const disableButtons = loading || comments.length === 0;
	const disableEditButtons = disableButtons || !editMode;

	const actionElements = (
		<>
			<Button
				variant="outline-primary"
				className="bi-clock-history"
				onClick={toggleShowHistory}
				active={showHistory}
				disabled={selected.length === 0}
			>
				{" History"}
			</Button>
			{(commentsAccess >= AccessLevel.rw ||
				resolutionsAccess >= AccessLevel.rw) && (
				<Button
					variant="outline-primary"
					className="bi-pencil"
					title="Edit resolution"
					disabled={disableButtons || showHistory}
					active={editMode}
					onClick={toggleEditMode}
				>
					{" Edit"}
				</Button>
			)}
			{commentsAccess >= AccessLevel.rw && (
				<>
					<Button
						variant="outline-primary"
						className="bi-plus-lg"
						title="Create alternate resolution"
						disabled={disableEditButtons || showHistory}
						onClick={handleAddResolutions}
					>
						{" Add Resn"}
					</Button>
					<Button
						variant="outline-primary"
						className="bi-trash"
						title="Delete resolution"
						disabled={disableEditButtons || showHistory}
						onClick={handleDeleteResolutions}
					>
						{" Delete Resn"}
					</Button>
				</>
			)}
		</>
	);

	let content: React.ReactNode;
	if (loading) {
		content = <Placeholder>Loading...</Placeholder>;
	} else if (comments.length === 0) {
		content = <Placeholder>Nothing selected</Placeholder>;
	} else if (showHistory) {
		content = <CommentHistory />;
	} else {
		content = (
			<CommentResolutionEdit
				comments={comments}
				commentsAccess={commentsAccess}
				resolutionsAccess={resolutionsAccess}
				readOnly={!editMode}
			/>
		);
	}

	return (
		<Container fluid="lg">
			<Row>
				<Col xs="auto">
					<RoleSelect />
				</Col>
				<Col className="d-flex justify-content-end gap-2">
					{actionElements}
				</Col>
			</Row>
			<div className="main">{content}</div>
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
		</Container>
	);
}

export default CommentDetail;
