import { Row, Col, Button } from "react-bootstrap";
import { AppTable, SplitPanel, Panel, SplitPanelButton, TableColumnSelector } from "@common";

import {
	affiliationMapSelectors,
	affiliationMapActions,
} from "@/store/affiliationMap";
import { refresh } from "../members/loader";

import { AffiliationMapDetail } from "./detail";
import { tableColumns, defaultTablesConfig } from "./tableColumns";

export function AffiliationMapMain() {
	return (
		<>
			<Row className="w-100 d-flex justify-content-end align-items-center m-3">
				<Col xs="auto" className="d-flex justify-content-end gap-2">
					<TableColumnSelector
						columns={tableColumns}
						selectors={affiliationMapSelectors}
						actions={affiliationMapActions}
					/>
					<SplitPanelButton
						selectors={affiliationMapSelectors}
						actions={affiliationMapActions}
					/>
				</Col>
				<Col xs="auto" className="d-flex justify-content-end gap-2">
					<Button
						variant="outline-primary"
						className="bi-arrow-repeat"
						title="Refresh"
						onClick={refresh}
					/>
				</Col>
			</Row>
			<SplitPanel
				selectors={affiliationMapSelectors}
				actions={affiliationMapActions}
			>
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={32}
						estimatedRowHeight={32}
						measureRowHeight
						selectors={affiliationMapSelectors}
						actions={affiliationMapActions}
					/>
				</Panel>
				<Panel className="details-panel">
					<AffiliationMapDetail />
				</Panel>
			</SplitPanel>
		</>
	);
}
