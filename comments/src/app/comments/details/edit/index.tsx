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
import { useCommentsEdit } from "@/hooks/commentsEdit";

import { ShowAccess } from "@/components/ShowAccess";
import { ShowHistoryButton } from "../ShowHistoryButton";
import CommentEdit from "./CommentEdit";
import ResolutionEdit from "./ResolutionEdit";
import { EditingNotesRowCollapsable } from "./EditingNotes";
import { RoleSelect } from "./RoleSelect";

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

export function CommentEditDetail({
	showHistory,
	setShowHistory,
}: {
	showHistory: boolean;
	setShowHistory: (show: boolean) => void;
}
) {
	const dispatch = useAppDispatch();

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
		onDeleteComments,
		onChangeResolutions,
		onAddResolutions,
		onDeleteResolutions,
	} = useCommentsEdit(!editMode);

	let actionElements: React.ReactElement[] = [];
	if (commentsAccess >= AccessLevel.admin) {
		actionElements.push(
			<Button
				key="delete-comments"
				variant="outline-danger"
				title="Delete selected comments"
				disabled={
					state.action !== "update" ||
					!editMode
				}
				onClick={onDeleteComments}
			>
				<i className="bi-trash me-1" />
				{"Delete Comment"}
			</Button>
		);
	}
	if (commentsAccess >= AccessLevel.rw) {
		actionElements.push(
			<Button
				key="create-resolution"
				variant="outline-primary"
				title="Create alternate resolution"
				disabled={
					state.action !== "update" ||
					!editMode
				}
				onClick={onAddResolutions}
			>
				<i className="bi-plus-lg me-1" />
				{"Add Resn"}
			</Button>
		);
		actionElements.push(
			<Button
				key="delete-resolutions"
				variant="outline-primary"
				title="Delete selected resolutions"
				disabled={
					state.action !== "update" ||
					!editMode
				}
				onClick={onDeleteResolutions}
			>
				<i className="bi-trash me-1" />
				{"Delete Resn"}
			</Button>
		);
		actionElements.push(
			<ShowHistoryButton
				key="show-history"
				showHistory={showHistory}
				setShowHistory={setShowHistory}
			/>
		);
	}

	let content: React.ReactNode;
	if (state.action === null) {
		content = <Placeholder>{state.message}</Placeholder>;
	} else {
		content = <>
			<CidAndStatusRow
				commentResolutions={state.commentResolutions}
			/>
			<CommentEdit
				edited={state.commentsEdited}
				onChange={onChangeComments}
				readOnly={readOnly || commentsAccess < AccessLevel.rw}
			/>
			<ResolutionEdit
				resolution={state.resolutionsEdited}
				updateResolution={onChangeResolutions}
				readOnly={readOnly || resolutionsAccess < AccessLevel.rw}
				commentsAccess={commentsAccess}
			/>
			<EditingNotesRowCollapsable
				resolution={state.resolutionsEdited}
				updateResolution={onChangeResolutions}
				readOnly={readOnly || commentsAccess < AccessLevel.rw}
			/>
		</>;
	}

	return <>
		<div className="d-flex justify-content-between align-items-center">
			<div className="d-flex align-items-center gap-2">
				<RoleSelect />
				{(commentsAccess >= AccessLevel.rw ||
					resolutionsAccess >= AccessLevel.rw) && (
						<ToggleButton
							id="toggle-edit-mode"
							type="checkbox"
							variant="outline-primary"
							title="Edit mode"
							disabled={state.action !== "update"}
							value="1"
							checked={editMode}
							onChange={(e) => setEditMode(e.target.checked)}
						>
							<i className="bi-pencil me-1" />
							{"Edit"}
						</ToggleButton>
					)}
			</div>
			<div className="d-flex justify-content-end gap-2">
				{actionElements}
			</div>
		</div>
		<Container className="main">{content}</Container>
		<ShowAccess access={[commentsAccess, resolutionsAccess]} />
	</>;
}
