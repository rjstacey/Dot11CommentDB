import { useParams, Link } from "react-router";
import { Button } from "react-bootstrap";

import ImatMeetingInfo from "@/components/ImatMeetingInfo";
import ImatBreakoutInfo from "@/components/ImatBreakoutInfo";
import { refresh } from "./route";

function ImatAttendanceActions() {
	const params = useParams();
	const meetingNumber = Number(params.meetingNumber);
	const breakoutNumber = Number(params.breakoutNumber);

	return (
		<>
			<div className="top-row">
				<ImatMeetingInfo imatMeetingId={meetingNumber} />
				<ImatBreakoutInfo
					imatMeetingId={meetingNumber}
					breakoutId={breakoutNumber}
				/>
				<div>
					<Button
						variant="outline-primary"
						className="bi-arrow-repeat"
						title="Refresh"
						onClick={() => refresh(meetingNumber, breakoutNumber)}
					/>
					<Link to={`../imatBreakouts/${meetingNumber}`}>
						<Button>
							<i className="bi-x" />
						</Button>
					</Link>
				</div>
			</div>
		</>
	);
}

export default ImatAttendanceActions;
