import { Row, Col, Button } from "react-bootstrap";
import { SplitTableButtonGroup } from "@common";

import CommentsImport from "./CommentsImport";
import CommentsExport from "./CommentsExport";
import CommentsCopy from "./CommentsCopy";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { AccessLevel } from "@/store/user";
import { selectBallot } from "@/store/ballots";
import {
	selectCommentsBallot_id,
	selectCommentsAccess,
	commentsSelectors,
	commentsActions,
	refreshComments,
} from "@/store/comments";
import { selectIsOnline } from "@/store/offline";

import ProjectBallotSelector from "@/components/ProjectBallotSelector";
import { tableColumns } from "./tableColumns";

function CommentsActions() {
	const dispatch = useAppDispatch();

	const isOnline = useAppSelector(selectIsOnline);

	const access = useAppSelector(selectCommentsAccess);
	const commentsBallot_id = useAppSelector(selectCommentsBallot_id);
	const commentsBallot = useAppSelector((state) =>
		commentsBallot_id ? selectBallot(state, commentsBallot_id) : undefined
	);

	return (
		<Row className="w-100 justify-content-between align-items-center">
			<Col>
				<ProjectBallotSelector />
			</Col>

			<SplitTableButtonGroup
				selectors={commentsSelectors}
				actions={commentsActions}
				columns={tableColumns}
				xs="auto"
			/>
			<Col className="d-flex justify-content-end gap-2">
				{access >= AccessLevel.rw && (
					<>
						<CommentsImport
							ballot={commentsBallot}
							disabled={!isOnline}
						/>
						<CommentsExport
							ballot={commentsBallot}
							disabled={!isOnline}
						/>
					</>
				)}
				<CommentsCopy />
				<Button
					variant="outline-secondary"
					className="bi-arrow-repeat"
					title="Refresh"
					disabled={!isOnline}
					onClick={() => dispatch(refreshComments())}
				/>
			</Col>
		</Row>
	);
}

export default CommentsActions;
