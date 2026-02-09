import * as React from "react";
import {
	Container,
	Row,
	Col,
	Button,
	ToggleButton,
	Form,
} from "react-bootstrap";
import { MULTIPLE, isMultiple } from "@common";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	setUiProperties,
	selectCommentsState,
	CommentResolution,
	AccessLevel,
	getCommentStatus,
} from "@/store/comments";
import { selectIsOnline } from "@/store/offline";
import { useCommentsEdit } from "@/hooks/commentsEdit";

import CommentHistory from "./CommentHistory";
import CommentEdit from "./CommentEdit";
import ResolutionEdit from "./ResolutionEdit";
import { EditingNotesRowCollapsable } from "./EditingNotes";
import { RoleSelect } from "./RoleSelect";
import { ShowAccess } from "@/components/ShowAccess";

function renderCommentsStatus(commentResolutions: CommentResolution[]) {
	let status: string | typeof MULTIPLE = "";
	commentResolutions.forEach((c) => {
		const s = getCommentStatus(c);
		if (!status) status = s;
		else if (status !== s) status = MULTIPLE;
	});
	if (isMultiple(status))
		return <span style={{ fontStyle: "italic" }}>(Multiple)</span>;
	else return status;
}

function CidAndStatusRow({
	commentResolutions,
}: {
	commentResolutions: CommentResolution[];
}) {
	const cids = commentResolutions.map((c) => c.CID /*getCID(c)*/);
	const cidsStr = cids.join(", ");
	const cidsLabel = cids.length > 1 ? "CIDs:" : "CID:";
	return (
		<Row className="align-items-center mt-2 mb-2">
			<Col xs="auto">
				<Form.Label as="span">{cidsLabel}</Form.Label>
			</Col>
			<Col>
				<div>{cidsStr}</div>
			</Col>
			<Col xs="auto">{renderCommentsStatus(commentResolutions)}</Col>
		</Row>
	);
}

const Placeholder = (props: React.ComponentProps<"span">) => (
	<div className="details-panel-placeholder">
		<span {...props} />
	</div>
);

export function CommentsDetail() {
	const dispatch = useAppDispatch();
	const isOnline = useAppSelector(selectIsOnline);

	const [showHistory, setShowHistory] = React.useState(false);

	const editMode: boolean | undefined =
		useAppSelector(selectCommentsState).ui.editMode;
	const setEditMode = (editMode: boolean) =>
		dispatch(setUiProperties({ editMode }));
	const readOnly = !editMode;

	const {
		state,
		commentsAccess,
		resolutionsAccess,
		onChangeComments,
		onChangeResolutions,
		onAddResolutions,
		onDeleteResolutions,
	} = useCommentsEdit(!editMode);

	const actionElements = (
		<>
			<ToggleButton
				id="toggle-show-history"
				variant="outline-primary"
				type="checkbox"
				value="1"
				onChange={(e) => setShowHistory(e.target.checked)}
				checked={showHistory}
				disabled={
					state.action !== "update" ||
					state.commentResolutions.length === 0 ||
					!isOnline
				}
			>
				<i className="bi-clock-history me-1" />
				{"History"}
			</ToggleButton>
			{commentsAccess >= AccessLevel.rw && (
				<>
					<Button
						variant="outline-primary"
						title="Create alternate resolution"
						disabled={
							state.action !== "update" ||
							!editMode ||
							showHistory
						}
						onClick={onAddResolutions}
					>
						<i className="bi-plus-lg me-1" />
						{"Add Resn"}
					</Button>
					<Button
						variant="outline-primary"
						title="Delete resolution"
						disabled={
							state.action !== "update" ||
							!editMode ||
							showHistory
						}
						onClick={onDeleteResolutions}
					>
						<i className="bi-trash me-1" />
						{"Delete Resn"}
					</Button>
				</>
			)}
		</>
	);

	let content: React.ReactNode;
	if (state.action === null) {
		content = <Placeholder>{state.message}</Placeholder>;
	} else if (showHistory) {
		content = <CommentHistory />;
	} else {
		//const key = state.commentResolutions.map((cr) => cr.id).join("-");
		content = (
			<>
				<CidAndStatusRow
					commentResolutions={state.commentResolutions}
				/>
				<CommentEdit
					//key={"c-" + key}
					edited={state.commentsEdited}
					onChange={onChangeComments}
					readOnly={readOnly || commentsAccess < AccessLevel.rw}
				/>
				<ResolutionEdit
					//key={"r-" + key}
					resolution={state.resolutionsEdited}
					updateResolution={onChangeResolutions}
					readOnly={readOnly || resolutionsAccess < AccessLevel.rw}
					commentsAccess={commentsAccess}
				/>
				<EditingNotesRowCollapsable
					//key={"e-" + key}
					resolution={state.resolutionsEdited}
					updateResolution={onChangeResolutions}
					readOnly={readOnly || commentsAccess < AccessLevel.rw}
				/>
			</>
		);
	}

	return (
		<Container fluid="lg">
			<Row>
				<Col xs="auto" className="d-flex align-items-center gap-2">
					<RoleSelect />
					{(commentsAccess >= AccessLevel.rw ||
						resolutionsAccess >= AccessLevel.rw) && (
						<ToggleButton
							id="toggle-edit-mode"
							type="checkbox"
							variant="outline-primary"
							title="Edit mode"
							disabled={state.action !== "update" || showHistory}
							value="1"
							checked={editMode}
							onChange={(e) => setEditMode(e.target.checked)}
						>
							<i className="bi-pencil me-1" />
							{"Edit"}
						</ToggleButton>
					)}
				</Col>
				<Col className="d-flex justify-content-end gap-2">
					{actionElements}
				</Col>
			</Row>
			<div className="main">{content}</div>
			<ShowAccess access={[commentsAccess, resolutionsAccess]} />
		</Container>
	);
}
