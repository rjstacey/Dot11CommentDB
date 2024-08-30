import { useNavigate, useParams } from "react-router-dom";

import { ActionButton } from "dot11-components";

import ImatMeetingInfo from "../components/ImatMeetingInfo";
import ImatBreakoutInfo from "../components/ImatBreakoutInfo";

function ImatAttendanceActions() {
	const navigate = useNavigate();
	const params = useParams();
	const meetingNumber = Number(params.meetingNumber);
	const breakoutNumber = Number(params.breakoutNumber);

	const close = () => navigate("..");
	const refresh = () => navigate(".", { replace: true });

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
					<ActionButton name="close" title="Close" onClick={close} />
				</div>
			</div>
		</>
	);
}

export default ImatAttendanceActions;
