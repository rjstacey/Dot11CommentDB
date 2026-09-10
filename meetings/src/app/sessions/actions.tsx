import { Row, Col, Button } from "react-bootstrap";
import { TableColumnSelector, SplitPanelButton } from "@common";
import { sessionsSelectors, sessionsActions } from "@/store/sessions";

import { tableColumns, quickSelect } from "./tableColumns";
import { refresh } from "./loader";

export function SessionsActions() {
	return (
		<Row className="w-100 m-3 justify-content-end">
			<Col
				xs="auto"
				className="d-flex justify-content-end align-items-center gap-2"
			>
				<TableColumnSelector
					columns={tableColumns}
					quickSelect={quickSelect}
					selectors={sessionsSelectors}
					actions={sessionsActions}
				/>
				<SplitPanelButton
					selectors={sessionsSelectors}
					actions={sessionsActions}
				/>
				<Button
					variant="outline-primary"
					className="bi-arrow-repeat"
					title="Refresh"
					onClick={refresh}
				/>
			</Col>
		</Row>
	);
}
