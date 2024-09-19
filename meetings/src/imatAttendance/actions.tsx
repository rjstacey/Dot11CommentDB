import { useNavigate, useParams, Link } from "react-router-dom";

import { ActionButton, Button } from "dot11-components";

import ImatMeetingInfo from "../components/ImatMeetingInfo";
import ImatBreakoutInfo from "../components/ImatBreakoutInfo";

function ImatAttendanceActions() {
	const navigate = useNavigate();
	const refresh = () => navigate(0);
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
					<ActionButton
						name="refresh"
						title="Refresh"
						onClick={refresh}
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
