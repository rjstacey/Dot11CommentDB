import { Row, Col, Button } from "react-bootstrap";
import { AppTable, SplitPanel, Panel, SplitTableButtonGroup } from "@common";

import {
	membershipOverTimeSelectors,
	membershipOverTimeActions,
} from "@/store/membershipOverTime";
import { refresh } from "./loader";

import { MembershipOverTimeDetail } from "./detail";
import { tableColumns, defaultTablesConfig } from "./tableColumns";

export function MembershipOverTimeMain() {
	return (
		<>
			<Row className="w-100 d-flex justify-content-end align-items-center m-3">
				<SplitTableButtonGroup
					xs="auto"
					selectors={membershipOverTimeSelectors}
					actions={membershipOverTimeActions}
					columns={tableColumns}
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
			<SplitPanel
				selectors={membershipOverTimeSelectors}
				actions={membershipOverTimeActions}
			>
				<Panel>
					<AppTable
						defaultTablesConfig={defaultTablesConfig}
						columns={tableColumns}
						headerHeight={32}
						estimatedRowHeight={32}
						measureRowHeight
						selectors={membershipOverTimeSelectors}
						actions={membershipOverTimeActions}
					/>
				</Panel>
				<Panel className="details-panel">
					<MembershipOverTimeDetail />
				</Panel>
			</SplitPanel>
		</>
	);
}
