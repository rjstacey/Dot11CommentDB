import { Row, Col, Button } from "react-bootstrap";
import { AppTable, SplitPanel, Panel, TableColumnSelector, SplitPanelButton } from "@common";

import { groupsSelectors, groupsActions } from "@/store/groups";

import { tableColumns, defaultTablesConfig } from "./tableColumns";
import { GroupsDetail } from "./detail";
import { refresh } from "./loader";

export function GroupsMain() {
	return (
		<>
			<Row className="w-100 d-flex justify-content-end align-items-center m-3">
				<Col xs="auto" className="d-flex justify-content-end gap-2">
					<TableColumnSelector
						columns={tableColumns}
						selectors={groupsSelectors}
						actions={groupsActions}
					/>
					<SplitPanelButton
						selectors={groupsSelectors}
						actions={groupsActions}
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
			<SplitPanel selectors={groupsSelectors} actions={groupsActions}>
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={32}
						estimatedRowHeight={32}
						measureRowHeight
						selectors={groupsSelectors}
						actions={groupsActions}
					/>
				</Panel>
				<Panel className="details-panel">
					<GroupsDetail />
				</Panel>
			</SplitPanel>
		</>
	);
}
