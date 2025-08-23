import { Row, Col, Button } from "react-bootstrap";
import { displayDateRange } from "dot11-components";

import { useAppSelector } from "@/store/hooks";
import { selectRecentSessions } from "@/store/sessions";

import { BulkStatusUpdate } from "./BulkStatusUpdate";
import { SessionParticipationTableActions } from "../table";
import { refresh } from "../loader";

function SessionSummary() {
	const sessions = useAppSelector(selectRecentSessions);

	return sessions.map((session) => (
		<Col
			key={session.id}
			className="d-flex flex-column"
			style={{
				maxWidth: 250,
			}}
		>
			<div className="text-nowrap">
				{session.number}{" "}
				{session.type === "p" ? "Plenary: " : "Interim: "}{" "}
				{displayDateRange(session.startDate, session.endDate)}
			</div>
			<div className="text-truncate">{session.name}</div>
			<div className="d-flex">{`(${session.attendees} attendees)`}</div>
		</Col>
	));
}

export function SessionParticipationActions() {
	return (
		<Row className="w-100 align-items-center gap-2">
			<SessionSummary />
			<Col className="d-flex align-items-center justify-content-end gap-2">
				<BulkStatusUpdate isSession={true} />
				<SessionParticipationTableActions />
				<Button
					className="bi-arrow-repeat"
					variant="outline-primary"
					name="refresh"
					title="Refresh"
					onClick={refresh}
				/>
			</Col>
		</Row>
	);
}
