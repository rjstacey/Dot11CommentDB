import * as React from "react";

import {
	Row,
	Col,
	List,
	Field,
	FieldLeft,
	Input,
	Icon,
	IconCollapse,
	isMultiple,
	type Multiple,
	deepMergeTagMultiple,
	shallowDiff,
	useDebounce,
} from "dot11-components";

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
		vote = <Icon type="vote-yes" />;
	} else if (comment.Vote === "Disapprove") {
		vote = <Icon type="vote-no" />;
	}
	return (
		<span>
			{commenter}
			<>&nbsp;</>
			{vote}
		</span>
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
	<Field label="Ad-hoc:">
		<AdHocSelector
			style={{ flexBasis: 150 }}
			value={
				isMultiple(comment.AdHoc) || isMultiple(comment.AdHocGroupId)
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
				isMultiple(comment.AdHoc) || isMultiple(comment.AdHocGroupId)
					? MULTIPLE_STR
					: BLANK_STR
			}
			readOnly={readOnly}
		/>
	</Field>
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
	<Field label="Comment group:">
		<CommentGroupSelector
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
	</Field>
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
	const toggleShowNotes = () =>
		dispatch(setUiProperties({ showNotes: !showNotes }));

	return (
		<Col className={styles.notesField}>
			<div
				style={{
					display: "flex",
					flex: 1,
					justifyContent: "space-between",
				}}
			>
				<span className="label">Notes:</span>
				{!forceShowNotes && (
					<IconCollapse
						isCollapsed={!showNotes}
						onClick={toggleShowNotes}
					/>
				)}
			</div>
			{(showNotes || forceShowNotes) && (
				<Editor
					value={isMultiple(comment.Notes) ? "" : comment.Notes}
					onChange={(value) => updateComment({ Notes: value })}
					placeholder={
						isMultiple(comment.Notes) ? MULTIPLE_STR : BLANK_STR
					}
					readOnly={readOnly}
				/>
			)}
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
		<Row>
			<Col>
				<CommentAdHoc
					comment={comment}
					updateComment={updateComment}
					readOnly={readOnly}
				/>
			</Col>
			<Col>
				<CommentGroup
					comment={comment}
					updateComment={updateComment}
					readOnly={readOnly}
				/>
			</Col>
		</Row>
		<Row>
			<CommentNotes
				comment={comment}
				updateComment={updateComment}
				readOnly={readOnly}
			/>
		</Row>
	</>
);

function CommentPage({
	id,
	comment,
	setComment,
	readOnly,
}: {
	id?: string;
	comment: Multiple<CommentEditable>;
	setComment: (changes: Partial<Comment>) => void;
	readOnly?: boolean;
}) {
	const [value, setValue] = React.useState(
		isMultiple(comment.Page)
			? ""
			: comment.Page
				? comment.Page.toFixed(2)
				: ""
	);
	const pattern = "^\\d*\\.?\\d{0,2}$";

	const onChange: React.ChangeEventHandler<HTMLInputElement> = function (e) {
		const { value } = e.target;
		setValue(value);
		if (value.search(pattern) !== -1) {
			const page = parseFloat(value);
			setComment({ Page: page || null });
		}
	};

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
		<>
			<Input
				id={id}
				type="text"
				size={10}
				value={value}
				onChange={onChange}
				pattern={pattern}
				placeholder={isMultiple(comment.Page) ? MULTIPLE_STR : ""}
				disabled={readOnly}
			/>
			{showOriginal && (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						fontSize: "x-small",
						marginLeft: 5,
					}}
				>
					<span>originally</span>
					<span>{original}</span>
				</div>
			)}
		</>
	);
}

function CommentClause({
	id,
	comment,
	setComment,
	readOnly,
}: {
	id?: string;
	comment: Multiple<CommentEditable>;
	setComment: (changes: Partial<Comment>) => void;
	readOnly?: boolean;
}) {
	// Check if original clause is different
	const hasChanged = comment.Clause !== comment.C_Clause;

	return (
		<>
			<Input
				id={id}
				type="text"
				size={10}
				value={isMultiple(comment.Clause) ? "" : comment.Clause || ""}
				onChange={(e) => setComment({ Clause: e.target.value })}
				placeholder={isMultiple(comment.Clause) ? MULTIPLE_STR : ""}
				disabled={readOnly}
			/>
			{hasChanged && (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						fontSize: "x-small",
						marginLeft: 5,
					}}
				>
					<span>originally</span>
					<span>{comment.C_Clause}</span>
				</div>
			)}
		</>
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
			<Row>
				<FieldLeft label="Commenter:">
					{renderCommenter(comment)}
				</FieldLeft>
			</Row>
			<Row>
				<FieldLeft label="Category:" style={{ alignItems: "baseline" }}>
					{renderCategory(comment)}
					<>&nbsp;&nbsp;</>
					{renderMBS(comment)}
				</FieldLeft>
			</Row>
			<Row>
				<Col>
					<FieldLeft id="page-line" label="Page/Line:">
						<CommentPage
							//key={comment.id}
							comment={comment}
							setComment={updateComment}
							readOnly={readOnly}
						/>
					</FieldLeft>
				</Col>
				<Col>
					<FieldLeft id="clause" label="Clause:">
						<CommentClause
							comment={comment}
							setComment={updateComment}
							readOnly={readOnly}
						/>
					</FieldLeft>
				</Col>
			</Row>
			<Row>
				<List label="Comment:">{renderTextBlock(comment.Comment)}</List>
			</Row>
			<Row>
				<List label="Proposed Change:">
					{renderTextBlock(comment.ProposedChange)}
				</List>
			</Row>
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
