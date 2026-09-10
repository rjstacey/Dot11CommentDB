import { useMemo } from "react";
import { Row, Col } from "react-bootstrap";
import {
	AppTable,
	ShowFilters,
	GlobalFilter,
	TableColumnSelector,
} from "@common";

import {
	fields,
	commentsSelectors,
	commentsActions,
} from "@/store/comments";
import { useCommentsSearch } from "@/hooks/commentsSearch";

import { useTableColumns, tableColumns, quickSelect } from "./tableColumns";

export function CommentsListColumnSelector() {
	return (
		<TableColumnSelector
			columns={tableColumns}
			selectors={commentsSelectors}
			actions={commentsActions}
			quickSelect={quickSelect}
		/>
	)
}

export function CommentsListFilters() {
	return (
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
	);
}

export function CommentsList() {
	const { setSelected } = useCommentsSearch();
	const actions = useMemo(() => ({ ...commentsActions, setSelected }), [setSelected]);

	const { columns, rowGetter, defaultTablesConfig } = useTableColumns({ actions, selectors: commentsSelectors });

	return (
		<AppTable
			defaultTablesConfig={defaultTablesConfig}
			columns={columns}
			headerHeight={76}
			estimatedRowHeight={72}
			rowGetter={rowGetter}
			selectors={commentsSelectors}
			actions={actions}
		/>
	);
}