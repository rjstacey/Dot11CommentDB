import { Row, Col, Button } from "react-bootstrap";
import { AppTable, SplitPanel, Panel, SplitTableButtonGroup } from "@common";

import { groupsSelectors, groupsActions } from "@/store/groups";

import { tableColumns, defaultTablesConfig } from "./tableColumns";
import GroupsDetail from "./detail";
import { refresh } from "./loader";

function Groups() {
	return (
		<>
			<Row className="w-100 d-flex justify-content-end align-items-center m-3">
				<SplitTableButtonGroup
					selectors={groupsSelectors}
					actions={groupsActions}
					columns={tableColumns}
					className="d-flex justify-content-end gap-2"
				/>
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

export default Groups;
