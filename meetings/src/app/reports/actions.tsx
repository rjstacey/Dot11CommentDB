import { useParams } from "react-router";
import { Row, Col, Button, Spinner } from "react-bootstrap";

import { useAppSelector } from "@/store/hooks";
import { selectMeetingAttendanceState } from "@/store/imatMeetingAttendance";

import SessionSelectorNav from "@/components/SessionSelectorNav";
import { copyChartToClipboard, downloadChart } from "@/components/copyChart";
import { refresh } from "./loader";

export function ReportsActions() {
	const { chart } = useParams();
	const { loading } = useAppSelector(selectMeetingAttendanceState);

	return (
		<Row className="w-100 m-3">
			<Col xs="auto">
				<SessionSelectorNav />
			</Col>

			<Col className="d-flex justify-content-end align-items-center gap-2">
				<Spinner hidden={!loading} />
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
