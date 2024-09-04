import {
	TableColumnSelector,
	TableViewSelector,
	ActionButton,
	ButtonGroup,
} from "dot11-components";

import CommentsImport from "./CommentsImport";
import CommentsExport from "./CommentsExport";
import CommentsCopy from "./CommentsCopy";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { AccessLevel } from "../store/user";
import { selectBallot } from "../store/ballots";
import {
	loadComments,
	clearComments,
	selectCommentsBallot_id,
	selectCommentsAccess,
	commentsSelectors,
	commentsActions,
} from "../store/comments";
import { selectIsOnline } from "../store/offline";

import { tableColumns } from "./table";

function CommentsActions() {
	const dispatch = useAppDispatch();

	const isOnline = useAppSelector(selectIsOnline);

	const access = useAppSelector(selectCommentsAccess);
	const commentsBallot_id = useAppSelector(selectCommentsBallot_id);
	const commentsBallot = useAppSelector((state) =>
		commentsBallot_id ? selectBallot(state, commentsBallot_id) : undefined
	);

	const { isSplit } = useAppSelector(
		commentsSelectors.selectCurrentPanelConfig
	);
	const setIsSplit = (isSplit: boolean) =>
		dispatch(commentsActions.setPanelIsSplit({ isSplit }));

	const refresh = () =>
		dispatch(
			commentsBallot_id
				? loadComments(commentsBallot_id)
				: clearComments()
		);

	return (
		<div style={{ display: "flex", alignItems: "center" }}>
			<ButtonGroup>
				<div>Table view</div>
				<div style={{ display: "flex", alignItems: "center" }}>
					<TableViewSelector
						selectors={commentsSelectors}
						actions={commentsActions}
					/>
					<TableColumnSelector
						selectors={commentsSelectors}
						actions={commentsActions}
						columns={tableColumns}
					/>
					<ActionButton
						name="book-open"
						title="Show detail"
						isActive={isSplit}
						onClick={() => setIsSplit(!isSplit)}
					/>
				</div>
			</ButtonGroup>
			{access >= AccessLevel.rw ? (
				<ButtonGroup>
					<div style={{ textAlign: "center" }}>Edit</div>
					<div
						style={{
							display: "flex",
							alignItems: "center",
						}}
					>
						<CommentsCopy />
						<CommentsImport
							ballot={commentsBallot}
							disabled={!isOnline}
						/>
						<CommentsExport
							ballot={commentsBallot}
							disabled={!isOnline}
						/>
					</div>
				</ButtonGroup>
			) : (
				<CommentsCopy />
			)}
			<ActionButton
				name="refresh"
				title="Refresh"
				disabled={!isOnline}
				onClick={refresh}
			/>
		</div>
	);
}

export default CommentsActions;
