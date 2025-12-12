import { Row, Col, Button } from "react-bootstrap";
import { SplitTableButtonGroup } from "@common";

import {
	imatMeetingsSelectors,
	imatMeetingsActions,
} from "@/store/imatMeetings";

import { tableColumns } from "./tableColumns";
import { refresh } from "./route";

export function ImatMeetingsActions() {
	return (
		<Row className="w-100 m-3">
			<SplitTableButtonGroup
				selectors={imatMeetingsSelectors}
				actions={imatMeetingsActions}
				columns={tableColumns}
			/>
			<Col className="d-flex justify-content-end align-items-center gap-2">
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
