import { Row, Col } from "react-bootstrap";
import {
	AppTable,
	ShowFilters,
	GlobalFilter,
} from "@common";

import {
	fields,
	commentsSelectors,
	commentsActions,
} from "@/store/comments";
import { panelKeys, type PanelKey, useCommentsLayout } from "@/hooks/commentsLayout";
import { useCommentsSearch } from "@/hooks/commentsSearch";

import {
	tableColumns,
	commentsRowGetter,
	defaultTablesConfig,
} from "./tableColumns";
import { CommentsDetail } from "./details";
import { DraftDetail } from "./draft";
import { Panels, Panel } from "./panels";

import "./comments.css";

export function CommentsMain() {
	const { visiblePanels, widths, setWidths } = useCommentsLayout();
	const { setSelected } = useCommentsSearch();

	function getPanelContent(key: PanelKey) {
		if (key === "list") {
			return (
				<AppTable
					defaultTablesConfig={defaultTablesConfig}
					columns={tableColumns}
					headerHeight={76}
					estimatedRowHeight={72}
					rowGetter={commentsRowGetter}
					selectors={commentsSelectors}
					actions={commentsActions}
					setSelected={setSelected}
				/>
			);
		}
		else if (key === "detail") {
			return <CommentsDetail />;
		}
		else if (key === "draft") {
			return <DraftDetail />;
		}
	}

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

			<Panels widths={widths} setWidths={setWidths} >
				{panelKeys.map((key) => (
					<Panel
						key={key}
						className={key !== "list" ? "details-panel" : undefined}
						isVisible={visiblePanels.includes(key)}
					>
						{getPanelContent(key)}
					</Panel>
				))}
			</Panels>
		</>
	);
}
