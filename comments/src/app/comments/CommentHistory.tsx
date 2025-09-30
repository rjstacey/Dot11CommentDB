import { Row, Col } from "react-bootstrap";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectCommentsState } from "@/store/comments";
import {
	loadCommentsHistory,
	selectCommentsHistoryState,
	CommentHistoryEntry,
	CommentHistoryEvent,
} from "@/store/commentsHistory";

import { CommentBasics } from "./CommentBasics";
import {
	CommentAdHoc,
	CommentGroup,
	CommentNotesRow,
} from "./CommentCategorization";

import {
	ResolutionAssigneeRow,
	ResolutionSubmissionRow,
	ResolutionApprovalRow,
} from "./ResolutionAssigneeMotionRow";
import { ResolutionRow } from "./ResolutionRow";
import { EditingNotesRow } from "./EditingNotes";

import styles from "./CommentHistory.module.css";
import React from "react";

const BLANK_STR = "(Blank)";

function renderEntryHeader(leadIn: string, h: CommentHistoryEvent) {
	const action =
		h.Action === "add"
			? "added"
			: h.Action === "update"
			? "updated"
			: h.Action === "delete"
			? "deleted"
			: "error";
	return (
		<div className="header">
			<span>
				{leadIn} <span className="action">{action}</span> by{" "}
				<span className="name">{h.UserName || h.UserID}</span> on{" "}
				{new Date(h.Timestamp).toLocaleString()}
			</span>
		</div>
	);
}

function CommentAdd(entry: CommentHistoryEntry) {
	const { comment } = entry;
	return (
		<div className="entry">
			{renderEntryHeader("Comment", entry)}
			<div className="body">
				<Row>
					<Col>
						<span>CID: {comment.CommentID}</span>
					</Col>
				</Row>
				<CommentBasics
					comment={comment}
					updateComment={() => {}}
					readOnly
				/>
			</div>
		</div>
	);
}

function CommentUpdate(entry: CommentHistoryEntry) {
	const changes = entry.Changes;
	const comment = entry.comment;
	const updatedComment = { ...comment, ...changes };

	const body: JSX.Element[] = [];
	if ("CommentID" in changes)
		body.push(
			<Row key="cid">
				<span>CID: {changes.CommentID || BLANK_STR}</span>
			</Row>
		);

	if ("Page" in changes || "Clause" in changes)
		body.push(
			<Row key="pageclause">
				<Col>
					{"Page" in changes && <span>Page: {changes.Page}</span>}
				</Col>
				<Col>
					{"Clause" in changes && (
						<span>Clause: {changes.Clause}</span>
					)}
				</Col>
			</Row>
		);

	if ("AdHoc" in changes || "CommentGroup" in changes)
		body.push(
			<Row key="adhocGroup">
				<Col xs={12} md={5}>
					{"AdHoc" in changes && (
						<CommentAdHoc comment={updatedComment} readOnly />
					)}
				</Col>
				<Col xs={12} md={7}>
					{"CommentGroup" in changes && (
						<CommentGroup comment={updatedComment} readOnly />
					)}
				</Col>
			</Row>
		);

	if ("AdHocStatus" in changes || "Notes" in changes)
		body.push(
			<CommentNotesRow
				key="commentNotes"
				comment={updatedComment}
				readOnly
			/>
		);

	return (
		<div className="entry">
			{renderEntryHeader(`Comment ${comment.CommentID}`, entry)}
			<div className="body">{body}</div>
		</div>
	);
}

function ResolutionAdd(entry: CommentHistoryEntry) {
	const resolution = entry.resolution!;
	return (
		<div className="entry">
			{renderEntryHeader(
				`Blank resolution ${resolution.ResolutionID}`,
				entry
			)}
			<div className="body" />
		</div>
	);
}

function ResolutionUpdate(entry: CommentHistoryEntry) {
	const changes = entry.Changes;
	const comment = entry.comment;
	const resolution = entry.resolution!;
	const updatedResolution = { ...resolution, ...changes };
	const body: JSX.Element[] = [];

	if ("AssigneeName" in changes)
		body.push(
			<ResolutionAssigneeRow
				key="assignee"
				resolution={updatedResolution}
				readOnly
			/>
		);

	if ("Submission" in changes)
		body.push(
			<ResolutionSubmissionRow
				key="submission"
				resolution={updatedResolution}
				readOnly
			/>
		);

	if ("ReadyForMotion" in changes || "ApprovedByMotion" in changes)
		body.push(
			<ResolutionApprovalRow
				key="approval"
				resolution={updatedResolution}
				readOnly
			/>
		);

	if ("ResnStatus" in changes || "Resolution" in changes)
		body.push(
			<ResolutionRow
				key="resolution"
				resolution={updatedResolution}
				readOnly
			/>
		);

	if (
		"EditStatus" in changes ||
		"EditNotes" in changes ||
		"EditInDraft" in changes
	)
		body.push(
			<EditingNotesRow
				key="editing"
				resolution={updatedResolution}
				readOnly
			/>
		);

	return (
		<div className="entry">
			{renderEntryHeader(
				`Resolution ${comment.CommentID}.${resolution.ResolutionID}`,
				entry
			)}
			<div className="body">{body}</div>
		</div>
	);
}

function ChangeEntry(entry: CommentHistoryEntry) {
	const h = entry;
	const { comment, resolution } = entry;

	if (!h.resolution_id) {
		if (h.Action === "add") {
			return <CommentAdd {...entry} />;
		} else if (h.Action === "update") {
			return <CommentUpdate {...entry} />;
		} else if (h.Action === "delete") {
			return renderEntryHeader("Comment", entry);
		}
	} else {
		if (h.Action === "add") {
			return <ResolutionAdd {...entry} />;
		} else if (h.Action === "update") {
			return <ResolutionUpdate {...entry} />;
		} else if (h.Action === "delete") {
			return renderEntryHeader(
				`Resolution ${comment.CommentID}.${resolution!.ResolutionID}`,
				entry
			);
		}
	}

	return renderEntryHeader("Unexpected action", entry);
}

function CommentHistoryDisplay() {
	const dispatch = useAppDispatch();
	const { selected, entities } = useAppSelector(selectCommentsState);
	const { loading, commentsHistory } = useAppSelector(
		selectCommentsHistoryState
	);

	const id = selected[0];
	const comment_id = entities[id]?.comment_id;

	React.useEffect(() => {
		if (!comment_id) return;
		dispatch(loadCommentsHistory(comment_id));
	}, [comment_id]);

	return (
		<div className={styles.container}>
			{commentsHistory.length > 0 ? (
				commentsHistory.map((props) => (
					<ChangeEntry key={props.id} {...props} />
				))
			) : (
				<div className="details-panel-placeholder">
					{loading ? "Loading..." : "No history"}
				</div>
			)}
		</div>
	);
}

export default CommentHistoryDisplay;
