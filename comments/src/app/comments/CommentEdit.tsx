import * as React from "react";
import {
	type Multiple,
	deepMergeTagMultiple,
	shallowDiff,
	useDebounce,
} from "@common";

import { useAppDispatch } from "@/store/hooks";
import {
	updateComments,
	type CommentResolution,
	type Comment,
} from "@/store/comments";

import { CommentBasics } from "./CommentBasics";
import { CommentCategorization } from "./CommentCategorization";

// Comment fields editable by this module
export type CommentEditable = Omit<Comment, "id">;

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
