import * as React from "react";
import { Row, Col, Form, Accordion } from "react-bootstrap";
import {
	isMultiple,
	type Multiple,
	MULTIPLE,
	deepMergeTagMultiple,
	shallowDiff,
	useDebounce,
} from "@common";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
	updateComments,
	setUiProperties,
	selectCommentsState,
	categoryMap,
	type CommentResolution,
	type Comment,
} from "@/store/comments";

import AdHocSelector from "./AdHocSelector";
import CommentGroupSelector from "./CommentGroupSelector";
import Editor from "@/components/editor";

import styles from "./comments.module.css";

const BLANK_STR = "(Blank)";
const MULTIPLE_STR = "(Multiple)";

// Comment fields editable by this module
type CommentEditable = Omit<Comment, "id">;

const ShowMultiple = (props: React.ComponentProps<"span">) => (
	<span className={styles.multiple} {...props}>
		{MULTIPLE_STR}
	</span>
);

export function renderMBS({
	MustSatisfy: mbs,
}: {
	MustSatisfy: Multiple<Comment>["MustSatisfy"];
}) {
	if (isMultiple(mbs)) {
		return null;
	}
	return (
		<span
			style={{
				color: "red",
				fontSize: "smaller",
				fontWeight: "bold",
			}}
		>
			{mbs ? "MBS" : ""}
		</span>
	);
}

export function renderCommenter(comment: Multiple<CommentEditable>) {
	const commenter = comment.CommenterName;
	if (isMultiple(commenter)) {
		return <ShowMultiple />;
	}
	let vote: JSX.Element | null = null;
	if (comment.Vote === "Approve") {
		vote = <i className="icon icon-vote-yes ms-2" />;
	} else if (comment.Vote === "Disapprove") {
		vote = <i className="icon icon-vote-no ms-2" />;
	}
	return (
		<>
			{commenter}
			{vote}
		</>
	);
}

export function renderCategory({
	Category: cat,
}: {
	Category: Multiple<Comment>["Category"];
}) {
	if (isMultiple(cat)) {
		return <ShowMultiple />;
	}
	return <span>{categoryMap[cat]}</span>;
}

const renderTextBlock = (value: string) => {
	if (!value) return "";
	if (isMultiple(value)) return <ShowMultiple />;
	return (
		<div className={styles.textBlockContainer}>
			{value.split("\n").map((line, i) => (
				<p key={i}>{line}</p>
			))}
		</div>
	);
};

export const CommentAdHoc = ({
	comment,
	updateComment = () => {},
	readOnly,
}: {
	comment: Multiple<CommentEditable>;
	updateComment?: (changes: Partial<Comment>) => void;
	readOnly?: boolean;
}) => (
	<Form.Group as={Row} className="mb-3">
		<Form.Label htmlFor="ad-hoc" column xs="auto">
			Ad-hoc:
		</Form.Label>
		<Col>
			<AdHocSelector
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
	<Form.Group as={Row} className="mb-3">
		<Form.Label htmlFor="comment-group" column xs="auto">
			Comment group:
		</Form.Label>
		<Col>
			<CommentGroupSelector
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

export function CommentNotes({
	comment,
	updateComment = () => {},
	forceShowNotes,
	readOnly,
}: {
	comment: Multiple<CommentEditable>;
	updateComment?: (changes: Partial<Comment>) => void;
	forceShowNotes?: boolean;
	readOnly?: boolean;
}) {
	const dispatch = useAppDispatch();
	const showNotes: boolean | undefined =
		useAppSelector(selectCommentsState).ui.showNotes;
	//const toggleShowNotes = () =>
	//	dispatch(setUiProperties({ showNotes: !showNotes }));
	const key = "comment-ad-hoc-notes";

	return (
		<Col>
			<Accordion
				defaultActiveKey={showNotes ? key : undefined}
				activeKey={showNotes || forceShowNotes ? key : undefined}
				onSelect={(eventKey) =>
					dispatch(setUiProperties({ showNotes: Boolean(eventKey) }))
				}
				flush
				className={styles.notesField}
			>
				<Accordion.Item eventKey={key}>
					<Accordion.Header>Ad-hoc Notes:</Accordion.Header>
					<Accordion.Body>
						<Editor
							value={
								isMultiple(comment.Notes) ? "" : comment.Notes
							}
							onChange={(value) =>
								updateComment({ Notes: value })
							}
							placeholder={
								isMultiple(comment.Notes)
									? MULTIPLE_STR
									: BLANK_STR
							}
							readOnly={readOnly}
						/>
					</Accordion.Body>
				</Accordion.Item>
			</Accordion>
		</Col>
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
		<Row className="mb-3">
			<Col xs={12} md={5}>
				<CommentAdHoc
					comment={comment}
					updateComment={updateComment}
					readOnly={readOnly}
				/>
			</Col>
			<Col xs={12} md={7}>
				<CommentGroup
					comment={comment}
					updateComment={updateComment}
					readOnly={readOnly}
				/>
			</Col>
		</Row>
		<Row className="mb-3">
			<CommentNotes
				comment={comment}
				updateComment={updateComment}
				readOnly={readOnly}
			/>
		</Row>
	</>
);

function commentPageValue(page: typeof MULTIPLE | number | null) {
	return isMultiple(page) ? "" : page ? page.toFixed(2) : "";
}

function CommentPage({
	comment,
	setComment,
	readOnly,
}: {
	comment: Multiple<CommentEditable>;
	setComment: (changes: Partial<Comment>) => void;
	readOnly?: boolean;
}) {
	const [value, setValue] = React.useState(commentPageValue(comment.Page));
	const pattern = "^\\d*\\.?\\d{0,2}$";

	const onChange: React.ChangeEventHandler<HTMLInputElement> = function (e) {
		const { value } = e.target;
		setValue(value);
		if (value.search(pattern) !== -1) {
			const page = parseFloat(value);
			setComment({ Page: page || null });
		}
	};

	React.useEffect(() => {
		const newValue = commentPageValue(comment.Page);
		if (newValue !== value) setValue(newValue);
	}, [comment.Page]);

	let showOriginal = false;
	let original = "";
	if (
		!isMultiple(comment.Page) &&
		!isMultiple(comment.C_Page) &&
		!isMultiple(comment.C_Line)
	) {
		// Check if original page number is diffent
		let page: number | string =
			Number(comment.C_Page) + Number(comment.C_Line) / 100;
		if (isNaN(page)) page = 0;
		showOriginal = page !== comment.Page;
		original = comment.C_Page + "." + comment.C_Line;
	}

	return (
		<Form.Group as={Row} controlId="comment-page-line">
			<Form.Label column xs="auto">
				Page/Line:
			</Form.Label>
			<Col>
				<Form.Control
					type="text"
					value={value}
					onChange={onChange}
					pattern={pattern}
					placeholder={isMultiple(comment.Page) ? MULTIPLE_STR : ""}
					disabled={readOnly}
				/>
			</Col>
			<Col xs="auto">
				<Form.Text
					style={{
						display: "flex",
						flexDirection: "column",
						fontSize: "x-small",
						visibility: showOriginal ? "visible" : "hidden",
					}}
				>
					<span>originally</span>
					<span>{original}</span>
				</Form.Text>
			</Col>
		</Form.Group>
	);
}

function CommentClause({
	comment,
	setComment,
	readOnly,
}: {
	comment: Multiple<CommentEditable>;
	setComment: (changes: Partial<Comment>) => void;
	readOnly?: boolean;
}) {
	// Check if original clause is different
	const hasChanged = comment.Clause !== comment.C_Clause;

	return (
		<Form.Group as={Row} controlId="comment-clause">
			<Form.Label column xs="auto">
				Clause:
			</Form.Label>
			<Col xs={7}>
				<Form.Control
					type="text"
					value={
						isMultiple(comment.Clause) ? "" : comment.Clause || ""
					}
					onChange={(e) => setComment({ Clause: e.target.value })}
					placeholder={isMultiple(comment.Clause) ? MULTIPLE_STR : ""}
					disabled={readOnly}
				/>
			</Col>
			<Col xs="auto">
				<Form.Text
					style={{
						display: "flex",
						flexDirection: "column",
						fontSize: "x-small",
						visibility: hasChanged ? "visible" : "hidden",
					}}
				>
					<span>originally</span>
					<span>{comment.C_Clause}</span>
				</Form.Text>
			</Col>
		</Form.Group>
	);
}

export function CommentBasics({
	comment,
	updateComment = () => {},
	readOnly,
}: {
	comment: Multiple<CommentEditable>;
	updateComment?: (changes: Partial<Comment>) => void;
	readOnly?: boolean;
}) {
	return (
		<>
			<Row className="mb-3">
				<Col>
					<Form.Label as="span">Commenter: </Form.Label>
					<span>{renderCommenter(comment)}</span>
				</Col>
			</Row>
			<Row className="mb-3">
				<Col>
					<Form.Label as="span">Category: </Form.Label>
					{renderCategory(comment)}
					<>&nbsp;&nbsp;</>
					{renderMBS(comment)}
				</Col>
			</Row>
			<Row className="mb-3">
				<Col xs={12} xl={6}>
					<CommentPage
						comment={comment}
						setComment={updateComment}
						readOnly={readOnly}
					/>
				</Col>
				<Col xs={12} xl={6}>
					<CommentClause
						comment={comment}
						setComment={updateComment}
						readOnly={readOnly}
					/>
				</Col>
			</Row>
			<Form.Group as={Row} className="mb-3">
				<Form.Label as="span">Comment:</Form.Label>
				<div>{renderTextBlock(comment.Comment)}</div>
			</Form.Group>
			<Form.Group as={Row} className="mb-3">
				<Form.Label as="span">Proposed Change:</Form.Label>
				<div>{renderTextBlock(comment.ProposedChange)}</div>
			</Form.Group>
		</>
	);
}

export function CommentEdit({
	comments,
	readOnly,
}: {
	comments: CommentResolution[];
	readOnly?: boolean;
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
			diff = deepMergeTagMultiple(
				diff || {},
				comment
			) as Multiple<CommentResolution>;
		});
		setSaved(diff);
		setEdited(diff);
		setEditedComments(comments);
	}, [comments, editedComments]);

	const triggerSave = useDebounce(() => {
		/* Find changes */
		const changes: Partial<Comment> = shallowDiff(
			saved!,
			edited!
		) as Partial<Comment>;
		if (Object.keys(changes).length > 0) {
			const ids = new Set<CommentResolution["comment_id"]>();
			/* Unique comments only */
			comments.forEach((c) => ids.add(c.comment_id));
			const updates = [...ids].map((id) => ({ id, changes }));
			dispatch(updateComments(updates));
		}
		setSaved(edited);
	});

	const updateComment = (changes: Partial<CommentEditable>) => {
		if (readOnly) {
			console.warn("Comment update while read-only");
			return;
		}
		// merge in the edits and trigger save
		setEdited((edited) => ({ ...edited!, ...changes }));
		triggerSave();
	};

	if (!edited) return null;

	return (
		<>
			<CommentBasics
				comment={edited}
				updateComment={updateComment}
				readOnly={readOnly}
			/>
			<CommentCategorization
				key={key}
				comment={edited}
				updateComment={updateComment}
				readOnly={readOnly}
			/>
		</>
	);
}

export default CommentEdit;
