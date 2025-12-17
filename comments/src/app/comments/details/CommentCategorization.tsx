import { Row, Col, Form, Accordion } from "react-bootstrap";
import { isMultiple, type Multiple } from "@common";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	setUiProperties,
	selectCommentsState,
	type Comment,
	AdHocStatus,
} from "@/store/comments";

import { AdHocSelect } from "./AdHocSelect";
import { CommentGroupSelect } from "./CommentGroupSelect";
import Editor from "@/components/editor";

import { BLANK_STR, MULTIPLE_STR } from "@/components/constants";
import type { CommentEditable } from "./CommentEdit";

import styles from "./comments.module.css";

export const CommentAdHoc = ({
	comment,
	updateComment = () => {},
	readOnly,
}: {
	comment: Multiple<CommentEditable>;
	updateComment?: (changes: Partial<Comment>) => void;
	readOnly?: boolean;
}) => (
	<Form.Group as={Row} className="mb-2">
		<Form.Label htmlFor="ad-hoc" column xs="auto">
			Ad-hoc:
		</Form.Label>
		<Col>
			<AdHocSelect
				id="ad-hoc"
				style={{ flexBasis: 150 }}
				value={
					isMultiple(comment.AdHoc) ||
					isMultiple(comment.AdHocGroupId)
						? { GroupId: null, Name: "" }
						: { GroupId: comment.AdHocGroupId, Name: comment.AdHoc }
				}
				onChange={(value) =>
					updateComment({
						AdHocGroupId: value.GroupId,
						AdHoc: value.Name,
					})
				}
				placeholder={
					isMultiple(comment.AdHoc) ||
					isMultiple(comment.AdHocGroupId)
						? MULTIPLE_STR
						: BLANK_STR
				}
				readOnly={readOnly}
			/>
		</Col>
	</Form.Group>
);

export const CommentGroup = ({
	comment,
	updateComment = () => {},
	readOnly,
}: {
	comment: Multiple<CommentEditable>;
	updateComment?: (changes: Partial<Comment>) => void;
	readOnly?: boolean;
}) => (
	<Form.Group as={Row} className="mb-2">
		<Form.Label htmlFor="comment-group" column xs="auto">
			Comment group:
		</Form.Label>
		<Col>
			<CommentGroupSelect
				id="comment-group"
				style={{ flexBasis: 300 }}
				value={
					isMultiple(comment.CommentGroup)
						? ""
						: comment.CommentGroup || ""
				}
				onChange={(value) => updateComment({ CommentGroup: value })}
				placeholder={
					isMultiple(comment.CommentGroup) ? MULTIPLE_STR : BLANK_STR
				}
				readOnly={readOnly}
			/>
		</Col>
	</Form.Group>
);

function CommentAdHocStatus({
	comment,
	updateComment = () => {},
	readOnly,
}: {
	comment: Multiple<CommentEditable>;
	updateComment?: (changes: Partial<Comment>) => void;
	readOnly?: boolean;
}) {
	function changeAdHocStatus(status: AdHocStatus | null) {
		updateComment({ AdHocStatus: status });
	}

	const isIndeterminate = isMultiple(comment.AdHocStatus);

	return (
		<>
			<Row>
				<Col xs="auto">
					<Form.Check
						id="more-work-required"
						name="MoreWorkRequired"
						value={AdHocStatus.MoreWorkRequired}
						ref={(ref) =>
							ref && (ref.indeterminate = isIndeterminate)
						}
						checked={
							comment.AdHocStatus === AdHocStatus.MoreWorkRequired
						}
						onChange={(e) =>
							changeAdHocStatus(
								e.target.checked
									? AdHocStatus.MoreWorkRequired
									: null
							)
						}
						label="More work required"
						readOnly={readOnly}
						className={readOnly ? "pe-none" : undefined}
						tabIndex={readOnly ? -1 : undefined}
					/>
				</Col>
			</Row>
			<Row>
				<Col xs="auto">
					<Form.Check
						id="submission-required"
						name="SubmissionRequired"
						value={AdHocStatus.SubmissionRequired}
						ref={(ref) =>
							ref && (ref.indeterminate = isIndeterminate)
						}
						checked={
							comment.AdHocStatus ===
							AdHocStatus.SubmissionRequired
						}
						onChange={(e) =>
							changeAdHocStatus(
								e.target.checked
									? AdHocStatus.SubmissionRequired
									: null
							)
						}
						label="Submission required"
						readOnly={readOnly}
						className={readOnly ? "pe-none" : undefined}
						tabIndex={readOnly ? -1 : undefined}
					/>
				</Col>
			</Row>
		</>
	);
}

const commentNotesId = "comment-notes";
const commentNotesLabel = (
	<Form.Label as="span" htmlFor={commentNotesId}>
		Ad-hoc Notes:
	</Form.Label>
);
function CommentNotesInternal({
	comment,
	updateComment = () => {},
	readOnly,
}: {
	comment: Multiple<CommentEditable>;
	updateComment?: (changes: Partial<Comment>) => void;
	readOnly?: boolean;
}) {
	return (
		<div className={styles.editingContainer}>
			<CommentAdHocStatus
				comment={comment}
				updateComment={updateComment}
				readOnly={readOnly}
			/>
			<Editor
				id={commentNotesId}
				value={isMultiple(comment.Notes) ? "" : comment.Notes}
				onChange={(value) => updateComment({ Notes: value })}
				placeholder={
					isMultiple(comment.Notes) ? MULTIPLE_STR : BLANK_STR
				}
				readOnly={readOnly}
			/>
		</div>
	);
}

export function CommentNotesRow(props: {
	comment: Multiple<CommentEditable>;
	updateComment?: (changes: Partial<Comment>) => void;
	readOnly?: boolean;
}) {
	return (
		<Row className="mb-2">
			<Col xs={12}>{commentNotesLabel}</Col>
			<Col>
				<CommentNotesInternal {...props} />
			</Col>
		</Row>
	);
}

export function CommentNotesRowCollapsable(props: {
	comment: Multiple<CommentEditable>;
	updateComment: (changes: Partial<Comment>) => void;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const showNotes: boolean | undefined =
		useAppSelector(selectCommentsState).ui.showNotes;
	const key = "show-ad-hoc-notes";

	return (
		<Accordion
			flush
			className={styles.notesField + " mb-2"}
			defaultActiveKey={showNotes ? key : undefined}
			activeKey={showNotes ? key : undefined}
			onSelect={(eventKey) =>
				dispatch(setUiProperties({ showNotes: Boolean(eventKey) }))
			}
		>
			<Accordion.Item eventKey={key}>
				<Accordion.Header>{commentNotesLabel}</Accordion.Header>
				<Accordion.Body>
					<CommentNotesInternal {...props} />
				</Accordion.Body>
			</Accordion.Item>
		</Accordion>
	);
}

export const CommentCategorization = ({
	comment,
	updateComment = () => {},
	readOnly,
}: {
	comment: Multiple<CommentEditable>;
	updateComment?: (changes: Partial<Comment>) => void;
	readOnly?: boolean;
}) => (
	<>
		<Row className="mb-2">
			<Col xs="auto">
				<CommentAdHoc
					comment={comment}
					updateComment={updateComment}
					readOnly={readOnly}
				/>
			</Col>
			<Col xs="auto">
				<CommentGroup
					comment={comment}
					updateComment={updateComment}
					readOnly={readOnly}
				/>
			</Col>
		</Row>
		<CommentNotesRowCollapsable
			comment={comment}
			updateComment={updateComment}
			readOnly={readOnly}
		/>
	</>
);
