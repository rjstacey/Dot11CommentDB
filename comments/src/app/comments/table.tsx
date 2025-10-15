import React from "react";
import { useNavigate } from "react-router";
import { Row, Col } from "react-bootstrap";
import {
	AppTable,
	SplitPanel,
	Panel,
	ShowFilters,
	GlobalFilter,
} from "@common";

import CommentDetail from "./detail";
import { useAppSelector } from "@/store/hooks";
import {
	fields,
	commentsSelectors,
	commentsActions,
	selectCommentsSearch,
} from "@/store/comments";
import { selectCurrentBallotID } from "@/store/ballots";

import {
	tableColumns,
	commentsRowGetter,
	defaultTablesConfig,
} from "./tableColumns";

function CommentsTable() {
	const navigate = useNavigate();
	const search = useAppSelector(selectCommentsSearch);
	const ballotId = useAppSelector(selectCurrentBallotID);

	React.useEffect(() => {
		const pathname = "../" + encodeURIComponent(ballotId || "");
		navigate({ pathname, search }, { replace: true });
	}, [search]);

	return (
		<>
			<Row className="w-100">
				<Col>
					<ShowFilters
						selectors={commentsSelectors}
						actions={commentsActions}
						fields={fields}
					/>
				</Col>
				<Col xs={2} className="d-flex align-items-center">
					<GlobalFilter
						selectors={commentsSelectors}
						actions={commentsActions}
					/>
				</Col>
			</Row>

			<SplitPanel selectors={commentsSelectors} actions={commentsActions}>
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={76}
						estimatedRowHeight={72}
						rowGetter={commentsRowGetter}
						selectors={commentsSelectors}
						actions={commentsActions}
					/>
				</Panel>
				<Panel className="details-panel">
					<CommentDetail />
				</Panel>
			</SplitPanel>
		</>
	);
}

export default CommentsTable;
