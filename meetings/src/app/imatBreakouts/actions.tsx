import { useNavigate, useParams } from "react-router";
import { Row, Col, Button } from "react-bootstrap";
import { SplitTableButtonGroup } from "@common";

import {
	imatBreakoutsSelectors,
	imatBreakoutsActions,
} from "@/store/imatBreakouts";

import ImatMeetingSelector from "@/components/ImatMeetingSelector";
import ImatMeetingInfo from "@/components/ImatMeetingInfo";

import { tableColumns } from "./tableColumns";
import { refresh } from "./route";

function ImatBreakoutsActions() {
	const navigate = useNavigate();

	const imatMeetingId = Number(useParams().meetingNumber);
	const setImatMeetingId = (imatMeetingId: number | null) => {
		navigate(imatMeetingId ? imatMeetingId.toString() : "");
	};

	return (
		<Row className="w-100 m-3">
			<Col xs="auto">
				<ImatMeetingSelector
					value={imatMeetingId}
					onChange={setImatMeetingId}
				/>
			</Col>

			<Col>
				<ImatMeetingInfo imatMeetingId={imatMeetingId} />
			</Col>

			<SplitTableButtonGroup
				selectors={imatBreakoutsSelectors}
				actions={imatBreakoutsActions}
				columns={tableColumns}
				xs="auto"
			/>
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
