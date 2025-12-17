import type { Comment, CommentChange } from "@/store/comments";
import type { MultipleComment } from "@/hooks/commentsEdit";

import { CommentBasics } from "./CommentBasics";
import { CommentCategorization } from "./CommentCategorization";

// Comment fields editable by this module
export type CommentEditable = Omit<Comment, "id">;

export function CommentEdit({
	edited,
	onChange,
	readOnly,
}: {
	edited: MultipleComment;
	onChange: (changes: CommentChange) => void;
	readOnly?: boolean;
}) {
	return (
		<>
			<CommentBasics
				comment={edited}
				updateComment={onChange}
				readOnly={readOnly}
			/>
			<CommentCategorization
				comment={edited}
				updateComment={onChange}
				readOnly={readOnly}
			/>
		</>
	);
}

export default CommentEdit;
