import { useParams } from "react-router";
import { Row, Col, Button } from "react-bootstrap";
import { useAppSelector } from "@/store/hooks";
import { refresh } from "../comments/loader";
import { selectIsOnline } from "@/store/offline";
import ProjectBallotSelector from "@/components/ProjectBallotSelector";
import { useReportData } from "./reportData";
import { renderTableToClipboard } from "./clipboard";

export function ReportsActions() {
	const isOnline = useAppSelector(selectIsOnline);
	const { report } = useParams();
	const data = useReportData(report);

	return (
		<Row className="w-100 justify-content-between align-items-center">
			<Col>
				<ProjectBallotSelector />
			</Col>
			<Col xs="auto" className="d-flex justify-content-end gap-2">
				<Button
					variant="outline-secondary"
					className="bi-copy"
					onClick={() => renderTableToClipboard(data)}
				/>
				<Button
					variant="outline-secondary"
					className="bi-arrow-repeat"
					title="Refresh"
					onClick={refresh}
					disabled={!isOnline}
				/>
			</Col>
		</Row>
	);
}
