import React from "react";
import { Row, Col, Button } from "react-bootstrap";
import { SplitTableButtonGroup } from "@common";

import CommentsImport from "./CommentsImport";
import CommentsExport from "./CommentsExport";
import CommentsCopy from "./CommentsCopy";

import { useAppSelector } from "@/store/hooks";
import { AccessLevel } from "@/store/user";
import {
	selectCommentsAccess,
	commentsSelectors,
	commentsActions,
} from "@/store/comments";
import { selectIsOnline } from "@/store/offline";

import ProjectBallotSelector from "@/components/ProjectBallotSelector";
import { RoleSelect } from "./RoleSelect";
import { tableColumns } from "./tableColumns";
import { refresh } from "./loader";

function CommentsActions() {
	const isOnline = useAppSelector(selectIsOnline);
	const access = useAppSelector(selectCommentsAccess);

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
						<CommentsImport disabled={!isOnline} />
						<CommentsExport disabled={!isOnline} />
					</>
				)}
				<RoleSelect />
				<CommentsCopy />
				<Button
					variant="outline-secondary"
					className="bi-arrow-repeat"
					title="Refresh"
					disabled={!isOnline}
					onClick={refresh}
				/>
			</Col>
		</Row>
	);
}

export default CommentsActions;
