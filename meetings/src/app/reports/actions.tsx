import { useNavigate, useParams } from "react-router";

import { Row, Col, Button, Spinner } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import { selectMeetingAttendanceState } from "@/store/imatMeetingAttendance";

import SessionSelectorNav from "@/components/SessionSelectorNav";
import { copyChartToClipboard, downloadChart } from "@/components/copyChart";

function ReportsActions() {
	const navigate = useNavigate();
	const { chart } = useParams();
	const { loading } = useAppSelector(selectMeetingAttendanceState);

	const refresh = () => navigate(0);

	return (
		<Row className="w-100 m-3">
			<Col xs="auto">
				<SessionSelectorNav />
			</Col>

			<Col>{loading && <Spinner size="sm" />}</Col>

			<Col className="d-flex justify-content-end align-items-center gap-2">
				<Button
					variant="outline-primary"
					className="bi-copy"
					title="Copy chart to clipboard"
					onClick={() => copyChartToClipboard()}
					disabled={!chart}
				/>
				<Button
					variant="outline-primary"
					className="bi-cloud-download"
					name="export"
					title="Export chart"
					//disabled={!showChart}
					onClick={downloadChart}
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

export default ReportsActions;
