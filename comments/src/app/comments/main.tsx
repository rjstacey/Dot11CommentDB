import React from "react";
import { useNavigation, useSearchParams } from "react-router";
import { Row, Col } from "react-bootstrap";
import {
	AppTable,
	SplitPanel,
	Panel,
	ShowFilters,
	GlobalFilter,
} from "@common";

import { useAppSelector } from "@/store/hooks";
import {
	fields,
	commentsSelectors,
	commentsActions,
	selectCommentsSearch,
} from "@/store/comments";

import {
	tableColumns,
	commentsRowGetter,
	defaultTablesConfig,
} from "./tableColumns";
import { CommentsDetail } from "./details";

export function CommentsMain() {
	const [search, setSearch] = useSearchParams();
	const navigation = useNavigation();
	const isNavigating = Boolean(navigation.location);
	const commentsSearch = useAppSelector(selectCommentsSearch);

	React.useEffect(() => {
		if (isNavigating || search.toString() === commentsSearch.toString())
			return;
		setSearch(commentsSearch, { replace: true });
	}, [search, commentsSearch, isNavigating]);

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
					<CommentsDetail />
				</Panel>
			</SplitPanel>
		</>
	);
}
