import { Row, Col, Button } from "react-bootstrap";
import { TableColumnSelector, SplitPanelButton } from "@common";

import {
	webexMeetingsSelectors,
	webexMeetingsActions,
} from "@/store/webexMeetings";

import SessionSelectorNav from "@/components/SessionSelectorNav";
import CopyWebexMeetingListButton from "./CopyWebexMeetingList";

import { tableColumns } from "./tableColumns";
import { refresh } from "./loader";

function WebexMeetingsActions() {
	return (
		<Row className="w-100 justify-content-between m-3">
			<Col xs="auto">
				<SessionSelectorNav allowShowDateRange />
			</Col>

			<Col
				xs="auto"
				className="d-flex justify-content-end align-items-center gap-2"
			>
				<TableColumnSelector
					columns={tableColumns}
					selectors={webexMeetingsSelectors}
					actions={webexMeetingsActions}
				/>
				<SplitPanelButton selectors={webexMeetingsSelectors} actions={webexMeetingsActions} />
				<CopyWebexMeetingListButton />
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

export default WebexMeetingsActions;
