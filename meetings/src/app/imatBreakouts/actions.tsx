import { useNavigate, useParams } from "react-router";
import { Row, Col, Button } from "react-bootstrap";
import { SplitTableButtonGroup } from "@common";

import {
	imatBreakoutsSelectors,
	imatBreakoutsActions,
} from "@/store/imatBreakouts";

import ImatMeetingSelector from "@/components/ImatMeetingSelector";

import { tableColumns } from "./tableColumns";
import { refresh } from "./route";

function ImatBreakoutsActions() {
	const navigate = useNavigate();

	const imatBreakoutMeetingId = Number(useParams().meetingNumber);
	const setImatBreakoutMeetingId = (imatMeetingId: number | null) => {
		navigate(imatMeetingId ? imatMeetingId.toString() : "");
	};

	return (
		<Row className="w-100 justify-content-between m-3">
			<Col xs="auto">
				<ImatMeetingSelector
					value={imatBreakoutMeetingId}
					onChange={setImatBreakoutMeetingId}
				/>
			</Col>

			{imatBreakoutMeetingId ? (
				<SplitTableButtonGroup
					selectors={imatBreakoutsSelectors}
					actions={imatBreakoutsActions}
					columns={tableColumns}
				/>
			) : null}

			<Col
				xs="auto"
				className="d-flex justify-content-end align-items-center gap-2"
			>
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

export default ImatBreakoutsActions;
