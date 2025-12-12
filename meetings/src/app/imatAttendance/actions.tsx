import React from "react";
import { useParams, Link } from "react-router";
import { Button, Spinner, Row, Col } from "react-bootstrap";

import ImatMeetingInfo from "@/components/ImatMeetingInfo";
import ImatBreakoutInfo from "@/components/ImatBreakoutInfo";
import { refresh } from "./loader";
import { useAppSelector } from "@/store/hooks";
import { selectImatMeetingsState } from "@/store/imatMeetings";
import { selectBreakoutsState } from "@/store/imatBreakouts";

export function ImatAttendanceActions() {
	const params = useParams();
	const meetingNumber = Number(params.meetingNumber);
	const breakoutNumber = Number(params.breakoutNumber);
	const { loading: loadingMeetings } = useAppSelector(
		selectImatMeetingsState
	);
	const { loading: loadingBreakouts } = useAppSelector(selectBreakoutsState);

	return (
		<Row className="top-row">
			<Col>
				<ImatMeetingInfo imatMeetingId={meetingNumber} />
			</Col>
			<Col>
				<ImatBreakoutInfo
					imatMeetingId={meetingNumber}
					breakoutId={breakoutNumber}
				/>
			</Col>
			<Col className="d-flex justify-content-end gap-2">
				<Spinner hidden={!loadingMeetings && !loadingBreakouts} />
				<Button
					variant="outline-primary"
					className="bi-arrow-repeat"
					title="Refresh"
					onClick={() => refresh(meetingNumber, breakoutNumber)}
				/>
				<Link to={`../imatBreakouts/${meetingNumber}`}>
					<Button className="bi-x" />
				</Link>
			</Col>
		</Row>
	);
}
