import * as React from "react";
import { Row, Col, Form } from "react-bootstrap";
import {
	shallowDiff,
	deepMergeTagMultiple,
	useDebounce,
	type Multiple,
	isMultiple,
	MULTIPLE,
} from "@common";

import CommentEdit from "./CommentEdit";
import ResolutionEdit from "./ResolutionEdit";
import { EditingNotesRowCollapsable } from "./EditingNotes";

import { useAppDispatch } from "@/store/hooks";
import {
	addResolutions,
	updateResolutions,
	CommentResolution,
	CommentResolutionChange,
	Comment,
	Resolution,
	ResolutionUpdate,
	ResolutionCreate,
	getCommentStatus,
} from "@/store/comments";
import { AccessLevel } from "@/store/user";

export type MultipleCommentResolution = Multiple<CommentResolution>;
export type MultipleComment = Multiple<Comment>;
export type MultipleResolution = Multiple<Resolution>;

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

function CidAndStatusRow({ comments }: { comments: CommentResolution[] }) {
	const cids = comments.map((c) => c.CID /*getCID(c)*/);
	const cidsStr = cids.join(", ");
	const cidsLabel = cids.length > 1 ? "CIDs:" : "CID:";
	return (
		<Row className="align-items-center mb-2">
			<Form.Label as="span" column xs="auto">
				{cidsLabel}
			</Form.Label>
			<Col>
				<div>{cidsStr}</div>
			</Col>
			<Col xs="auto">{renderCommentsStatus(comments)}</Col>
		</Row>
	);
}

export function CommentResolutionEdit({
	comments,
	commentsAccess,
	resolutionsAccess,
	readOnly,
}: {
	comments: CommentResolution[];
	commentsAccess: number;
	resolutionsAccess: number;
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
			<CidAndStatusRow comments={comments} />
			<CommentEdit
				comments={comments}
				readOnly={readOnly || commentsAccess < AccessLevel.rw}
			/>
			<ResolutionEdit
				key={"1" + key}
				resolution={edited}
				updateResolution={updateResolution}
				readOnly={readOnly || resolutionsAccess < AccessLevel.rw}
				commentsAccess={commentsAccess}
			/>
			<EditingNotesRowCollapsable
				key={"2" + key}
				resolution={edited}
				updateResolution={updateResolution}
				readOnly={readOnly || commentsAccess < AccessLevel.rw}
			/>
		</>
	);
}
