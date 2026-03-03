import type { CommentChange } from "@/store/comments";
import type { MultipleComment } from "@/hooks/commentsEdit";

import { CommentBasics } from "./CommentBasics";
import { CommentCategorization } from "./CommentCategorization";

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
