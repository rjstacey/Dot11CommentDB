import * as React from "react";
import { Row, Col, Form } from "react-bootstrap";
import { isMultiple, type Multiple, MULTIPLE } from "@common";

import { categoryMap, type Comment } from "@/store/comments";
import { MULTIPLE_STR } from "@/components/constants";
import type { CommentEditable } from "./CommentEdit";

import styles from "./comments.module.css";

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

	const onChange = function (e: React.ChangeEvent<HTMLInputElement>) {
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
			<Form.Label column>Page/Line:</Form.Label>
			<Col xs="auto">
				<Form.Control
					type="text"
					htmlSize={6}
					value={value}
					onChange={onChange}
					pattern={pattern}
					placeholder={isMultiple(comment.Page) ? MULTIPLE_STR : ""}
					readOnly={readOnly}
					className={readOnly ? "pe-none" : undefined}
					tabIndex={readOnly ? -1 : undefined}
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
			<Form.Label column>Clause:</Form.Label>
			<Col xs="auto">
				<Form.Control
					type="text"
					htmlSize={15}
					value={
						isMultiple(comment.Clause) ? "" : comment.Clause || ""
					}
					onChange={(e) => setComment({ Clause: e.target.value })}
					placeholder={isMultiple(comment.Clause) ? MULTIPLE_STR : ""}
					readOnly={readOnly}
					className={readOnly ? "pe-none" : undefined}
					tabIndex={readOnly ? -1 : undefined}
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
				<Col xs={12} xl={5}>
					<CommentPage
						comment={comment}
						setComment={updateComment}
						readOnly={readOnly}
					/>
				</Col>
				<Col xs={12} xl={7}>
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
