import {
	ActionButtonModal,
	Row, Col, FieldLeft
} from 'dot11-components';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectCommentsState } from '../store/comments';
import { loadCommentsHistory, selectCommentsHistoryState, CommentHistoryEntry, CommentHistoryEvent } from '../store/commentsHistory';

import { CommentBasics, CommentAdHoc, CommentGroup, CommentNotes } from "./CommentEdit";
import { ResolutionAssignee, ResolutionSubmission, ResolutionApproval, ResolutionAndStatus } from "./ResolutionEdit";
import { EditingEdit } from "./EditingEdit";

import styles from "./CommentHistory.module.css";

const BLANK_STR = '(Blank)';

function renderEntryHeader(leadIn: string, h: CommentHistoryEvent) {
	let action =
		h.Action === "add"? "added":
		h.Action === "update"? "updated":
		h.Action === "delete"? "deleted":
		"error";
	return (
		<div className="header">
			<span>{leadIn} <span className='action'>{action}</span> by <span className='name'>{h.UserName || h.UserID}</span> on {(new Date(h.Timestamp)).toLocaleString()}</span>
		</div>
	)
}

function CommentAdd(entry: CommentHistoryEntry) {
	const {comment} = entry;
	return (
		<div className="entry">
			{renderEntryHeader("Comment", entry)}
			<div className="body">
				<CommentBasics
					cids={[comment.CommentID.toString()]}
					comment={comment}
					updateComment={() => {}}
					readOnly
				/>
			</div>
		</div>
	)
}

function CommentUpdate(entry: CommentHistoryEntry) {
	const changes = entry.Changes;
	const comment = entry.comment;
	const updatedComment = {...comment, ...changes};

	let body: JSX.Element[] = [];
	if ('CommentID' in changes)
		body.push(
			<Row key='cid'>
				<FieldLeft label='CID:'>{changes.CommentID || BLANK_STR}</FieldLeft>
			</Row>
		);

	if ('Page' in changes || 'Clause' in changes)
		body.push(
			<Row key='pageclause'>
				<Col>
					{('Page' in changes) &&	<FieldLeft label='Page:'>{changes.Page}</FieldLeft>}
				</Col>
				<Col>
					{('Clause' in changes) && <FieldLeft label='Page:'>{changes.Clause}</FieldLeft>}
				</Col>
			</Row>
		);

	if ('AdHoc' in changes || 'CommentGroup' in changes)
		body.push(
			<Row key='pageclause'>
				<Col>
					{'AdHoc' in changes && <CommentAdHoc comment={updatedComment} readOnly />}
				</Col>
				<Col>
					{'CommentGroup' in changes && <CommentGroup comment={updatedComment} readOnly />}
				</Col>
			</Row>
		)

	if ('Notes' in changes)
		body.push(
			<Row key='notes'>
				<CommentNotes comment={updatedComment} showNotes readOnly />
			</Row>
		);
	
	return (
		<div className="entry">
			{renderEntryHeader(`Comment ${comment.CommentID}`, entry)}
			<div className="body">
				{body}
			</div>
		</div>
	)
}

function ResolutionAdd(entry: CommentHistoryEntry) {
	const resolution = entry.resolution!;
	return (
		<div className="entry">
			{renderEntryHeader(`Blank resolution ${resolution.ResolutionID}`, entry)}
			<div className="body" />
		</div>
	)
}


function ResolutionUpdate(entry: CommentHistoryEntry) {
	const changes = entry.Changes;
	const comment = entry.comment;
	const resolution = entry.resolution!;
	const updatedResolution = {...resolution, ...changes};
	let body: JSX.Element[] = [];

	if ('AssigneeName' in changes)
		body.push(
			<Row key='assignee'>
				<ResolutionAssignee
					resolution={updatedResolution}
					readOnly
				/>
			</Row>
		);

	if ('Submission' in changes)
		body.push(
			<Row key='submission'>
				<ResolutionSubmission
					resolution={updatedResolution}
					readOnly
				/>
			</Row>
		);

	if ('ReadyForMotion' in changes || 'ApprovedByMotion' in changes)
		body.push(
			<Row key='approval'>
				<ResolutionApproval
					resolution={updatedResolution}
					readOnly
				/>
			</Row>
		);

	if ('ResnStatus' in changes || 'Resolution' in changes)
		body.push(
			<Row key='resolution'>
				<ResolutionAndStatus
					resolution={updatedResolution}
					readOnly
				/>
			</Row>
		);

	if ('EditStatus' in changes || 'EditNotes' in changes || 'EditInDraft' in changes)
		body.push(
			<Row key='editing'>
				<EditingEdit
					resolution={updatedResolution}
					showEditing
					readOnly
				/>
			</Row>
		);

	return (
		<div className="entry">
			{renderEntryHeader(`Resolution ${comment.CommentID}.${resolution.ResolutionID}`, entry)}
			<div className="body">
				{body}
			</div>
		</div>
	)
}

function ChangeEntry(entry: CommentHistoryEntry) {
	const h = entry;
	const {comment, resolution} = entry;

	if (!h.resolution_id) {
		if (h.Action === "add") {
			return (
				<CommentAdd {...entry} />
			);
		}
		else if (h.Action === "update") {
			return (
				<CommentUpdate {...entry} />
			);
		}
		else if (h.Action === "delete") {
			return renderEntryHeader("Comment", entry);
		}
	}
	else {
		if (h.Action === "add") {
			return (
				<ResolutionAdd {...entry} />
			)
		}
		else if (h.Action === "update") {
			return (
				<ResolutionUpdate {...entry} />
			);
		}
		else if (h.Action === "delete") {
			return renderEntryHeader(`Resolution ${comment.CommentID}.${resolution!.ResolutionID}`, entry)
		}
	}

	return renderEntryHeader("Unexpected action", entry);
}

function CommentHistoryDisplay() {

	const dispatch = useAppDispatch();
	const {selected, entities} = useAppSelector(selectCommentsState);
	const {loading, commentsHistory} = useAppSelector(selectCommentsHistoryState);

	const onOpen = () => {
		if (selected.length) {
			const id = selected[0];
			const c = entities[id];
			if (c)
				dispatch(loadCommentsHistory(c.comment_id));
		}
	}

	console.log(commentsHistory)

	return (
		<ActionButtonModal
			name='history'
			title='Comment history'
			disabled={selected.length === 0}
			onRequestOpen={onOpen}
		>
			<div className={styles.container}>
				{commentsHistory.length > 0?
					commentsHistory.map(props => <ChangeEntry key={props.id} {...props} />):
					<div className="placeholder">{loading? "Loading...": "No history"}</div>
				}
			</div>
		</ActionButtonModal>
	)
}

export default CommentHistoryDisplay;
