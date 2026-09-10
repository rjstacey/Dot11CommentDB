import { Row, Col, Button } from "react-bootstrap";
import { SplitPanelButton, TableColumnSelector } from "@common";

import {
	imatMeetingsSelectors,
	imatMeetingsActions,
} from "@/store/imatMeetings";

import { tableColumns, quickSelect } from "./tableColumns";
import { refresh } from "./route";

export function ImatMeetingsActions() {
	return (
		<Row className="w-100 justify-content-end m-3">
			<Col
				xs="auto"
				className="d-flex justify-content-end align-items-center gap-2"
			>
				<TableColumnSelector
					columns={tableColumns}
					quickSelect={quickSelect}
					selectors={imatMeetingsSelectors}
					actions={imatMeetingsActions}
				/>
				<SplitPanelButton selectors={imatMeetingsSelectors} actions={imatMeetingsActions} />
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
