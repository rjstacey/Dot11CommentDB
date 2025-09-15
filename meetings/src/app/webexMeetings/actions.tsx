import { Row, Col, Button } from "react-bootstrap";
import { SplitTableButtonGroup } from "@common";

import {
	webexMeetingsSelectors,
	webexMeetingsActions,
} from "@/store/webexMeetings";

import SessionSelectorNav from "@/components/SessionSelectorNav";
import CopyWebexMeetingListButton from "./CopyWebexMeetingList";

import { tableColumns } from "./tableColumns";
import { refresh } from "./route";

function WebexMeetingsActions() {
	return (
		<Row className="w-100 m-3">
			<Col>
				<SessionSelectorNav allowShowDateRange />
			</Col>

			<SplitTableButtonGroup
				selectors={webexMeetingsSelectors}
				actions={webexMeetingsActions}
				columns={tableColumns}
			/>
			<Col className="d-flex justify-content-end align-items-center gap-2">
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
